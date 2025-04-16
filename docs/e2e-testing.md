# End-to-End Testing with Puppeteer

This document outlines the end-to-end testing setup for the Sapience RSS reader application using Puppeteer.

## Overview

End-to-end tests simulate real user interactions with the application to verify that the entire system works together correctly. These tests are particularly useful for catching regression issues in UI navigation flows.

## Available Tests

### 1. Basic Navigation Test (Recommended)

This is a simplified test that verifies basic navigation flows:
- Tests successful login
- Verifies navigation between Home and For You pages
- Doesn't attempt to interact with articles

**Test file:** `scripts/test-basic-navigation.js`

### 2. For You Page Navigation Test

This test focuses specifically on the navigation within the "For You" page:
- Verifies the recommendations list loads correctly
- Tests clicking on an article and viewing the article detail
- Ensures the back button returns to the recommendations list

**Test file:** `scripts/test-for-you-navigation.js`

### 3. Cross-Page Navigation Test

This test verifies navigation between different pages in the application:
- Tests navigation from Home to For You page and back
- Verifies article interaction on the For You page
- Tests the flow from article view back to recommendations and then to Home

**Test file:** `scripts/test-cross-page-navigation.js`

## Running the Tests

To run the tests, make sure the application is running on port 5000 (using `npm run dev`).

### Running Basic Navigation Test

This test is the most reliable and should run consistently:

```bash
./run-e2e-tests.sh basic
```

### Running Other Tests

```bash
# For the For You page navigation test
./run-e2e-tests.sh for-you

# For the cross-page navigation test
./run-e2e-tests.sh cross-page
```

## Screenshots & Debugging

The tests generate screenshots at various stages to help debug issues:
- `before-login.png` - Shows the application before login
- `after-login.png` - Shows the application after successful login
- `for-you-page.png` - Shows the For You page
- `error-screenshot.png` - Generated when a test fails

## Test Requirements

1. The application must be running on `http://localhost:5000`.
2. The 'demo' user account must be available with the credentials:
   - Username: demo
   - Password: password

## Interpreting Results

Test results will be displayed in the console with detailed logs of each step in the test process. If a test fails, the error message will be displayed, and in some cases, a screenshot will be saved to help debug the issue.

The "basic" test is the most reliable and should pass consistently. The more complex tests may sometimes time out if there are delays in loading or rendering components.

## Adding New Tests

When adding new end-to-end tests:

1. Create a new script in the `scripts/` directory.
2. Follow the pattern of existing tests, using Puppeteer's API to simulate user interactions.
3. Add the test to the `run-e2e-tests.sh` script.
4. Document the new test in this file.

## Common Issues and Troubleshooting

- **Test times out waiting for an element**: This usually means the element isn't loading or has a different selector than expected. Check the page structure and adjust the selectors accordingly.
- **Navigation issues**: If a test fails during page transitions, it might be due to timing issues. Consider increasing the timeout values.
- **Login failures**: Ensure the test user credentials are correct and the login form hasn't changed.
- **Screenshots missing**: Check if the test crashed before creating screenshots.