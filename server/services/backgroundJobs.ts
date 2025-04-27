import { storage } from '../storage';
import { 
  generateArticleSummary, 
  analyzeArticleRelevance, 
  rescoreArticleWithUserFeedback,
  updateUserInterestsFromPreferences
} from './openai';
import { 
  Article, 
  ArticleSummary, 
  InsertArticleSummary, 
  InsertRecommendation,
  ArticlePreference
} from '@shared/schema';
import Parser from 'rss-parser';
import axios from 'axios';

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
/**
 * Process a new article vote and rescore recommendations
 * This function is called when a user votes on an article
 * It rescores the article for this user and updates recommendations
 * 
 * @param userId The user who voted
 * @param articleId The article that was voted on
 * @param preference The preference (upvote/downvote) and explanation
 */
export async function processArticleVote(
  userId: number, 
  articleId: number, 
  preference: ArticlePreference
): Promise<void> {
  try {
    console.log(`Processing vote from user ${userId} for article ${articleId}: ${preference.preference}`);
    
    // Step 1: Get user profile
    const userProfile = await storage.getUserProfile(userId);
    if (!userProfile) {
      console.log(`No profile found for user ${userId}, skipping vote processing`);
      return;
    }
    
    // Step 2: Get the article and its summary
    const article = await storage.getArticleById(articleId);
    if (!article) {
      console.log(`Article ${articleId} not found, skipping vote processing`);
      return;
    }
    
    const articleSummary = await storage.getArticleSummary(articleId);
    
    // Step 3: Check if there's an existing recommendation for this article
    const existingRecommendation = await storage.getRecommendationForArticle(userId, articleId);
    
    // Step 4: Rescore the article based on user feedback
    console.log(`Rescoring article based on user feedback: ${preference.explanation || 'No explanation provided'}`);
    const { isRelevant, relevanceScore, reason } = await rescoreArticleWithUserFeedback(
      userProfile.interests,
      article.title,
      articleSummary,
      preference,
      existingRecommendation
    );
    
    // Step 5: Update or create recommendation based on new score
    if (isRelevant && relevanceScore >= MIN_RELEVANCE_SCORE) {
      const recommendationData: InsertRecommendation = {
        userId: userId,
        articleId: articleId,
        relevanceScore: relevanceScore,
        reasonForRecommendation: reason
      };
      
      if (existingRecommendation) {
        // Update existing recommendation
        await storage.updateRecommendation(existingRecommendation.id, recommendationData);
        console.log(`Updated recommendation for article ${articleId} with new score ${relevanceScore}`);
      } else {
        // Create new recommendation
        await storage.createRecommendation(recommendationData);
        console.log(`Created new recommendation for article ${articleId} with score ${relevanceScore}`);
      }
    } else if (existingRecommendation) {
      // Article is no longer relevant, remove recommendation
      await storage.deleteRecommendation(existingRecommendation.id);
      console.log(`Removed recommendation for article ${articleId} as it's no longer relevant (score: ${relevanceScore})`);
    }
    
    // Step 6: Rescore 20 most recent articles to update recommendations
    await rescoreRecentArticles(userId, userProfile.interests, articleId);
    
    // Step 7: Update user profile based on all their preferences
    await updateUserProfileFromPreferences(userId, userProfile);
    
  } catch (error) {
    console.error(`Error processing article vote:`, error);
  }
}

/**
 * Rescore recent articles based on updated user preferences
 */
