/**
 * Mobile Navigation Test Script
 *
 * This script provides a simple way to test the mobile navigation flow using Puppeteer.
 * It simulates user interactions on mobile devices and verifies the expected behavior.
 *
 * To run:
 * 1. Install puppeteer: npm install puppeteer
 * 2. Run: node scripts/test-mobile-navigation.js
 */

const puppeteer = require('puppeteer');

async function testMobileNavigation() {
  console.log('Starting mobile navigation test...');
  
  // Launch the browser with mobile emulation
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless testing
    defaultViewport: {
      width: 375, // iPhone X width
      height: 812, // iPhone X height
      isMobile: true,
      hasTouch: true
    }
  });
  
  try {
    const page = await browser.newPage();
    
    // Emulate iPhone X
    await page.emulate({
      viewport: {
        width: 375,
        height: 812,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        isLandscape: false
      },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
    });
    
    // Navigate to the app
    console.log('Navigating to the application...');
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    
    // Wait for the page to load
    await page.waitForSelector('.md\\:hidden', { visible: true });
    console.log('Application loaded in mobile view');
    
    // Step 1: Verify sidebar is shown with feeds
    const feedsVisible = await page.evaluate(() => {
      const feedElements = document.querySelectorAll('.md\\:hidden .flex-1.overflow-y-auto div[class*="flex items-center"]');
      return feedElements.length > 0;
    });
    
    console.log(`Sidebar feeds visible: ${feedsVisible ? 'Yes ✓' : 'No ✗'}`);
    
    // Step 2: Select a feed to show article list
    console.log('Selecting a feed...');
    const feedSelector = '.md\\:hidden .flex-1.overflow-y-auto div[class*="flex items-center"]';
    await page.waitForSelector(feedSelector, { visible: true });
    await page.click(feedSelector);
    
    // Wait for article list to load
    await page.waitForSelector('.article-item', { visible: true });
    console.log('Article list loaded ✓');
    
    // Verify "Back to feeds" button is visible
    const backToFeedsVisible = await page.evaluate(() => {
      return !!document.querySelector('button:contains("← Back to feeds")');
    });
    console.log(`Back to feeds button visible: ${backToFeedsVisible ? 'Yes ✓' : 'No ✗'}`);
    
    // Step 3: Select an article to view its details
    console.log('Selecting an article...');
    await page.click('.article-item');
    
    // Wait for article detail to load
    await page.waitForFunction(() => {
      return !!document.querySelector('button:contains("← Back to articles")');
    });
    console.log('Article detail loaded ✓');
    
    // Step 4: Navigate back to article list
    console.log('Navigating back to article list...');
    await page.click('button:contains("← Back to articles")');
    
    // Wait for article list to be visible again
    await page.waitForSelector('.article-item', { visible: true });
    console.log('Returned to article list ✓');
    
    // Step 5: Navigate back to feeds
    console.log('Navigating back to feeds...');
    await page.click('button:contains("← Back to feeds")');
    
    // Wait for feed list to be visible again
    await page.waitForSelector(feedSelector, { visible: true });
    console.log('Returned to feed list ✓');
    
    console.log('\nMobile navigation test completed successfully! ✅');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testMobileNavigation().catch(console.error);