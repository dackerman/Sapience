import { storage } from '../storage';
import { generateArticleSummary, analyzeArticleRelevance } from './openai';
import { Article, ArticleSummary, InsertArticleSummary, InsertRecommendation } from '@shared/schema';

// Configuration
const BATCH_SIZE = 5; // Number of articles to process in one batch
const MIN_RELEVANCE_SCORE = 50; // Minimum relevance score (out of 100) to recommend an article

/**
 * Background job to process new articles, generate summaries and recommendations
 * This runs on a periodic basis to process articles that haven't been summarized yet
 */
export async function processNewArticles() {
  console.log('Starting processing of new articles...');
  
  try {
    // Step 1: Check if we have any users in the system
    // Create a default user if none exists
    let defaultUser = await storage.getUserByUsername('defaultuser');
    
    if (!defaultUser) {
      console.log('No default user found, creating one');
      defaultUser = await storage.createUser({
        username: 'defaultuser',
        email: 'default@example.com',
        password: 'defaultpassword123'  // In a real app, this would be properly hashed
      });
    }
    
    // Get user profile for the default user
    let userProfile = await storage.getUserProfile(defaultUser.id);
    
    if (!userProfile) {
      console.log('No user profile found, creating default profile');
      userProfile = await storage.createUserProfile({
        userId: defaultUser.id,
        interests: 'General technology news, programming, science, and current events.'
      });
    }
    
    // Step 2: Get unprocessed articles (articles without summaries)
    const unprocessedArticles = await storage.getUnprocessedArticles(BATCH_SIZE);
    console.log(`Found ${unprocessedArticles.length} unprocessed articles`);
    
    if (unprocessedArticles.length === 0) {
      console.log('No new articles to process');
      return;
    }
    
    // Step 3: For each article, generate a summary
    for (const article of unprocessedArticles) {
      try {
        console.log(`Processing article: ${article.title}`);
        
        // Prepare the content to summarize (using description or content)
        const contentToSummarize = article.content || article.description || '';
        
        if (!contentToSummarize) {
          console.log(`Skipping article ${article.id} - no content to summarize`);
          continue;
        }
        
        // Generate summary
        const { summary, keywords } = await generateArticleSummary(
          article.title,
          contentToSummarize
        );
        
        // Save summary to database
        const articleSummary: InsertArticleSummary = {
          articleId: article.id,
          summary,
          keywords
        };
        
        const savedSummary = await storage.createArticleSummary(articleSummary);
        console.log(`Created summary for article ${article.id}`);
        
        // Step 4: Analyze if this article is relevant to the user's interests
        const { isRelevant, relevanceScore, reason } = await analyzeArticleRelevance(
          userProfile.interests,
          article.title,
          summary,
          keywords
        );
        
        // If it's relevant, save as a recommendation
        if (isRelevant && relevanceScore >= MIN_RELEVANCE_SCORE) {
          const recommendation: InsertRecommendation = {
            articleId: article.id,
            relevanceScore,
            reasonForRecommendation: reason
          };
          
          await storage.createRecommendation(recommendation);
          console.log(`Created recommendation for article ${article.id} with score ${relevanceScore}`);
        } else {
          console.log(`Article ${article.id} not relevant enough (score: ${relevanceScore})`);
        }
      } catch (error) {
        console.error(`Error processing article ${article.id}:`, error);
        // Continue with the next article
      }
    }
    
    console.log('Completed processing of new articles');
  } catch (error) {
    console.error('Error in processNewArticles job:', error);
  }
}

/**
 * Start all background jobs
 * This should be called when the server starts
 */
export function startBackgroundJobs() {
  // Process new articles every 10 minutes
  const articleProcessingIntervalMs = 10 * 60 * 1000;
  
  console.log('Starting background jobs...');
  
  // Immediately process any pending articles
  processNewArticles().catch(error => {
    console.error('Error in initial article processing:', error);
  });
  
  // Then set up recurring jobs
  setInterval(() => {
    processNewArticles().catch(error => {
      console.error('Error in scheduled article processing:', error);
    });
  }, articleProcessingIntervalMs);
  
  console.log(`Background jobs started - article processing will run every ${articleProcessingIntervalMs / 60000} minutes`);
}