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
      console.log('No new articles to process, checking for existing article summaries to generate recommendations');
      
      // For our test - even if there are no new articles, we should regenerate recommendations
      // based on existing article summaries if there are no recommendations
      const articleSummaries = await storage.getArticleSummaries();
      const recommendations = await storage.getRecommendations();
      
      if (articleSummaries.length > 0 && recommendations.length === 0) {
        console.log(`Found ${articleSummaries.length} existing article summaries with no recommendations`);
        
        // Generate recommendations for existing summaries
        for (const summary of articleSummaries) {
          try {
            await generateRecommendationForSummary(summary, userProfile.interests);
          } catch (error) {
            console.error(`Error generating recommendation for summary ${summary.id}:`, error);
          }
        }
        
        console.log("Finished regenerating recommendations for existing summaries");
        return;
      }
      
      console.log("No action needed - either no summaries or recommendations already exist");
      return;
    }
    
    // Step 3: For each article, generate a summary
    for (const article of unprocessedArticles) {
      try {
        console.log(`Processing article: ${article.title}`);
        
        // Prepare the content to summarize (preferring description over full content as it's more concise)
        // If we have both, use description as it's usually more focused and shorter
        const contentToSummarize = article.description || article.content || '';
        
        if (!contentToSummarize) {
          console.log(`Skipping article ${article.id} - no content to summarize`);
          continue;
        }
        
        // Generate summary - the generateArticleSummary function now handles
        // content truncation and HTML extraction internally
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
 * Helper function to generate a recommendation for an existing article summary
 * This is used when regenerating recommendations after a user profile update
 */
async function generateRecommendationForSummary(summary: ArticleSummary, userId: number, userInterests: string) {
  // First get the article to access the title
  const article = await storage.getArticleById(summary.articleId);
  
  if (!article) {
    console.log(`Cannot generate recommendation - article ${summary.articleId} not found`);
    return;
  }
  
  console.log(`Analyzing relevance for article: ${article.title}`);
  
  // Analyze if this article is relevant to the user's updated interests
  const { isRelevant, relevanceScore, reason } = await analyzeArticleRelevance(
    userInterests,
    article.title,
    summary.summary,
    Array.isArray(summary.keywords) ? summary.keywords : []
  );
  
  // If it's relevant, save as a recommendation
  if (isRelevant && relevanceScore >= MIN_RELEVANCE_SCORE) {
    const recommendation: InsertRecommendation = {
      userId,
      articleId: article.id,
      relevanceScore,
      reasonForRecommendation: reason
    };
    
    await storage.createRecommendation(recommendation);
    console.log(`Created recommendation for article ${article.id} with score ${relevanceScore} for user ${userId}`);
  } else {
    console.log(`Article ${article.id} not relevant enough (score: ${relevanceScore})`);
  }
}

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