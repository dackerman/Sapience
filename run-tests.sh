#!/bin/bash

echo "Running all tests..."
npx jest

# Exit with the same status code as the jest command
exit $?