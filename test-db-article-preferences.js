/**
 * Database Storage Article Preferences Test
 *
 * This script directly tests the DatabaseStorage article preference methods without relying on API
 * routes to ensure the core storage functionality works as expected.
 * 
 * Note: Make sure to run the database migration first with 'npm run db:push'
 */

import { db } from './server/db.ts';
import { storage } from './server/storage.ts';
import { config } from 'dotenv';

config();

async function testDatabaseStoragePreferences() {
  console.log('Starting database storage article preferences tests...');
  
  try {
    // Step 1: Ensure we have a test user and article
    console.log('Checking for test user and article...');
    const testUsername = 'dbtest_user';
    const testEmail = 'dbtest@example.com';
    
    // Create test user if doesn't exist
    let testUser = await storage.getUserByUsername(testUsername);
    if (!testUser) {
      console.log('Creating test user...');
      testUser = await storage.createUser({
        username: testUsername,
        email: testEmail,
        password: 'secure_password_hash'
      });
      console.log('Test user created with ID:', testUser.id);
    } else {
      console.log('Using existing test user with ID:', testUser.id);
    }

    // Get an article to test with
    const articles = await storage.getArticles();
    if (!articles || articles.length === 0) {
      throw new Error('No articles available for testing');
    }
    
    const testArticle = articles[0];
    console.log(`Using article "${testArticle.title}" (ID: ${testArticle.id}) for testing`);
    
    // Step 2: Test creating an article preference (upvote)
    console.log('\nTesting createArticlePreference (upvote)...');
    const upvotePreference = await storage.createArticlePreference({
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
    const retrievedPreference = await storage.getArticlePreference(testUser.id, testArticle.id);
    
    console.log('Retrieved preference:');
    console.log(JSON.stringify(retrievedPreference, null, 2));
    
    if (!retrievedPreference || retrievedPreference.preference !== 'upvote') {
      throw new Error('Failed to retrieve article preference correctly');
    }
    console.log('✅ getArticlePreference test passed');
    
    // Step 4: Test updating an existing preference (change to downvote)
    console.log('\nTesting updateArticlePreference (changing to downvote)...');
    const updatedPreference = await storage.updateArticlePreference(retrievedPreference.id, {
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
    const userPreferences = await storage.getUserArticlePreferences(testUser.id);
    
    console.log(`Retrieved ${userPreferences.length} user preferences`);
    if (!Array.isArray(userPreferences) || userPreferences.length === 0) {
      throw new Error('Failed to retrieve user article preferences');
    }
    console.log('✅ getUserArticlePreferences test passed');
    
    console.log('\nAll database storage article preference tests completed successfully! 🎉');
    
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    // Close database connection
    await db.end();
  }
}

// Run the tests
testDatabaseStoragePreferences()
  .then(() => {
    console.log('Tests completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Tests failed:', error);
    process.exit(1);
  });