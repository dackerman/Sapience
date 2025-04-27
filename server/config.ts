// Database configuration based on environment
// This allows for different databases in development, testing, and production

import dotenv from 'dotenv';
dotenv.config();

type Environment = 'development' | 'test' | 'production';

interface DatabaseConfig {
  connectionString: string;
  database: string;
}

// Get environment from NODE_ENV, default to development
const environment = (process.env.NODE_ENV || 'development') as Environment;

// Base database URL from environment variables
const baseDatabaseUrl = process.env.DATABASE_URL || '';

// Function to modify a connection string to use a different database name
function modifyConnectionStringForEnvironment(connectionString: string, dbName: string): string {
  if (!connectionString) return connectionString;
  
  try {
    // Parse the current connection string
    const url = new URL(connectionString);
    
    // Update path (database name)
    url.pathname = `/${dbName}`;
    
    // Ensure SSL is enabled (important for cloud database providers)
    if (!url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require');
    }
    
    return url.toString();
  } catch (error) {
    console.error('Failed to parse DATABASE_URL:', error);
    return connectionString;
  }
}

// Environment-specific database configurations
const databaseConfigs: Record<Environment, DatabaseConfig> = {
  development: {
    connectionString: baseDatabaseUrl,
    database: 'sapience_dev'
  },
  test: {
    connectionString: modifyConnectionStringForEnvironment(baseDatabaseUrl, 'sapience_test'),
    database: 'sapience_test'
  },
  production: {
    connectionString: modifyConnectionStringForEnvironment(baseDatabaseUrl, 'sapience_prod'),
    database: 'sapience_prod'
  }
};

// Export the configuration for the current environment
export const dbConfig = databaseConfigs[environment];

// Log which database is being used
console.log(`Using database: ${dbConfig.database} (${environment} environment)`);