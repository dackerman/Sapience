import { storage } from '../storage';
import { generateArticleSummary, analyzeArticleRelevance } from './openai';
import { Article, ArticleSummary, InsertArticleSummary, InsertRecommendation } from '@shared/schema';

// Configuration
const BATCH_SIZE = 5; // Number of articles to process in one batch
const MIN_RELEVANCE_SCORE = 50; // Minimum relevance score (out of 100) to recommend an article

/**
 * Background job to process new articles, generate summaries and recommendations
 * This runs on a periodic basis to process articles that haven't been summarized yet
 * 
 * @param specificUserId Optional: If provided, regenerates recommendations only for this user
 * @param forceRegenerate Optional: If true, regenerates summaries for articles with error summaries
 */
export async function processNewArticles(specificUserId?: number, forceRegenerate?: boolean) {
  console.log('Starting processing of new articles...');
  
  try {
    // If forceRegenerate is true, process articles with error summaries
    if (forceRegenerate) {
      console.log('Force regenerate flag is set - looking for articles with error summaries');
      const articlesWithErrorSummaries = await storage.getArticlesWithErrorSummaries();
      console.log(`Found ${articlesWithErrorSummaries.length} articles with error summaries to regenerate`);
      
      if (articlesWithErrorSummaries.length > 0) {
        for (const article of articlesWithErrorSummaries) {
          try {
            console.log(`Regenerating summary for article ${article.id}: ${article.title}`);
            
            // Prepare the content to summarize (preferring description over full content as it's more concise)
            const contentToSummarize = article.description || article.content || '';
            
            if (!contentToSummarize) {
              console.log(`Skipping article ${article.id} - no content to summarize`);
              continue;
            }
            
            // Generate a new summary
            const { summary, keywords } = await generateArticleSummary(
              article.title,
              contentToSummarize
            );
            
            // Save summary to database (this will update the existing summary)
            const articleSummary: InsertArticleSummary = {
              articleId: article.id,
              summary,
              keywords
            };
            
            const savedSummary = await storage.createArticleSummary(articleSummary);
            console.log(`Regenerated summary for article ${article.id}`);
          } catch (error) {
            console.error(`Error regenerating summary for article ${article.id}:`, error);
          }
        }
        
        console.log('Completed regenerating article summaries');
      }
    }
    // Step 1: Determine which user(s) to process
    // If a specific user ID is provided, use that user
    // Otherwise fall back to the default user for general processing
    
    let targetUsers = [];
    
    if (specificUserId) {
      const specificUser = await storage.getUser(specificUserId);
      if (specificUser) {
        const userProfile = await storage.getUserProfile(specificUserId);
        if (userProfile) {
          console.log(`Using specific user ${specificUserId} for recommendation processing`);
          targetUsers.push({ user: specificUser, profile: userProfile });
        } else {
          console.log(`No profile found for specific user ${specificUserId}, skipping`);
        }
      } else {
        console.log(`Specific user ${specificUserId} not found, falling back to default user`);
      }
    }
    
    // Always include default user if no specific user is given or if we couldn't find the specific user
    if (targetUsers.length === 0) {
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
      
      targetUsers.push({ user: defaultUser, profile: userProfile });
    }
    
    // Step 2: Get unprocessed articles (articles without summaries)
    const unprocessedArticles = await storage.getUnprocessedArticles(BATCH_SIZE);
    console.log(`Found ${unprocessedArticles.length} unprocessed articles`);
    
    if (unprocessedArticles.length === 0) {
      console.log('No new articles to process, checking for existing article summaries to generate recommendations');
      
      // For each target user, check if we need to generate recommendations
      for (const { user, profile } of targetUsers) {
        // Get article summaries and check if this user has recommendations
        const articleSummaries = await storage.getArticleSummaries();
        const recommendations = await storage.getRecommendations(user.id);
        
        if (articleSummaries.length > 0) {
          if (specificUserId) {
            // If processing a specific user, always regenerate their recommendations
            console.log(`Regenerating recommendations for user ${user.id} - profile update triggered`);
            
            // Get the latest profile to ensure we're using the most up-to-date interests
            const latestProfile = await storage.getUserProfile(user.id);
            if (!latestProfile) {
              console.log(`No profile found for user ${user.id}, skipping recommendation generation`);
              continue;
            }
            
            // Generate recommendations for all summaries for this specific user
            for (const summary of articleSummaries) {
              try {
                await generateRecommendationForSummary(summary, user.id, latestProfile.interests);
              } catch (error) {
                console.error(`Error generating recommendation for summary ${summary.id}:`, error);
              }
            }
            
            console.log(`Finished regenerating recommendations for user ${user.id}`);
          } 
          else if (recommendations.length === 0) {
            // For regular scheduled jobs, only generate if no recommendations exist
            console.log(`Found ${articleSummaries.length} existing article summaries with no recommendations for user ${user.id}`);
            
            // Get the latest profile to ensure we're using the most up-to-date interests
            const latestProfile = await storage.getUserProfile(user.id);
            if (!latestProfile) {
              console.log(`No profile found for user ${user.id}, skipping recommendation generation`);
              continue;
            }
            
            // Generate recommendations for existing summaries
            for (const summary of articleSummaries) {
              try {
                await generateRecommendationForSummary(summary, user.id, latestProfile.interests);
              } catch (error) {
                console.error(`Error generating recommendation for summary ${summary.id}:`, error);
              }
            }
            
            console.log(`Finished generating recommendations for user ${user.id}`);
          }
          else {
            console.log(`User ${user.id} already has recommendations, skipping generation`);
          }
        } else {
          console.log("No article summaries found to generate recommendations from");
        }
      }
      
      return;
    }
    
    // Step 3: For each article, generate a summary and recommendations for all target users
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
        
        // Step 4: For each user, analyze if this article is relevant to their interests
        for (const { user, profile } of targetUsers) {
          console.log(`Analyzing article relevance for user ${user.id}`);
          
          // Get the latest profile to ensure we're using the most up-to-date interests
          const latestProfile = await storage.getUserProfile(user.id);
          if (!latestProfile) {
            console.log(`No profile found for user ${user.id}, skipping recommendation generation`);
            continue;
          }
          
          // Analyze if this article is relevant to the user's interests
          const { isRelevant, relevanceScore, reason } = await analyzeArticleRelevance(
            latestProfile.interests,
            article.title,
            summary,
            keywords
          );
          
          // If it's relevant, save as a recommendation
          if (isRelevant && relevanceScore >= MIN_RELEVANCE_SCORE) {
            const recommendation: InsertRecommendation = {
              userId: user.id,
              articleId: article.id,
              relevanceScore,
              reasonForRecommendation: reason
            };
            
            await storage.createRecommendation(recommendation);
            console.log(`Created recommendation for article ${article.id} with score ${relevanceScore} for user ${user.id}`);
          } else {
            console.log(`Article ${article.id} not relevant enough for user ${user.id} (score: ${relevanceScore})`);
          }
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