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
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless testing
    args: ['--window-size=375,812'] // iPhone X dimensions
  });
  
  try {
    // Create a new page
    const page = await browser.newPage();
    
    // Set viewport to mobile size
    await page.setViewport({
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    
    // Navigate to the application
    console.log('Navigating to the application...');
    await page.goto('http://localhost:5000', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for the application to load (sidebar should be visible)
    console.log('Waiting for sidebar to be visible...');
    await page.waitForSelector('.sidebar', { visible: true, timeout: 10000 });
    
    // Find and click on a feed (e.g., "Hacker News")
    console.log('Selecting a feed...');
    const feedElement = await page.waitForXPath("//div[contains(@class, 'sidebar')]//div[contains(text(), 'News')]", { 
      visible: true,
      timeout: 10000
    });
    
    if (feedElement) {
      await feedElement.click();
      
      // Wait for article list to be visible
      console.log('Waiting for article list to be visible...');
      await page.waitForSelector('.article-list', { visible: true, timeout: 10000 });
      
      // Verify "Back to feeds" button is visible
      const backToFeedsBtn = await page.$('button:has-text("← Back to feeds")');
      if (backToFeedsBtn) {
        console.log('✓ Back to feeds button is visible');
      } else {
        console.error('❌ Back to feeds button not found');
      }
      
      // Find and click on an article
      console.log('Selecting an article...');
      const articleElement = await page.waitForSelector('.article-list-item', { 
        visible: true,
        timeout: 10000
      });
      
      if (articleElement) {
        await articleElement.click();
        
        // Wait for article content to be visible
        console.log('Waiting for article content to be visible...');
        await page.waitForSelector('.article-content', { visible: true, timeout: 10000 });
        
        // Verify "Back to articles" button is visible
        const backToArticlesBtn = await page.$('button:has-text("← Back to articles")');
        if (backToArticlesBtn) {
          console.log('✓ Back to articles button is visible');
          
          // Navigate back to article list
          console.log('Navigating back to article list...');
          await backToArticlesBtn.click();
          
          // Wait for article list to be visible again
          await page.waitForSelector('.article-list', { visible: true, timeout: 10000 });
          console.log('✓ Successfully navigated back to article list');
          
          // Find and click on "Back to feeds" button
          const backToFeedsBtn = await page.$('button:has-text("← Back to feeds")');
          if (backToFeedsBtn) {
            console.log('Navigating back to feeds...');
            await backToFeedsBtn.click();
            
            // Wait for sidebar to be visible again
            await page.waitForSelector('.sidebar', { visible: true, timeout: 10000 });
            console.log('✓ Successfully navigated back to feeds sidebar');
            
            console.log('✓ Mobile navigation test passed!');
          } else {
            console.error('❌ Back to feeds button not found');
          }
        } else {
          console.error('❌ Back to articles button not found');
        }
      } else {
        console.error('❌ No articles found in the list');
      }
    } else {
      console.error('❌ Feed not found in sidebar');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Close browser
    await browser.close();
  }
}

// Run the test
testMobileNavigation().catch(console.error);