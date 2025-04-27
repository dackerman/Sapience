// Script to run migrations on the appropriate database
// Usage: NODE_ENV=production node scripts/run-migrations.js

import { execSync } from 'child_process';
import { URL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

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

// Function to modify a connection string to use a different database name
function updateConnectionString(connectionString, dbName) {
  if (!connectionString) return connectionString;
  
  try {
    // Parse the current connection string
    const url = new URL(connectionString);
    
    // Update path (database name)
    url.pathname = `/${dbName}`;
    
    // Ensure SSL is enabled
    if (!url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require');
    }
    
    return url.toString();
  } catch (error) {
    console.error('Failed to parse DATABASE_URL:', error);
    return connectionString;
  }
}

// Main function to run migrations
function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Generate the environment-specific database URL
  const databaseUrl = updateConnectionString(process.env.DATABASE_URL, targetDatabase);
  
  console.log(`Running migrations for ${environment} environment...`);
  console.log(`Target database: ${targetDatabase}`);
  
  try {
    // Run the migration command with the modified DATABASE_URL
    console.log('Executing db:push command...');
    execSync(`DATABASE_URL="${databaseUrl}" npm run db:push`, { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl }
    });
    
    console.log(`\nMigrations completed successfully for ${environment} database`);
  } catch (error) {
    console.error('Error running migrations:', error.message);
    process.exit(1);
  }
}

runMigrations();