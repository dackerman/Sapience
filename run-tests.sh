#!/bin/bash

# Style constants
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

# Check for help flag
if [[ "$1" == "--help" ]]; then
  echo -e "${BLUE}${BOLD}RSS Reader Test Runner${RESET}"
  echo 
  echo "Usage: ./run-tests.sh [options]"
  echo 
  echo "Options:"
  echo "  --working-only     Only run tests that are known to be working"
  echo "  --file=filename    Run a specific test file"
  echo "  --help             Show this help message"
  exit 0
fi

# Print header
echo -e "${BLUE}${BOLD}=================================${RESET}"
echo -e "${BLUE}${BOLD}RSS Reader - Test Runner${RESET}"
echo -e "${BLUE}${BOLD}=================================${RESET}"

# Parse command line arguments
WORKING_ONLY=false
SPECIFIC_FILE=""

for arg in "$@"; do
  if [[ "$arg" == "--working-only" ]]; then
    WORKING_ONLY=true
  elif [[ "$arg" == --file=* ]]; then
    SPECIFIC_FILE="${arg#*=}"
  fi
done

# Build Jest command
JEST_CMD="npx jest"

if [[ "$WORKING_ONLY" == "true" ]]; then
  JEST_CMD="$JEST_CMD MobileArticleNavigation.test.tsx use-mobile-navigation.test.tsx HomeIntegration.test.tsx"
  echo -e "${GREEN}Running only working tests...${RESET}"
elif [[ -n "$SPECIFIC_FILE" ]]; then
  JEST_CMD="$JEST_CMD $SPECIFIC_FILE"
  echo -e "${GREEN}Running specific test file: $SPECIFIC_FILE${RESET}"
else
  echo -e "${GREEN}Running all tests...${RESET}"
fi

# Execute Jest
echo -e "\n${BOLD}Test output:${RESET}"
echo -e "${BLUE}----------------------------------------${RESET}"

if $JEST_CMD; then
  echo -e "${BLUE}----------------------------------------${RESET}"
  echo -e "${GREEN}${BOLD}Tests completed successfully!${RESET}"
  exit 0
else
  echo -e "${BLUE}----------------------------------------${RESET}"
  echo -e "${RED}${BOLD}Some tests failed or an error occurred.${RESET}"
  
  if [[ "$WORKING_ONLY" != "true" ]]; then
    echo -e "\n${BOLD}Tip: Use --working-only flag to run only working tests:${RESET}"
    echo -e "  ./run-tests.sh --working-only"
  fi
  
  exit 1
fi