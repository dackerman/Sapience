import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { HttpCookieAgent } from 'http-cookie-agent/http';
import https from 'https';

/**
 * This test helps diagnose session issues with the API
 */
async function testSession() {
  try {
    console.log('Testing session management with tough-cookie...');
    
    // Setup cookie jar for maintaining cookies across requests
    const cookieJar = new CookieJar();
    
    // Create an axios instance with cookie jar support
    const api = axios.create({
      baseURL: 'http://localhost:5000',
      httpAgent: new HttpCookieAgent({ cookies: { jar: cookieJar } }),
      httpsAgent: new HttpCookieAgent({ cookies: { jar: cookieJar } }),
      withCredentials: true
    });
    
    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginResponse = await api.post('/api/login', {
      username: 'demo',
      password: 'password'
    });
    
    console.log('Login response status:', loginResponse.status);
    console.log('Login response data:', loginResponse.data ? 'Received user data' : 'No user data');
    
    // Print cookies in jar
    console.log('Cookies after login:');
    cookieJar.getCookiesSync('http://localhost:5000').forEach(cookie => {
      console.log(`- ${cookie.key}: ${cookie.value.substring(0, 10)}...`);
    });
    
    // Step 2: Get user profile 
    console.log('\nStep 2: Fetching user profile...');
    try {
      const profileResponse = await api.get('/api/profile');
      console.log('Profile response status:', profileResponse.status);
      console.log('Profile data received:', profileResponse.data ? 'Yes' : 'No');
    } catch (error) {
      console.error('Profile fetch error:', error.response ? error.response.data : error.message);
    }
    
    // Step 3: Get recommendations
    console.log('\nStep 3: Fetching recommendations...');
    try {
      const recommendationsResponse = await api.get('/api/recommendations');
      console.log('Recommendations response status:', recommendationsResponse.status);
      console.log('Recommendations received:', recommendationsResponse.data.length);
    } catch (error) {
      console.error('Recommendations fetch error:', error.response ? error.response.data : error.message);
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test error:', error.response ? error.response.data : error.message);
  }
}

// Run the test
testSession();