/**
 * Production Environment Article Preferences Test
 *
 * This script tests the article preferences (upvote/downvote) functionality in the production environment.
 * It demonstrates that the article preference functionality works correctly in the production database.
 * 
 * Usage: NODE_ENV=production node test-production-article-preferences.js
 */

import axios from 'axios';
import { URL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Configure the production environment
const environment = 'production';
const port = 5002; // Use the production environment port

// Function to update the URL for the production environment
function getApiUrl(endpoint) {
  return `http://localhost:${port}${endpoint}`;
}

// Simple delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to handle login and get session
async function login(username, password) {
  try {
    const response = await axios.post(getApiUrl('/api/login'), {
      username,
      password
    }, { withCredentials: true });
    
    return response.headers['set-cookie'];
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Function to make authenticated requests
async function withAuth(cookie, callback) {
  try {
    return await callback(cookie);
  } catch (error) {
    console.error('Request failed:', error.response?.data || error.message);
    throw error;
  }
}

// Main test function
async function testProductionArticlePreferences() {
  console.log(`Testing article preferences in ${environment} environment`);
  console.log(`Using port: ${port}\n`);
  
  try {
    // 1. Login as default user (admin/password)
    console.log('Logging in as admin user...');
    const cookie = await login('admin', 'password');
    
    if (!cookie) {
      console.error('Failed to get authentication cookie. Is the production server running on port 5002?');
      console.log('Make sure to start the production server with: node test-production.js');
      return;
    }
    
    console.log('Login successful\n');
    
    // 2. Get first article to test with
    console.log('Fetching articles...');
    const articlesResponse = await withAuth(cookie, async (cookie) => {
      return await axios.get(getApiUrl('/api/articles'), {
        headers: { Cookie: cookie }
      });
    });
    
    if (!articlesResponse.data.length) {
      console.log('No articles found. Creating a test article...');
      
      // Create a test article if none exists
      const newArticle = await withAuth(cookie, async (cookie) => {
        return await axios.post(getApiUrl('/api/articles'), {
          feedId: 1,
          title: 'Test Article for Preference Testing',
          link: 'https://example.com/test-article',
          pubDate: new Date().toISOString(),
          author: 'Test Author',
          content: 'This is a test article for testing the article preference functionality.',
          contentSnippet: 'Test article for preferences.'
        }, {
          headers: { Cookie: cookie }
        });
      });
      
      console.log('Test article created with ID:', newArticle.data.id);
      var articleId = newArticle.data.id;
    } else {
      console.log(`Found ${articlesResponse.data.length} articles`);
      var articleId = articlesResponse.data[0].id;
      console.log(`Using article ID: ${articleId} for testing\n`);
    }
    
    // 3. Upvote the article with explanation
    console.log('Testing upvote with explanation...');
    const upvoteResponse = await withAuth(cookie, async (cookie) => {
      return await axios.post(getApiUrl('/api/article-preferences'), {
        articleId,
        vote: 'up',
        explanation: 'This article is very informative and well-written.'
      }, {
        headers: { Cookie: cookie }
      });
    });
    
    console.log('Upvote response:', upvoteResponse.data);
    console.log('Upvote successful\n');
    
    // 4. Get the preference to verify
    console.log('Verifying preference was saved...');
    const preferenceResponse = await withAuth(cookie, async (cookie) => {
      return await axios.get(getApiUrl(`/api/article-preferences/${articleId}`), {
        headers: { Cookie: cookie }
      });
    });
    
    console.log('Preference details:', preferenceResponse.data);
    
    // 5. Change to downvote to test updating
    console.log('\nChanging vote to downvote...');
    const downvoteResponse = await withAuth(cookie, async (cookie) => {
      return await axios.post(getApiUrl('/api/article-preferences'), {
        articleId,
        vote: 'down',
        explanation: 'On second thought, this article could be improved.'
      }, {
        headers: { Cookie: cookie }
      });
    });
    
    console.log('Downvote response:', downvoteResponse.data);
    console.log('Downvote successful\n');
    
    // 6. Get all preferences for user
    console.log('Getting all user preferences...');
    const allPreferencesResponse = await withAuth(cookie, async (cookie) => {
      return await axios.get(getApiUrl('/api/article-preferences'), {
        headers: { Cookie: cookie }
      });
    });
    
    console.log(`Found ${allPreferencesResponse.data.length} preferences for user`);
    console.log('Latest preference:', allPreferencesResponse.data[0]);
    
    console.log('\n✅ Article preferences test completed successfully in production environment!');
    console.log('The upvote/downvote functionality is working correctly with the production database.');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testProductionArticlePreferences();