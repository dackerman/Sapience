#!/bin/bash
# Run end-to-end tests with Puppeteer

echo "===== Running Puppeteer End-to-End Tests ====="

# Check which test to run from command line argument
TEST_TO_RUN=${1:-"basic"}

if [ "$TEST_TO_RUN" = "basic" ]; then
  echo
  echo "----- Test: Basic Navigation -----"
  # Run the test with a timeout of 60 seconds
  timeout 60 node scripts/test-basic-navigation.js
  RESULT=$?
  
  if [ $RESULT -eq 0 ]; then
    echo "✅ Basic Navigation test passed successfully!"
    exit 0
  elif [ $RESULT -eq 124 ]; then
    echo "❌ Test timed out. It took too long to complete."
    exit 1
  else
    echo "❌ Test failed. Please check the logs above."
    exit 1
  fi
elif [ "$TEST_TO_RUN" = "for-you" ]; then
  echo
  echo "----- Test: For You Page Navigation -----"
  # Run the test with a timeout of 60 seconds
  timeout 60 node scripts/test-for-you-navigation.js
  RESULT=$?
  
  if [ $RESULT -eq 0 ]; then
    echo "✅ For You Page Navigation test passed successfully!"
    exit 0
  elif [ $RESULT -eq 124 ]; then
    echo "❌ Test timed out. It took too long to complete."
    exit 1
  else
    echo "❌ Test failed. Please check the logs above."
    exit 1
  fi
elif [ "$TEST_TO_RUN" = "cross-page" ]; then
  echo
  echo "----- Test: Cross-Page Navigation -----"
  # Run the test with a timeout of 60 seconds
  timeout 60 node scripts/test-cross-page-navigation.js
  RESULT=$?
  
  if [ $RESULT -eq 0 ]; then
    echo "✅ Cross-Page Navigation test passed successfully!"
    exit 0
  elif [ $RESULT -eq 124 ]; then
    echo "❌ Test timed out. It took too long to complete."
    exit 1
  else
    echo "❌ Test failed. Please check the logs above."
    exit 1
  fi
else
  echo "Invalid test specified. Please use 'basic', 'for-you', or 'cross-page'"
  exit 1
fi