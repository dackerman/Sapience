/**
 * Article Preferences Test Script
 *
 * This script tests the article preferences functionality including:
 * - Upvoting and downvoting articles with explanations
 * - Retrieving article preferences
 * - Updating existing preferences
 * 
 * Note: Make sure to run the database migration first with 'npm run db:push'
 */

import axios from 'axios';
import { config } from 'dotenv';

config();

// Helper functions
const API_URL = 'http://localhost:5000';

async function login(username, password) {
  try {
    const response = await axios.post(`${API_URL}/api/login`, {
      username,
      password
    });
    
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function withAuth(token, callback) {
  return callback(axios.create({
    headers: {
      Cookie: token
    }
  }));
}

async function testArticlePreferences() {
  console.log('Starting article preferences tests...');
  
  try {
    // Step 1: Create test users and login
    console.log('Logging in as test user...');
    const authResponse = await login('testuser', 'password123');
    const authCookie = authResponse.sessionCookie;
    
    // Step 2: Get available articles to test with
    console.log('Fetching articles to test with...');
    const articlesResponse = await withAuth(authCookie, async (client) => {
      return client.get(`${API_URL}/api/articles`);
    });
    
    if (!articlesResponse.data || articlesResponse.data.length === 0) {
      throw new Error('No articles available for testing');
    }
    
    const testArticle = articlesResponse.data[0];
    console.log(`Using article "${testArticle.title}" (ID: ${testArticle.id}) for testing`);
    
    // Step 3: Test upvoting an article with explanation
    console.log('Testing upvote with explanation...');
    await withAuth(authCookie, async (client) => {
      const upvoteResponse = await client.post(`${API_URL}/api/articles/${testArticle.id}/action`, {
        operation: 'upvote',
        explanation: 'This was very informative and well-written'
      });
      
      console.log('Upvote response status:', upvoteResponse.status);
      console.log('Article has preference data:', !!upvoteResponse.data.preference);
      
      if (!upvoteResponse.data.preference || upvoteResponse.data.preference.preference !== 'upvote') {
        throw new Error('Upvote operation failed or returned incorrect data');
      }
      
      console.log('✅ Upvote test passed');
      return upvoteResponse.data;
    });
    
    // Step 4: Test retrieving article preference
    console.log('Testing article preference retrieval...');
    await withAuth(authCookie, async (client) => {
      const preferenceResponse = await client.get(`${API_URL}/api/articles/${testArticle.id}/preference`);
      
      console.log('Preference response status:', preferenceResponse.status);
      console.log('Preference data exists:', !!preferenceResponse.data);
      
      if (!preferenceResponse.data || preferenceResponse.data.preference !== 'upvote') {
        throw new Error('Preference retrieval failed or returned incorrect data');
      }
      
      console.log('✅ Preference retrieval test passed');
      return preferenceResponse.data;
    });
    
    // Step 5: Test changing preference to downvote
    console.log('Testing changing preference to downvote...');
    await withAuth(authCookie, async (client) => {
      const downvoteResponse = await client.post(`${API_URL}/api/articles/${testArticle.id}/action`, {
        operation: 'downvote',
        explanation: 'On second thought, this article was misleading'
      });
      
      console.log('Downvote response status:', downvoteResponse.status);
      console.log('Article has updated preference:', !!downvoteResponse.data.preference);
      
      if (!downvoteResponse.data.preference || downvoteResponse.data.preference.preference !== 'downvote') {
        throw new Error('Downvote operation failed or returned incorrect data');
      }
      
      console.log('✅ Change preference test passed');
      return downvoteResponse.data;
    });
    
    // Step 6: Test retrieving all user preferences
    console.log('Testing retrieval of all user preferences...');
    await withAuth(authCookie, async (client) => {
      const allPreferencesResponse = await client.get(`${API_URL}/api/article-preferences`);
      
      console.log('All preferences response status:', allPreferencesResponse.status);
      console.log('Number of preferences found:', allPreferencesResponse.data.length);
      
      if (!Array.isArray(allPreferencesResponse.data) || allPreferencesResponse.data.length === 0) {
        throw new Error('User preferences retrieval failed or returned empty array');
      }
      
      console.log('✅ All preferences retrieval test passed');
      return allPreferencesResponse.data;
    });
    
    console.log('All article preference tests completed successfully! 🎉');
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    throw error;
  }
}

// Run the tests
testArticlePreferences()
  .then(() => {
    console.log('Tests completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Tests failed:', error);
    process.exit(1);
  });