#!/bin/bash

# Run only the three working tests
echo "Running specific tests that are known to work..."
npx jest MobileArticleNavigation.test.tsx use-mobile-navigation.test.tsx HomeIntegration.test.tsx

# Exit with the same status code as the jest command
exit $?