/**
 * MemStorage Article Preferences Test
 *
 * This script tests the in-memory implementation of article preferences storage
 * to ensure the core functionality works consistently across storage implementations.
 */

import { MemStorage } from './server/storage.js';

async function testMemStoragePreferences() {
  console.log('Starting MemStorage article preferences tests...');
  
  // Create a new instance of MemStorage for testing
  const memStorage = new MemStorage();
  
  try {
    // Step 1: Create test data
    console.log('Setting up test data...');
    
    // Create a test user
    const testUser = await memStorage.createUser({
      username: 'memtest_user',
      email: 'memtest@example.com',
      password: 'password_hash'
    });
    console.log('Test user created with ID:', testUser.id);
    
    // Create a test category
    const testCategory = await memStorage.createCategory({
      name: 'Test Category'
    });
    console.log('Test category created with ID:', testCategory.id);
    
    // Create a test feed
    const testFeed = await memStorage.createFeed({
      url: 'https://example.com/feed',
      categoryId: testCategory.id
    }, 'Test Feed', 'A test feed for article preferences', 'https://example.com/favicon.ico');
    console.log('Test feed created with ID:', testFeed.id);
    
    // Create a test article
    const testArticle = await memStorage.createArticle({
      feedId: testFeed.id,
      title: 'Test Article for Preferences',
      link: 'https://example.com/test-article',
      description: 'This is a test article to test article preferences functionality',
      pubDate: new Date(),
      guid: 'test-article-guid-' + Date.now()
    });
    console.log('Test article created with ID:', testArticle.id);
    
    // Step 2: Test creating an article preference (upvote)
    console.log('\nTesting createArticlePreference (upvote)...');
    const upvotePreference = await memStorage.createArticlePreference({
      userId: testUser.id,
      articleId: testArticle.id,
      preference: 'upvote',
      explanation: 'This is an excellent article with valuable information'
    });
    
    console.log('Upvote preference created:');
    console.log(JSON.stringify(upvotePreference, null, 2));
    
    if (upvotePreference.preference !== 'upvote') {
      throw new Error('Upvote preference not created correctly');
    }
    console.log('✅ createArticlePreference (upvote) test passed');
    
    // Step 3: Test retrieving the article preference
    console.log('\nTesting getArticlePreference...');
    const retrievedPreference = await memStorage.getArticlePreference(testUser.id, testArticle.id);
    
    console.log('Retrieved preference:');
    console.log(JSON.stringify(retrievedPreference, null, 2));
    
    if (!retrievedPreference || retrievedPreference.preference !== 'upvote') {
      throw new Error('Failed to retrieve article preference correctly');
    }
    console.log('✅ getArticlePreference test passed');
    
    // Step 4: Test updating an existing preference (change to downvote)
    console.log('\nTesting updateArticlePreference (changing to downvote)...');
    const updatedPreference = await memStorage.updateArticlePreference(retrievedPreference.id, {
      preference: 'downvote',
      explanation: 'On further reflection, this article contains misleading information'
    });
    
    console.log('Updated preference:');
    console.log(JSON.stringify(updatedPreference, null, 2));
    
    if (!updatedPreference || updatedPreference.preference !== 'downvote') {
      throw new Error('Failed to update article preference correctly');
    }
    console.log('✅ updateArticlePreference test passed');
    
    // Step 5: Test retrieving all user preferences
    console.log('\nTesting getUserArticlePreferences...');
    const userPreferences = await memStorage.getUserArticlePreferences(testUser.id);
    
    console.log(`Retrieved ${userPreferences.length} user preferences`);
    if (!Array.isArray(userPreferences) || userPreferences.length === 0) {
      throw new Error('Failed to retrieve user article preferences');
    }
    console.log('✅ getUserArticlePreferences test passed');
    
    // Step 6: Test with a second article to verify multiple preferences
    console.log('\nTesting multiple article preferences...');
    
    // Create a second test article
    const testArticle2 = await memStorage.createArticle({
      feedId: testFeed.id,
      title: 'Second Test Article',
      link: 'https://example.com/second-test-article',
      description: 'This is a second test article',
      pubDate: new Date(),
      guid: 'test-article-guid-2-' + Date.now()
    });
    console.log('Second test article created with ID:', testArticle2.id);
    
    // Create a preference for the second article
    const secondPreference = await memStorage.createArticlePreference({
      userId: testUser.id,
      articleId: testArticle2.id,
      preference: 'upvote',
      explanation: 'This second article is also good'
    });
    console.log('Second preference created with ID:', secondPreference.id);
    
    // Retrieve all user preferences again to verify we have two
    const updatedUserPreferences = await memStorage.getUserArticlePreferences(testUser.id);
    console.log(`Now retrieved ${updatedUserPreferences.length} user preferences`);
    
    if (updatedUserPreferences.length !== 2) {
      throw new Error(`Expected 2 preferences, got ${updatedUserPreferences.length}`);
    }
    console.log('✅ Multiple preferences test passed');
    
    console.log('\nAll MemStorage article preference tests completed successfully! 🎉');
    
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

// Run the tests
testMemStoragePreferences()
  .then(() => {
    console.log('Tests completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Tests failed:', error);
    process.exit(1);
  });