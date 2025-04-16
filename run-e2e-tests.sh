#!/bin/bash
# Run end-to-end tests with Puppeteer

echo "===== Running Puppeteer End-to-End Tests ====="

echo
echo "----- Test 1: For You Page Navigation -----"
node scripts/test-for-you-navigation.js
TEST1_RESULT=$?

echo
echo "----- Test 2: Cross-Page Navigation -----"
node scripts/test-cross-page-navigation.js
TEST2_RESULT=$?

echo
echo "===== End-to-End Test Results ====="
if [ $TEST1_RESULT -eq 0 ] && [ $TEST2_RESULT -eq 0 ]; then
  echo "✅ All tests passed successfully!"
  exit 0
else
  echo "❌ Some tests failed. Please check the logs above."
  exit 1
fi