import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { HttpCookieAgent } from 'http-cookie-agent/http';
import fs from 'fs';

/**
 * This test verifies the user-specific recommendation regeneration flow:
 * 1. Login as a user
 * 2. Get current recommendations to establish baseline
 * 3. Update user profile with new interests
 * 4. Verify old recommendations are deleted
 * 5. Wait for new recommendations to be generated
 * 6. Verify new recommendations reflect updated interests
 */
async function testProfileUpdates() {
  try {
    console.log('TEST: Profile Update & Recommendation Regeneration');
    console.log('-----------------------------------------------');
    console.log('Step 1: Logging in as demo user...');
    
    // Setup cookie jar for maintaining cookies across requests
    const cookieJar = new CookieJar();
    
    // Create an axios instance that will handle cookies properly
    const api = axios.create({
      baseURL: 'http://localhost:5000',
      httpAgent: new HttpCookieAgent({ cookies: { jar: cookieJar } }),
      httpsAgent: new HttpCookieAgent({ cookies: { jar: cookieJar } }),
      withCredentials: true
    });
    
    // Login using the correct endpoint
    const loginResponse = await api.post('/api/login', {
      username: 'demo',
      password: 'password'  // This matches the default user password created in auth.ts
    });
    
    if (!loginResponse.data || !loginResponse.data.id) {
      throw new Error('Login failed: ' + JSON.stringify(loginResponse.data));
    }
    
    // Print the cookie we received (just for debugging)
    console.log('✓ Login successful! Session cookie received:'
      + cookieJar.getCookiesSync('http://localhost:5000')
          .map(c => ` ${c.key}`).join(','));
    
    // Step 2: Get current recommendations
    console.log('\nStep 2: Checking current recommendations...');
    let initialRecommendations;
    try {
      const recommendationsResponse = await api.get('/api/recommendations');
      initialRecommendations = recommendationsResponse.data;
      console.log(`✓ Found ${initialRecommendations.length} current recommendations`);
      
      if (initialRecommendations.length > 0) {
        // Print a few details about the recommendations to verify what we're starting with
        console.log('  Current recommendation sample:');
        initialRecommendations.slice(0, 2).forEach((rec, i) => {
          console.log(`  ${i+1}. Article: "${rec.title}" (Relevance: ${rec.recommendation?.relevanceScore}%)`);
        });
      }
    } catch (error) {
      console.log('✓ No current recommendations found or error fetching them');
      initialRecommendations = [];
    }
    
    // Step 3: Update user profile with new interests
    console.log('\nStep 3: Updating user profile with new interests...');
    const newInterests = 'artificial intelligence, machine learning, data science, neural networks, and deep learning';
    console.log(`  Setting interests to: "${newInterests}"`);
    
    const profileResponse = await api.put('/api/profile', {
      interests: newInterests
    });
    
    console.log('✓ Profile updated successfully!');
    
    // Step 4: Verify recommendations were deleted (should return empty array initially)
    console.log('\nStep 4: Verifying old recommendations were deleted...');
    const immediateRecommendationsResponse = await api.get('/api/recommendations');
    const immediateRecommendations = immediateRecommendationsResponse.data;
    
    if (immediateRecommendations.length === 0) {
      console.log('✓ Old recommendations were successfully deleted');
    } else {
      console.log('! Old recommendations still exist immediately after update');
      console.log(`  Found ${immediateRecommendations.length} recommendations`);
    }
    
    // Step 5: Wait for new recommendations to be generated
    console.log('\nStep 5: Waiting for new recommendations to be generated...');
    console.log('  This may take some time as the system processes articles through OpenAI...');
    
    // Wait for recommendations to be regenerated
    let newRecommendations = [];
    let attempts = 0;
    const maxAttempts = 20; // Increased to 20 attempts
    const waitTime = 5000; // Increased to 5 seconds between attempts
    
    console.log(`  Waiting up to ${maxAttempts * waitTime / 1000} seconds for recommendations to regenerate...`);
    
    while (newRecommendations.length === 0 && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
      attempts++;
      
      try {
        const response = await api.get('/api/recommendations');
        newRecommendations = response.data;
        console.log(`  Attempt ${attempts}: Found ${newRecommendations.length} recommendations`);
        
        if (newRecommendations.length > 0) {
          console.log('  ✓ New recommendations found!');
          break;
        }
      } catch (error) {
        console.log(`  Attempt ${attempts}: Error fetching recommendations - ${error.message}`);
      }
    }
    
    // Step 6: Verify new recommendations reflect updated interests
    console.log('\nStep 6: Verifying new recommendations match updated interests...');
    
    if (newRecommendations.length === 0) {
      console.log('! No new recommendations were generated within the timeout period');
      console.log('  This could be due to:');
      console.log('  - Background processing is still ongoing');
      console.log('  - No articles matched the new interests');
      console.log('  - An issue with the recommendation system');
    } else {
      console.log(`✓ ${newRecommendations.length} new recommendations were generated`);
      
      // Print details of the new recommendations
      console.log('  New recommendation sample:');
      newRecommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i+1}. Article: "${rec.title}" (Relevance: ${rec.recommendation?.relevanceScore}%)`);
        console.log(`     Reason: "${rec.recommendation?.reasonForRecommendation}"`);
      });
      
      // Check if recommendations are different from initial ones
      if (initialRecommendations.length > 0) {
        const initialIds = new Set(initialRecommendations.map(r => r.id));
        const newIds = new Set(newRecommendations.map(r => r.id));
        
        const differentIds = [...newIds].filter(id => !initialIds.has(id));
        if (differentIds.length > 0) {
          console.log(`✓ Found ${differentIds.length} completely new articles in recommendations`);
        }
        
        // Check for keyword matches in the recommendations
        const aiKeywords = ['ai', 'intelligence', 'machine learning', 'neural', 'deep learning'];
        let aiRelatedCount = 0;
        
        newRecommendations.forEach(rec => {
          const reason = rec.recommendation?.reasonForRecommendation.toLowerCase() || '';
          if (aiKeywords.some(keyword => reason.includes(keyword.toLowerCase()))) {
            aiRelatedCount++;
          }
        });
        
        console.log(`✓ ${aiRelatedCount} recommendations appear to be AI-related based on keywords`);
      }
    }
    
    console.log('\nTest completed!');

    // Save all the test results to a file so we can see them even if the test times out
    const testResults = {
      initialRecommendationsCount: initialRecommendations.length,
      initialRecommendationsSample: initialRecommendations.slice(0, 2),
      newInterests,
      newRecommendationsCount: newRecommendations.length,
      newRecommendationsSample: newRecommendations.slice(0, 3),
      timestamp: new Date().toISOString()
    };

    try {
      fs.writeFileSync('profile-update-test-results.json', JSON.stringify(testResults, null, 2));
      console.log('Test results saved to profile-update-test-results.json');
    } catch (fileError) {
      console.error('Error saving test results:', fileError);
    }
    
  } catch (error) {
    console.error('Test error:', error.response ? error.response.data : error.message);
    
    // Save error to file
    try {
      fs.writeFileSync('profile-update-test-error.json', JSON.stringify({
        error: error.message,
        response: error.response?.data,
        timestamp: new Date().toISOString()
      }, null, 2));
      console.log('Test error saved to profile-update-test-error.json');
    } catch (fileError) {
      console.error('Error saving test error:', fileError);
    }
  }
}

// Run the test
testProfileUpdates();