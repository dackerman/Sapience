import { processNewArticles } from './server/services/backgroundJobs.js';

// Directly test the processNewArticles function
async function testArticleProcessing() {
  try {
    console.log('Manually triggering article processing...');
    await processNewArticles();
    console.log('Article processing completed!');
  } catch (error) {
    console.error('Error processing articles:', error);
  }
}

testArticleProcessing();