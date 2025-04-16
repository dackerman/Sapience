/**
 * Basic Navigation Test
 * 
 * This is a simplified test that just verifies we can log in and navigate between pages.
 * It doesn't attempt to test article selection or detailed interactions.
 */

import puppeteer from 'puppeteer';

(async () => {
  console.log('Starting basic navigation test...');
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    
    // Log network requests for debugging
    page.on('request', request => {
      if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
        console.log(`NETWORK: ${request.method()} ${request.url()}`);
      }
    });
    
    // Set a desktop viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Navigating to app...');
    await page.goto('http://localhost:5000/', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Take a screenshot before login
    await page.screenshot({ path: 'before-login.png' });
    
    console.log('Looking for login form...');
    await page.waitForSelector('form', { timeout: 10000 });
    
    console.log('Logging in...');
    await page.type('input[name="username"]', 'demo');
    await page.type('input[name="password"]', 'password');
    
    // Click login and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);
    
    // Take a screenshot after login
    await page.screenshot({ path: 'after-login.png' });
    console.log('Login completed');
    
    // Wait a moment to ensure everything is loaded
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Print some diagnostic information about the current page
    const url = page.url();
    const title = await page.title();
    console.log(`Current page: ${url} | Title: ${title}`);
    
    // TEST 1: VERIFY WE CAN SEE THE FOR YOU LINK
    console.log('Test 1: Checking if For You navigation link exists...');
    const forYouExists = await page.evaluate(() => {
      return !!document.querySelector('a[href="/for-you"]');
    });
    
    if (forYouExists) {
      console.log('✅ Test 1: For You link found');
    } else {
      console.error('❌ Test 1: For You link not found');
      // Take screenshot and log HTML
      await page.screenshot({ path: 'home-page-error.png' });
      const html = await page.content();
      console.log('Page HTML preview:', html.substring(0, 500) + '...');
      throw new Error('For You link not found');
    }
    
    // TEST 2: CLICK AND NAVIGATE TO FOR YOU PAGE
    console.log('Test 2: Navigating to For You page...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      page.click('a[href="/for-you"]')
    ]);
    
    // Take a screenshot of the For You page
    await page.screenshot({ path: 'for-you-page.png' });
    
    // Verify we're on the For You page
    const currentUrl = page.url();
    if (currentUrl.includes('/for-you')) {
      console.log('✅ Test 2: Successfully navigated to For You page');
    } else {
      console.error(`❌ Test 2: Navigation failed, current URL: ${currentUrl}`);
      throw new Error('Failed to navigate to For You page');
    }
    
    // TEST 3: NAVIGATE BACK TO HOME
    console.log('Test 3: Navigating back to Home page...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      page.click('a[href="/"]')
    ]);
    
    // Verify we're back on the home page
    const homeUrl = page.url();
    if (homeUrl === 'http://localhost:5000/' || homeUrl === 'http://localhost:5000') {
      console.log('✅ Test 3: Successfully navigated back to Home page');
    } else {
      console.error(`❌ Test 3: Navigation failed, current URL: ${homeUrl}`);
      throw new Error('Failed to navigate back to Home page');
    }
    
    console.log('All basic navigation tests passed! ✅');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();