async function rescoreRecentArticles(userId: number, userInterests: string, excludeArticleId: number): Promise<void> {
  try {
    // Get 20 most recent articles (excluding the one just voted on)
    // We limit to 20 to avoid making too many API calls
    const recentArticles = await storage.getArticles();
    const articlesToRescore = recentArticles
      .filter(article => article.id !== excludeArticleId)
      .sort((a, b) => {
        // Sort by publication date, newest first
        const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 20);
    
    console.log(`Rescoring ${articlesToRescore.length} recent articles for user ${userId}`);
    
    for (const article of articlesToRescore) {
      // Get article summary
      const summary = await storage.getArticleSummary(article.id);
      if (!summary) {
        console.log(`No summary found for article ${article.id}, skipping rescore`);
        continue;
      }
      
      // Check if user has provided feedback on this article
      const preference = await storage.getArticlePreference(userId, article.id);
      
      // Get existing recommendation if any
      const existingRecommendation = await storage.getRecommendationForArticle(userId, article.id);
      
      // Calculate article relevance (with or without user feedback)
      let relevanceResult;
      
      if (preference) {
        // If user has provided feedback, use it to rescore
        relevanceResult = await rescoreArticleWithUserFeedback(
          userInterests,
          article.title,
          summary,
          preference,
          existingRecommendation
        );
        console.log(`Rescored article ${article.id} with user feedback: ${relevanceResult.relevanceScore}`);
      } else {
        // Standard relevance scoring
        relevanceResult = await analyzeArticleRelevance(
          userInterests,
          article.title,
          summary.summary,
          Array.isArray(summary.keywords) ? summary.keywords : []
        );
        console.log(`Rescored article ${article.id} without feedback: ${relevanceResult.relevanceScore}`);
      }
      
      // Update or create recommendation based on new relevance score
      if (relevanceResult.isRelevant && relevanceResult.relevanceScore >= MIN_RELEVANCE_SCORE) {
        const recommendationData: InsertRecommendation = {
          userId: userId,
          articleId: article.id,
          relevanceScore: relevanceResult.relevanceScore,
          reasonForRecommendation: relevanceResult.reason
        };
        
        if (existingRecommendation) {
          // Update existing recommendation
          await storage.updateRecommendation(existingRecommendation.id, recommendationData);
        } else {
          // Create new recommendation
          await storage.createRecommendation(recommendationData);
        }
      } else if (existingRecommendation) {
        // Article is no longer relevant, remove recommendation
        await storage.deleteRecommendation(existingRecommendation.id);
      }
    }
    
    console.log(`Completed rescoring recent articles for user ${userId}`);
  } catch (error) {
    console.error('Error rescoring recent articles:', error);
  }
}

/**
 * Update user profile based on their article preferences
 */
async function updateUserProfileFromPreferences(userId: number, currentProfile: any): Promise<void> {
  try {
    // Get user's article preferences
    const preferences = await storage.getUserArticlePreferences(userId);
    
    if (preferences.length === 0) {
      console.log(`No preferences found for user ${userId}, skipping profile update`);
      return;
    }
    
    console.log(`Updating user profile based on ${preferences.length} article preferences`);
    
    // Get articles for these preferences to access their titles
    const preferencesWithDetails = await Promise.all(
      preferences.map(async pref => {
        const article = await storage.getArticleById(pref.articleId);
        return {
          articleTitle: article ? article.title : `Article ${pref.articleId}`,
          preference: pref.preference,
          explanation: pref.explanation
        };
      })
    );
    
    // Update user interests based on preferences
    const updatedInterests = await updateUserInterestsFromPreferences(
      currentProfile.interests,
      preferencesWithDetails
    );
    
    // Update the user profile with new interests
    await storage.updateUserProfile(userId, { interests: updatedInterests });
    console.log(`Updated interests profile for user ${userId}`);
    
  } catch (error) {
    console.error('Error updating user profile from preferences:', error);
  }
}

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
          else {
            // Check if there are new article summaries that don't have recommendations for this user
            console.log(`Checking for new articles without recommendations for user ${user.id}...`);
            
            const existingRecommendationArticleIds = recommendations.map(r => r.articleId);
            const articlesWithoutRecommendations = articleSummaries.filter(
              summary => !existingRecommendationArticleIds.includes(summary.articleId)
            );
            
            if (articlesWithoutRecommendations.length > 0) {
              console.log(`Found ${articlesWithoutRecommendations.length} new articles without recommendations for user ${user.id}`);
              
              // Get the latest profile to ensure we're using the most up-to-date interests
              const latestProfile = await storage.getUserProfile(user.id);
              if (!latestProfile) {
                console.log(`No profile found for user ${user.id}, skipping recommendation generation`);
                continue;
              }
              
              // Generate recommendations only for articles that don't have recommendations yet
              for (const summary of articlesWithoutRecommendations) {
                try {
                  console.log(`Generating recommendation for new article ${summary.articleId} for user ${user.id}`);
                  await generateRecommendationForSummary(summary, user.id, latestProfile.interests);
                } catch (error) {
                  console.error(`Error generating recommendation for summary ${summary.id}:`, error);
                }
              }
              
              console.log(`Finished generating recommendations for new articles for user ${user.id}`);
            } else {
              console.log(`No new articles found without recommendations for user ${user.id}, skipping generation`);
            }
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

/**
 * Refreshes all feeds with autoRefresh enabled
 * Fetches the latest articles from each feed source
 */
export async function refreshAllFeeds() {
  console.log('Starting to refresh all active feeds...');
  
  try {
    // Get all feeds with autoRefresh enabled
    const feeds = await storage.getFeeds();
    // Treat all feeds as auto-refresh enabled by default (null or undefined is treated as true)
    const autoRefreshFeeds = feeds.filter(feed => feed.autoRefresh !== false);
    
    console.log(`Found ${autoRefreshFeeds.length} feeds with auto-refresh enabled`);
    
    // Initialize RSS parser
    const parser = new Parser({
      customFields: {
        item: [
          ['content:encoded', 'content'],
          ['media:content', 'media'],
          ['enclosure', 'enclosure']
        ]
      }
    });
    
    // Process each feed
    let newArticlesAdded = 0;
    
    for (const feed of autoRefreshFeeds) {
      try {
        console.log(`Refreshing feed: ${feed.title} (${feed.url})`);
        
        // Fetch the RSS feed content
        const response = await axios.get(feed.url, {
          responseType: 'text',
          timeout: 15000,
          headers: {
            'User-Agent': 'RSS Reader/1.0'
          }
        });
        
        // Parse the feed content
        const parsedFeed = await parser.parseString(response.data);
        
        // Add new articles from the feed
        if (parsedFeed.items && parsedFeed.items.length > 0) {
          console.log(`Found ${parsedFeed.items.length} items in feed ${feed.title}`);
          
          // Get existing articles for this feed to avoid duplicates
          const existingArticles = await storage.getArticlesByFeedId(feed.id);
          const existingGuids = new Set(existingArticles.map(article => article.guid));
          
          for (const item of parsedFeed.items) {
            if (!item.title || !item.link) continue;
            
            // Use guid or link as the unique identifier
            const guid = item.guid || item.id || item.link;
            
            // Skip if we already have this article
            if (existingGuids.has(guid)) {
              continue;
            }
            
            // Extract image URL if available
            let imageUrl = '';
            if (item.enclosure?.url) {
              imageUrl = item.enclosure.url;
            } else if (item.media?.$.url) {
              imageUrl = item.media.$.url;
            }
            
            // Create the article in storage
            const newArticle = await storage.createArticle({
              feedId: feed.id,
              title: item.title,
              link: item.link,
              description: item.description || '',
              content: item.content || item['content:encoded'] || item.description || '',
              author: item.creator || item.author || '',
              category: item.categories?.join(', ') || '',
              pubDate: item.pubDate ? new Date(item.pubDate) : undefined,
              guid,
              imageUrl
            });
            
            newArticlesAdded++;
            console.log(`Added new article: ${item.title}`);
          }
        }
        
        // Update the feed's lastFetched timestamp
        await storage.updateFeed(feed.id, { lastFetched: new Date() });
        
      } catch (error) {
        console.error(`Error refreshing feed ${feed.title}:`, error);
        // Continue with the next feed
      }
    }
    
    console.log(`Completed feed refresh. Added ${newArticlesAdded} new articles.`);
    return newArticlesAdded;
    
  } catch (error) {
    console.error('Error in refreshAllFeeds job:', error);
  }
}

export function startBackgroundJobs() {
  // Process new articles every 10 minutes
  const articleProcessingIntervalMs = 10 * 60 * 1000;
  
  // Refresh feeds every 30 minutes
  const feedRefreshIntervalMs = 30 * 60 * 1000;
  
  console.log('Starting background jobs...');
  
  // Immediately refresh feeds and process articles
  refreshAllFeeds()
    .then(() => {
      return processNewArticles();
    })
    .catch(error => {
      console.error('Error in initial feed refresh and article processing:', error);
    });
  
  // Set up recurring jobs
  
  // Article processing job
  setInterval(() => {
    processNewArticles().catch(error => {
      console.error('Error in scheduled article processing:', error);
    });
  }, articleProcessingIntervalMs);
  
  // Feed refresh job
  setInterval(() => {
    refreshAllFeeds()
      .then(newArticlesCount => {
        // Only process articles if new ones were added
        if (newArticlesCount && newArticlesCount > 0) {
          return processNewArticles();
        }
      })
      .catch(error => {
        console.error('Error in scheduled feed refresh:', error);
      });
  }, feedRefreshIntervalMs);
  
  console.log(`Background jobs started - article processing will run every ${articleProcessingIntervalMs / 60000} minutes`);
  console.log(`Feed refresh will run every ${feedRefreshIntervalMs / 60000} minutes`);
}