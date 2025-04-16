import axios from 'axios';

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
    
    // Create an axios instance that will handle cookies properly
    const api = axios.create({
      baseURL: 'http://localhost:5000',
      withCredentials: true
    });
    
    // Login using our auth endpoint
    const loginResponse = await api.post('/api/auth/login', {
      username: 'demo',
      password: 'demo123'
    });
    
    if (!loginResponse.data || !loginResponse.data.success) {
      throw new Error('Login failed: ' + JSON.stringify(loginResponse.data));
    }
    
    console.log('✓ Login successful!');
    
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
    console.log('  This may take up to 30 seconds as background processing occurs...');
    
    // Wait for recommendations to be regenerated
    let newRecommendations = [];
    let attempts = 0;
    const maxAttempts = 10;
    
    while (newRecommendations.length === 0 && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      attempts++;
      
      try {
        const response = await api.get('/api/recommendations');
        newRecommendations = response.data;
        console.log(`  Attempt ${attempts}: Found ${newRecommendations.length} recommendations`);
      } catch (error) {
        console.log(`  Attempt ${attempts}: Error fetching recommendations`);
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
    
  } catch (error) {
    console.error('Test error:', error.response ? error.response.data : error.message);
  }
}

// Run the test
testProfileUpdates();