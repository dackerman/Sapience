import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { dbConfig } from './config';

neonConfig.webSocketConstructor = ws;

if (!dbConfig.connectionString) {
  throw new Error(
    "Database connection string must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: dbConfig.connectionString, 
  ssl: {
    rejectUnauthorized: false // Needed for some cloud PostgreSQL providers
  }
});
export const db = drizzle(pool, { schema });

// Log connection to the database for debugging
console.log(`Connected to database: ${dbConfig.database}`);
