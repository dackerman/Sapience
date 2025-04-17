/**
 * For You Page Navigation Test Script
 *
 * This script tests the navigation flow on the For You page using Puppeteer.
 * It specifically tests navigation from the recommendations list to an article and back.
 * 
 * To run:
 * node scripts/test-for-you-navigation.js
 */

import puppeteer from 'puppeteer';

async function testForYouNavigation() {
  console.log('Starting For You navigation test...');
  
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
    
    // Enable more verbose logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    // Set viewport to mobile dimensions for easier testing of mobile views
    await page.setViewport({
      width: 375,
      height: 667,
      deviceScaleFactor: 1,
      isMobile: true
    });
    
    console.log('Navigating to the application...');
    await page.goto('http://localhost:5000/', { waitUntil: 'networkidle0' });
    
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
    await page.screenshot({ path: 'after-login.png' });
    console.log('Login form submitted, screenshot saved');
    
    // Add a delay to ensure the page has loaded completely
    console.log('Waiting 3 seconds for the page to fully load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if we're authenticated
    const content = await page.content();
    if (content.includes('Not authenticated')) {
      console.error('Login failed - still showing authentication page');
      throw new Error('Login failed');
    }
    
    // Log the current URL and page title for debugging
    console.log(`Current URL: ${page.url()}`);
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
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
    
    // Navigate to For You page
    console.log('Navigating to For You page...');
    const forYouLink = await page.waitForSelector('a[href="/for-you"]');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      forYouLink.click()
    ]);
    
    // Log current URL after navigation
    console.log(`Navigated to: ${page.url()}`);
    
    // Take a screenshot of the For You page
    await page.screenshot({ path: 'for-you-page.png' });
    console.log('For You page screenshot saved');
    
    // Add a delay to ensure content has loaded
    console.log('Waiting 3 seconds for recommendations to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get page content for debugging
    const forYouContent = await page.content();
    console.log(`Page content contains 'recommendations': ${forYouContent.includes('recommendations')}`);
    
    // Wait for recommendations to load
    try {
      await page.waitForSelector('.p-4.space-y-4', { timeout: 10000 });
      console.log('For You page loaded with recommendations.');
    } catch (error) {
      console.error('Could not find recommendations container. Current selectors on page:');
      // Log some other possible selectors for debugging
      const selectors = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('div, p, h1, h2, h3'))
          .slice(0, 10)
          .map(el => el.className || el.tagName);
      });
      console.log(selectors);
      throw error;
    }
    
    // Check if there are any article recommendations
    const articleElements = await page.$$('.p-4.rounded-lg.hover\\:bg-slate-100');
    
    if (articleElements.length === 0) {
      console.log('No article recommendations found. Skipping article navigation test.');
    } else {
      // Click on the first article
      console.log('Clicking on the first article...');
      await articleElements[0].click();
      
      // Wait for the article view to load
      await page.waitForSelector('.mb-1', { timeout: 5000 });
      console.log('Article view loaded successfully.');
      
      // Find and click the back button
      console.log('Clicking back button to return to recommendations...');
      const backButton = await page.waitForSelector('button.mb-1');
      await backButton.click();
      
      // Wait for the recommendations list to be visible again
      await page.waitForSelector('.p-4.space-y-4', { timeout: 5000 });
      console.log('Successfully returned to recommendations list.');
    }
    
    console.log('For You navigation test completed successfully! ✅');
    
  } catch (error) {
    console.error('Test failed with error:', error);
    await browser.close();
    process.exit(1);
  }
  
  await browser.close();
}

// Run the test
testForYouNavigation().catch(console.error);