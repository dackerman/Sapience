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
import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:5000';

// Test configuration
const MOBILE_VIEWPORT = {
  width: 375,
  height: 667,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
};

async function testMobileNavigation() {
  console.log('🔍 Starting mobile navigation test...');
  
  // Launch headless browser
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set mobile viewport
    await page.setViewport(MOBILE_VIEWPORT);
    console.log('📱 Set mobile viewport:', MOBILE_VIEWPORT.width, 'x', MOBILE_VIEWPORT.height);
    
    // Navigate to app
    console.log('🌐 Navigating to:', APP_URL);
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    
    // Step 1: Verify feeds are loaded
    console.log('✅ Step 1: Verifying feeds loaded');
    await page.waitForSelector('[data-testid="sidebar-feed-item"]', { timeout: 5000 });
    
    // Get the first feed item
    const feeds = await page.$$('[data-testid="sidebar-feed-item"]');
    if (feeds.length === 0) {
      throw new Error('No feed items found');
    }
    
    // Click on the first feed
    console.log('🖱️ Clicking on first feed item');
    await feeds[0].click();
    
    // Step 2: Verify article list is shown
    console.log('✅ Step 2: Verifying article list view');
    await page.waitForSelector('[data-testid="article-list-view"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="article-item"]', { timeout: 5000 });
    
    // Verify "Back to feeds" button is visible
    const backToFeedsBtn = await page.$('button:has-text("Back to feeds")');
    if (!backToFeedsBtn) {
      throw new Error('"Back to feeds" button not found');
    }
    
    // Click on the first article
    console.log('🖱️ Clicking on first article');
    const articles = await page.$$('[data-testid="article-item"]');
    if (articles.length === 0) {
      throw new Error('No article items found');
    }
    await articles[0].click();
    
    // Step 3: Verify article detail view is shown
    console.log('✅ Step 3: Verifying article detail view');
    await page.waitForSelector('[data-testid="article-view"]', { timeout: 5000 });
    
    // Verify "Back to articles" button is visible
    const backToArticlesBtn = await page.$('button:has-text("Back to articles")');
    if (!backToArticlesBtn) {
      throw new Error('"Back to articles" button not found');
    }
    
    // Navigate back to article list
    console.log('🖱️ Clicking "Back to articles" button');
    await backToArticlesBtn.click();
    
    // Step 4: Verify we're back at the article list
    console.log('✅ Step 4: Verifying returned to article list');
    await page.waitForSelector('[data-testid="article-list-view"]', { timeout: 5000 });
    
    // Verify "Back to feeds" button is visible again
    const backToFeedsBtnAgain = await page.$('button:has-text("Back to feeds")');
    if (!backToFeedsBtnAgain) {
      throw new Error('"Back to feeds" button not found after returning to article list');
    }
    
    // Navigate back to feeds
    console.log('🖱️ Clicking "Back to feeds" button');
    await backToFeedsBtnAgain.click();
    
    // Step 5: Verify we're back at the feeds view
    console.log('✅ Step 5: Verifying returned to feeds view');
    await page.waitForSelector('[data-testid="sidebar"]', { visible: true, timeout: 5000 });
    
    console.log('🎉 Mobile navigation test PASSED!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Mobile navigation test FAILED!', error);
    // Take a screenshot for debugging
    const page = (await browser.pages())[0];
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('📸 Error screenshot saved to error-screenshot.png');
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// Run the test if this script is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  testMobileNavigation()
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}

export default testMobileNavigation;