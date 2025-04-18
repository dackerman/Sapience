/**
 * Cross-Page Navigation Test Script
 *
 * This script tests navigation between different pages in the application using Puppeteer.
 * It specifically tests navigation from Home to For You and back.
 * 
 * To run:
 * node scripts/test-cross-page-navigation.js
 */

import puppeteer from 'puppeteer';

async function testCrossPageNavigation() {
  console.log('Starting cross-page navigation test...');
  
  // Launch a new browser instance with Replit-specific settings
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({
      width: 1280,
      height: 800,
      deviceScaleFactor: 1
    });
    
    console.log('Navigating to the application...');
    await page.goto('http://localhost:5000/', { waitUntil: 'networkidle0' });
    
    // Enable more verbose logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    // Wait for login form and log in
    console.log('Waiting for login form...');
    await page.waitForSelector('form', { timeout: 10000 });
    console.log('Login form found, entering credentials...');
    
    await page.type('input[name="username"]', 'demo');
    await page.type('input[name="password"]', 'password');
    
    console.log('Submitting login form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);
    
    // Take a screenshot to help debug
    await page.screenshot({ path: 'cross-page-after-login.png' });
    console.log('Login form submitted, screenshot saved');
    
    // Check if we're authenticated
    const content = await page.content();
    if (content.includes('Not authenticated')) {
      console.error('Login failed - still showing authentication page');
      throw new Error('Login failed');
    }
    
    console.log('Waiting for home page to load...');
    // Try multiple possible selectors
    try {
      await page.waitForSelector('a[href="/for-you"]', { timeout: 10000 });
      console.log('Found For You link in navigation');
    } catch (e) {
      try {
        await page.waitForSelector('.sidebar', { timeout: 5000 });
        console.log('Found sidebar element');
      } catch (e2) {
        try {
          await page.waitForSelector('header, nav', { timeout: 5000 });
          console.log('Found header/nav element');
        } catch (e3) {
          console.error('Could not find any navigation elements');
          throw e3;
        }
      }
    }
    console.log('Home page loaded successfully.');
    
    // Test 1: Navigate from Home to For You page
    console.log('Test 1: Navigating from Home to For You page...');
    const forYouLink = await page.waitForSelector('a[href="/for-you"]');
    await forYouLink.click();
    
    // Wait for the For You page to load
    await page.waitForFunction(
      () => window.location.pathname === '/for-you',
      { timeout: 5000 }
    );
    await page.waitForSelector('.p-4.border-b', { timeout: 5000 });
    console.log('Successfully navigated to For You page.');
    
    // Test 2: Navigate back to Home
    console.log('Test 2: Navigating back to Home page...');
    const homeLink = await page.waitForSelector('a[href="/"]');
    await homeLink.click();
    
    // Wait for the Home page to load
    await page.waitForFunction(
      () => window.location.pathname === '/',
      { timeout: 5000 }
    );
    console.log('Successfully navigated back to Home page.');
    
    // Test 3: Navigate to For You page, click article, then navigate back to Home
    console.log('Test 3: For You page article interaction, then Home...');
    await forYouLink.click();
    
    // Wait for the For You page to load
    await page.waitForFunction(
      () => window.location.pathname === '/for-you',
      { timeout: 5000 }
    );
    
    // Check if there are any articles
    const articleElements = await page.$$('.p-4.rounded-lg.hover\\:bg-slate-100');
    
    if (articleElements.length > 0) {
      // Click on the first article
      console.log('Clicking on an article...');
      await articleElements[0].click();
      
      // Wait for the article view to appear
      await page.waitForSelector('button.mb-1', { timeout: 5000 });
      console.log('Article view loaded.');
      
      // Click back to recommendations
      console.log('Going back to recommendations list...');
      const backButton = await page.waitForSelector('button.mb-1');
      await backButton.click();
      
      // Verify recommendations are visible
      await page.waitForSelector('.p-4.space-y-4', { timeout: 5000 });
      console.log('Back to recommendations list.');
    } else {
      console.log('No articles found to test with. Skipping article interaction.');
    }
    
    // Now go back to home
    console.log('Navigating back to Home page again...');
    await homeLink.click();
    
    // Wait for the Home page to load
    await page.waitForFunction(
      () => window.location.pathname === '/',
      { timeout: 5000 }
    );
    console.log('Successfully navigated back to Home page.');
    
    // All tests passed!
    console.log('Cross-page navigation test completed successfully! ✅');
    
  } catch (error) {
    console.error('Test failed with error:', error);
    
    // Take a screenshot on failure to help debug
    try {
      await page.screenshot({ path: 'error-screenshot.png' });
      console.log('Error screenshot saved to error-screenshot.png');
    } catch (screenshotError) {
      console.error('Failed to take error screenshot:', screenshotError);
    }
    
    await browser.close();
    process.exit(1);
  }
  
  await browser.close();
}

// Run the test
testCrossPageNavigation().catch(console.error);