/**
 * Script to test the production environment on a different port
 * 
 * This script starts the application in production mode on port 5002
 * while the development server continues to run on port 5000.
 * 
 * Usage: node test-production.js
 */

import { spawn } from 'child_process';
import { URL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Production environment configuration
const environment = 'production';
const targetDatabase = 'sapience_prod';
const port = 5002;

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

// Main function to start the test production environment
function startProductionTest() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Generate the production-specific database URL
  const databaseUrl = updateConnectionString(process.env.DATABASE_URL, targetDatabase);
  
  console.log(`Starting application in ${environment} environment...`);
  console.log(`Using database: ${targetDatabase}`);
  console.log(`Server will listen on port: ${port}`);
  console.log(`\nAccess the test production server at: http://localhost:${port}\n`);
  
  // Create a modified environment with the updated DATABASE_URL
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NODE_ENV: environment,
    PORT: port.toString()
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
      console.log(`\nReceived ${signal}, shutting down test production server...`);
      appProcess.kill(signal);
    });
  });
}

console.log('==== TEST PRODUCTION ENVIRONMENT ====');
console.log('This script starts a second instance of the application in production mode');
console.log('while keeping your development server running.\n');

startProductionTest();