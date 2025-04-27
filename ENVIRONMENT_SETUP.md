# Environment Setup Guide

This guide explains how to work with different environments in the Sapience application.

## Introduction

The application supports multiple environments:

- **Development**: The default environment for local development work
- **Production**: For deployed applications or testing production-like configurations
- **Test**: For running automated tests

Each environment uses its own database to prevent data collisions and background job interference.

## Setting Up Environments

### 1. Database Setup

Each environment needs its own database. See [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed instructions on:

- Creating databases for each environment
- Running migrations
- Configuring database connections

### 2. Running Development and Production Simultaneously

We've created scripts to make it easy to run multiple environments at the same time:

```bash
# Start the main development server on port 5000
node test-development.js

# In a separate terminal, start the production server on port 5002
node test-production.js
```

This allows you to:
- Compare behavior between environments
- Test changes in isolation
- Ensure background jobs don't interfere with each other

### 3. Environment-Specific Configuration

The application automatically configures itself based on the NODE_ENV environment variable:

- Server port selection
- Database connection parameters
- SSL configuration
- Logging behavior

## Technical Implementation Details

### Database Isolation

Each environment has:
- Its own database instance (sapience_dev, sapience_test, sapience_prod)
- Separate connections with SSL enabled for security
- Independent background job processing

### Port Configuration

The server listens on different ports based on the environment:
- Development: Port 5000
- Test: Port 5001
- Production: Port 5002

This configuration allows running multiple environments simultaneously without port conflicts.

### SSL Configuration

All database connections use SSL by default for enhanced security. This is especially important for:

- Cloud database providers
- Remote database connections
- Production environments

The connection URLs automatically include the `sslmode=require` parameter to enforce SSL usage.

## Troubleshooting

If you encounter issues:

1. Verify you're in the correct environment by checking the console output when starting the application
2. Ensure the appropriate database exists and migrations have been run
3. Check that the port isn't already in use by another process
4. Review the logs for any connection errors or configuration issues

For more detailed database troubleshooting, refer to [DATABASE_SETUP.md](DATABASE_SETUP.md).