/**
 * Test Runner Script
 * This will run all Jest tests for the application
 * 
 * Usage: node runtests.js
 * 
 * Flags:
 *   --working-only: Only run tests that are known to be working
 *   --file=filename.test.tsx: Run a specific test file
 *   --help: Show this help message
 */

import { execSync } from 'child_process';

console.log('========================================');
console.log('RSS Reader - Test Runner');
console.log('========================================');

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help');
const workingOnly = args.includes('--working-only');
let specificFile = null;

// Check for --file argument
args.forEach(arg => {
  if (arg.startsWith('--file=')) {
    specificFile = arg.split('=')[1];
  }
});

if (showHelp) {
  console.log(`
Usage: node runtests.js [options]

Options:
  --working-only     Only run tests that are known to be working
  --file=filename    Run a specific test file
  --help             Show this help message
  `);
  process.exit(0);
}

try {
  // Build the Jest command
  let jestCommand = 'npx jest';
  
  if (workingOnly) {
    jestCommand += ' MobileArticleNavigation.test.tsx use-mobile-navigation.test.tsx HomeIntegration.test.tsx';
    console.log('Running only working tests...');
  } else if (specificFile) {
    jestCommand += ` ${specificFile}`;
    console.log(`Running specific test file: ${specificFile}`);
  } else {
    console.log('Running all tests...');
  }
  
  // Execute Jest
  console.log('\nTest output:');
  console.log('----------------------------------------');
  execSync(jestCommand, { stdio: 'inherit' });
  console.log('----------------------------------------');
  console.log('Tests completed successfully!');
  
} catch (error) {
  console.log('----------------------------------------');
  console.log('Some tests failed or an error occurred.');
  
  if (!workingOnly) {
    console.log('\nTip: Use --working-only flag to run only working tests:');
    console.log('  node runtests.js --working-only');
  }
  
  process.exit(1);
}