// Script to start the application with the environment-specific database
// Usage: NODE_ENV=production node scripts/start-environment.js

import { spawn } from 'child_process';
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

// Main function to start the application
function startApplication() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Generate the environment-specific database URL
  const databaseUrl = updateConnectionString(process.env.DATABASE_URL, targetDatabase);
  
  console.log(`Starting application in ${environment} environment...`);
  console.log(`Using database: ${targetDatabase}`);
  
  // Create a modified environment with the updated DATABASE_URL
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NODE_ENV: environment
  };
  
  // Start the application using npm run dev
  const appProcess = spawn('npm', ['run', 'dev'], { 
    stdio: 'inherit',
    env
  });
  
  appProcess.on('error', (error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
  
  appProcess.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error(`Application exited with code ${code}`);
      process.exit(code);
    }
  });
  
  // Handle termination signals
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      console.log(`\nReceived ${signal}, shutting down...`);
      appProcess.kill(signal);
    });
  });
}

startApplication();