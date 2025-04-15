import axios from 'axios';

// This file can be run directly with: npx tsx server/test-content-fetch.ts

async function testContentFetching() {
  try {
    console.log('Testing article content fetching...');
    
    // 1. Get all feeds to find a feed ID
    console.log('\n1. Fetching all feeds:');
    const feedsResponse = await axios.get('http://localhost:5000/api/feeds');
    const feeds = feedsResponse.data;
    console.log(`Received ${feeds.length} feeds`);
    
    if (feeds.length === 0) {
      console.error('No feeds found. Please add feeds to test content fetching.');
      return;
    }
    
    const feedId = feeds[0].id;
    console.log(`Using feed ID: ${feedId} (${feeds[0].title})`);
    
    // 2. Get articles for this feed
    console.log('\n2. Fetching articles for this feed:');
    const articlesResponse = await axios.get(`http://localhost:5000/api/articles?feedId=${feedId}`);
    const articles = articlesResponse.data;
    console.log(`Received ${articles.length} articles`);
    
    if (articles.length === 0) {
      console.error('No articles found for this feed. Please select a different feed or add articles.');
      return;
    }
    
    const articleId = articles[0].id;
    console.log(`Using article ID: ${articleId} (${articles[0].title})`);
    console.log(`Article link: ${articles[0].link}`);
    console.log(`Current article content length: ${articles[0].content ? articles[0].content.length : 0} characters`);
    
    // 3. Test single article content endpoint
    console.log('\n3. Testing single article content endpoint:');
    try {
      const contentResponse = await axios.get(`http://localhost:5000/api/articles/${articleId}/content`);
      const content = contentResponse.data;
      console.log(`Content fetch successful. Content length: ${content.content ? content.content.length : 0} characters`);
      console.log('Content excerpt:');
      console.log(content.content ? content.content.substring(0, 200) + '...' : 'No content');
    } catch (error) {
      console.error('Error fetching content for single article:');
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Message: ${JSON.stringify(error.response.data)}`);
      } else {
        console.error(error.message);
      }
    }
    
    // 4. Test feed contents endpoint
    console.log('\n4. Testing feed contents endpoint:');
    try {
      const feedContentResponse = await axios.get(`http://localhost:5000/api/feeds/${feedId}/contents`);
      const feedContent = feedContentResponse.data;
      console.log(`Feed content fetch successful. Received ${feedContent.articles.length} articles with content`);
      
      // Log content status for each article
      console.log('\nContent status for articles:');
      feedContent.articles.forEach((article, index) => {
        console.log(`${index + 1}. Article ID ${article.id}: ${article.hasFullContent ? 'Has content' : 'No content'}`);
        console.log(`   Content length: ${article.content ? article.content.length : 0} characters`);
        if (article.content) {
          console.log(`   First 100 chars: ${article.content.substring(0, 100).replace(/\n/g, ' ')}...`);
        }
      });
    } catch (error) {
      console.error('Error fetching content for feed:');
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Message: ${JSON.stringify(error.response.data)}`);
      } else {
        console.error(error.message);
      }
    }
    
    console.log('\nTest completed.');
  } catch (error) {
    console.error('Unexpected error during testing:');
    console.error(error);
  }
}

// Run the test
testContentFetching();