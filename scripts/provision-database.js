// Script to provision a database for a specific environment
// Usage: NODE_ENV=production node scripts/provision-database.js

const { Pool } = require('pg');
const { URL } = require('url');
require('dotenv').config();

// Get the environment and database configuration
const environment = process.env.NODE_ENV || 'development';
const environments = {
  development: 'sapience_dev',
  test: 'sapience_test',
  production: 'sapience_prod'
};

const targetDatabase = environments[environment];

if (!targetDatabase) {
  console.error(`Unknown environment: ${environment}`);
  process.exit(1);
}

// Parse the connection string to extract components
function parseConnectionString(connectionString) {
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname,
      port: url.port || 5432,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1) // Remove leading slash
    };
  } catch (error) {
    console.error('Failed to parse DATABASE_URL:', error);
    process.exit(1);
  }
}

async function provisionDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const connectionInfo = parseConnectionString(process.env.DATABASE_URL);
  console.log(`Base database connection info:`, {
    host: connectionInfo.host,
    port: connectionInfo.port,
    user: connectionInfo.user,
    database: connectionInfo.database
  });

  // Connect to PostgreSQL using the default database
  const pool = new Pool({
    host: connectionInfo.host,
    port: connectionInfo.port,
    user: connectionInfo.user,
    password: connectionInfo.password,
    database: connectionInfo.database // Connect to the default database first
  });

  try {
    // Check if the target database exists
    const checkResult = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDatabase]
    );

    if (checkResult.rows.length === 0) {
      console.log(`Creating database '${targetDatabase}'...`);
      
      // Create the new database
      await pool.query(`CREATE DATABASE ${targetDatabase}`);
      console.log(`Database '${targetDatabase}' created successfully`);
    } else {
      console.log(`Database '${targetDatabase}' already exists`);
    }

    // Create a new connection to the specific database to run migrations
    const targetConnectionString = process.env.DATABASE_URL.replace(
      `/${connectionInfo.database}`,
      `/${targetDatabase}`
    );
    
    console.log(`\nTo connect to the ${environment} database, use:\nexport DATABASE_URL="${targetConnectionString}"`);
    console.log(`\nRun migrations with:\nNODE_ENV=${environment} npm run db:push`);

  } catch (error) {
    console.error('Error provisioning database:', error);
  } finally {
    await pool.end();
  }
}

provisionDatabase().catch(err => {
  console.error('Unhandled error in provisioning script:', err);
  process.exit(1);
});