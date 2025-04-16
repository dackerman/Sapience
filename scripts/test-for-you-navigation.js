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
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
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
    console.log('Logging in...');
    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', 'david.w.ackerman@gmail.com');
    await page.type('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for the home page to load
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 5000 });
    
    // Navigate to For You page
    console.log('Navigating to For You page...');
    const forYouLink = await page.waitForSelector('a[href="/for-you"]');
    await forYouLink.click();
    
    // Wait for the For You page to load with recommendations
    await page.waitForSelector('.p-4.space-y-4', { timeout: 5000 });
    console.log('For You page loaded with recommendations.');
    
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