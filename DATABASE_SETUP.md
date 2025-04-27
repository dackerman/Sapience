# Database Setup Guide

This guide explains how to set up and use different database environments for development, testing, and production.

## Overview

The application supports three database environments:
- **Development** (`sapience_dev`): Used for local development
- **Testing** (`sapience_test`): Used for running tests
- **Production** (`sapience_prod`): Used for production deployment

Each environment uses a separate database to prevent data collisions, but they all share the same PostgreSQL instance.

## Initial Setup

### 1. Provision Databases

Before using an environment for the first time, you need to provision its database:

```bash
# For development (default)
node scripts/provision-database.js

# For testing
NODE_ENV=test node scripts/provision-database.js

# For production
NODE_ENV=production node scripts/provision-database.js
```

### 2. Run Migrations

After provisioning, run the migrations for the target environment:

```bash
# For development (default)
node scripts/run-migrations.js

# For testing
NODE_ENV=test node scripts/run-migrations.js

# For production
NODE_ENV=production node scripts/run-migrations.js
```

## Starting the Application

To start the application in a specific environment:

```bash
# For development (default)
node scripts/start-environment.js

# For testing
NODE_ENV=test node scripts/start-environment.js

# For production
NODE_ENV=production node scripts/start-environment.js
```

## Testing Multiple Environments Simultaneously

We've created convenient scripts to run development and production environments simultaneously:

```bash
# Start the development server on port 5000 (main instance)
node test-development.js

# Start a second instance in production mode on port 5002
node test-production.js
```

This allows you to compare the behavior of different environments side-by-side without having to restart your server.

## How It Works

- The application reads the `NODE_ENV` environment variable to determine which database to use
- The database connection string is modified to point to the appropriate database
- All database operations use the selected database
- Background jobs run in their own database context to avoid collisions

## Custom Connection Strings

If you need to override the database connection for a specific environment, you can set it directly:

```bash
# For development
export DATABASE_URL="postgresql://user:password@host:port/sapience_dev"

# For testing
export DATABASE_URL="postgresql://user:password@host:port/sapience_test"

# For production
export DATABASE_URL="postgresql://user:password@host:port/sapience_prod"
```

## Troubleshooting

If you encounter database connection issues:

1. Verify the `DATABASE_URL` environment variable is set correctly
2. Check that the target database exists using `psql` or another PostgreSQL client
3. Ensure the user has the necessary permissions on the database
4. Check the logs for connection errors

For additional help, see the PostgreSQL documentation for more detailed troubleshooting.