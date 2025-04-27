import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import Parser from "rss-parser";
import { validateFeedUrlSchema, articleOperationSchema, insertArticlePreferenceSchema } from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth } from "./auth";
import { processNewArticles, processArticleVote } from "./services/backgroundJobs";
import { generateArticleSummary } from "./services/openai";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Setup authentication
  setupAuth(app);

  // User profile routes
  app.get("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userProfile = await storage.getUserProfile(req.user.id);
      if (userProfile) {
        res.json(userProfile);
      } else {
        // If no profile exists yet, create a default one
        const defaultProfile = await storage.createUserProfile({
          userId: req.user.id,
          interests: ""
        });
        res.json(defaultProfile);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.put("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { interests } = req.body;
      if (interests === undefined) {
        return res.status(400).json({ message: "Interests are required" });
      }

      // Check if profile exists
      let userProfile = await storage.getUserProfile(req.user.id);

      if (userProfile) {
        // Update existing profile
        userProfile = await storage.updateUserProfile(req.user.id, { interests });
      } else {
        // Create new profile
        userProfile = await storage.createUserProfile({
          userId: req.user.id,
          interests
        });
      }

      // Delete existing recommendations for this user so they'll be regenerated
      // with the new interests profile
      await storage.deleteUserRecommendations(req.user.id);
      console.log("Deleted all recommendations after profile update");

      // Trigger the background job to regenerate recommendations immediately for this specific user
      console.log(`Triggering immediate article processing for user ${req.user.id} after profile update`);
      processNewArticles(req.user.id).catch(error => {
        console.error(`Error processing articles for user ${req.user.id} after profile update:`, error);
        // Don't fail the request if processing fails
      });

      res.json(userProfile);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // API Routes
  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: "Category name is required" });

      const category = await storage.createCategory({ name });
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid category ID" });

      const success = await storage.deleteCategory(id);
      if (success) {
        res.json({ message: "Category deleted successfully" });
      } else {
        res.status(404).json({ message: "Category not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Feeds
  app.get("/api/feeds", async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;

      if (categoryId) {
        const feeds = await storage.getFeedsByCategory(categoryId);
        res.json(feeds);
      } else {
        const feeds = await storage.getFeeds();
        res.json(feeds);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch feeds" });
    }
  });

  app.get("/api/feeds/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid feed ID" });

      const feed = await storage.getFeedById(id);
      if (feed) {
        res.json(feed);
      } else {
        res.status(404).json({ message: "Feed not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  app.post("/api/feeds", async (req, res) => {
    try {
      // Validate input
      const feedData = validateFeedUrlSchema.parse(req.body);

      // Fetch the RSS feed to validate it and extract metadata
      try {
        // Fetch the RSS feed content
        const response = await axios.get(feedData.url, {
          responseType: 'text',
          timeout: 10000,
          headers: {
            'User-Agent': 'RSS Reader/1.0'
          }
        });

        // Parse the feed content
        const parsedFeed = await parser.parseString(response.data);

        // Extract feed metadata
        const title = parsedFeed.title || 'Untitled Feed';
        const description = parsedFeed.description || '';
        const favicon = parsedFeed.image?.url || '';

        // Create feed in storage
        const newFeed = await storage.createFeed(
          feedData,
          title,
          description,
          favicon
        );

        // Add articles from the feed
        if (parsedFeed.items && parsedFeed.items.length > 0) {
          for (const item of parsedFeed.items) {
            if (!item.title || !item.link) continue;

            // Extract image URL if available
            let imageUrl = '';
            if (item.enclosure?.url) {
              imageUrl = item.enclosure.url;
            } else if (item.media?.$.url) {
              imageUrl = item.media.$.url;
            }

            // Create the article in storage
            const newArticle = await storage.createArticle({
              feedId: newFeed.id,
              title: item.title,
              link: item.link,
              description: item.description || '',
              content: item.content || item['content:encoded'] || item.description || '',
              author: item.creator || item.author || '',
              category: item.categories?.join(', ') || '',
              pubDate: item.pubDate ? new Date(item.pubDate) : undefined,
              guid: item.guid || item.id || item.link,
              imageUrl
            });

            // For important articles, fetch the full HTML content immediately
            // This helps avoid needing to fetch content on first view
            try {
              if (newArticle && (!newArticle.content || newArticle.content.length < 500)) {
                console.log(`Pre-fetching full content for new article ${newArticle.id}`);
                const contentResponse = await axios.get(item.link, {
                  timeout: 5000,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                  },
                  responseType: 'text'
                });

                // Store the full HTML content
                if (contentResponse.data) {
                  await storage.updateArticle(newArticle.id, { content: contentResponse.data });
                  console.log(`Stored full HTML content for article ${newArticle.id}`);
                }
              }
            } catch (contentError) {
              console.error(`Error pre-fetching content for new article: ${contentError instanceof Error ? contentError.message : String(contentError)}`);
              // Don't throw error - just continue with partial content
            }
          }
        }

        res.status(201).json(newFeed);
      } catch (error) {
        console.error("Error fetching/parsing feed:", error);
        res.status(400).json({ message: "Failed to fetch or parse the RSS feed. Please check the URL and try again." });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Failed to add feed" });
      }
    }
  });

  app.put("/api/feeds/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid feed ID" });

      const { categoryId, autoRefresh } = req.body;
      const updateData: any = {};

      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (autoRefresh !== undefined) updateData.autoRefresh = autoRefresh;

      const updatedFeed = await storage.updateFeed(id, updateData);
      if (updatedFeed) {
        res.json(updatedFeed);
      } else {
        res.status(404).json({ message: "Feed not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update feed" });
    }
  });

  app.delete("/api/feeds/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid feed ID" });

      const success = await storage.deleteFeed(id);
      if (success) {
        res.json({ message: "Feed deleted successfully" });
      } else {
        res.status(404).json({ message: "Feed not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete feed" });
    }
  });

  // Refresh feed content
  app.post("/api/feeds/:id/refresh", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid feed ID" });

      const feed = await storage.getFeedById(id);
      if (!feed) return res.status(404).json({ message: "Feed not found" });

      try {
        // Fetch the RSS feed content
        const response = await axios.get(feed.url, {
          responseType: 'text',
          timeout: 10000,
          headers: {
            'User-Agent': 'RSS Reader/1.0'
          }
        });

        // Parse the feed content
        const parsedFeed = await parser.parseString(response.data);

        // Update feed metadata if needed
        const feedUpdates: any = {
          lastFetched: new Date()
        };

        if (parsedFeed.title && parsedFeed.title !== feed.title) {
          feedUpdates.title = parsedFeed.title;
        }

        if (parsedFeed.description && parsedFeed.description !== feed.description) {
          feedUpdates.description = parsedFeed.description;
        }

        if (parsedFeed.image?.url && parsedFeed.image.url !== feed.favicon) {
          feedUpdates.favicon = parsedFeed.image.url;
        }

        if (Object.keys(feedUpdates).length > 1) {
          await storage.updateFeed(id, feedUpdates);
        }

        // Add new articles from the feed
        const newArticles = [];

        if (parsedFeed.items && parsedFeed.items.length > 0) {
          for (const item of parsedFeed.items) {
            if (!item.title || !item.link) continue;

            const guid = item.guid || item.id || item.link;

            // Check if article already exists
            const existingArticles = await storage.getArticlesByFeedId(id);
            const exists = existingArticles.some(article => article.guid === guid);

            if (!exists) {
              let imageUrl = '';
              if (item.enclosure?.url) {
                imageUrl = item.enclosure.url;
              } else if (item.media?.$.url) {
                imageUrl = item.media.$.url;
              }

              const newArticle = await storage.createArticle({
                feedId: id,
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

              newArticles.push(newArticle);

              // For recently added articles, pre-fetch the full HTML content
              // to avoid having to fetch it when the user first views the article
              try {
                if (newArticle && (!newArticle.content || newArticle.content.length < 500)) {
                  console.log(`Pre-fetching full content for new article ${newArticle.id} during refresh`);
                  const contentResponse = await axios.get(item.link, {
                    timeout: 5000,
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    responseType: 'text'
                  });

                  // Store the full HTML content
                  if (contentResponse.data) {
                    await storage.updateArticle(newArticle.id, { content: contentResponse.data });
                    console.log(`Stored full HTML content for article ${newArticle.id} during refresh`);
                  }
                }
              } catch (contentError) {
                // Some websites block automated content fetching, which is expected
                console.log(`Note: Could not fetch full content for article ${newArticle.id} during refresh: ${contentError instanceof Error ? contentError.message : String(contentError)}`);
                // Continue with next article - don't throw error
              }
            }
          }
        }

        res.json({
          message: "Feed refreshed successfully",
          newArticlesCount: newArticles.length
        });
      } catch (error) {
        console.error("Error refreshing feed:", error);
        res.status(400).json({ message: "Failed to refresh feed. Please try again later." });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to refresh feed" });
    }
  });

  // Refresh all feeds
  app.post("/api/feeds/refresh/all", async (req, res) => {
    try {
      const feeds = await storage.getFeeds();
      const results = {
        success: 0,
        failed: 0,
        newArticles: 0
      };

      for (const feed of feeds) {
        try {
          // Fetch and parse the RSS feed
          const response = await axios.get(feed.url, {
            responseType: 'text',
            timeout: 10000,
            headers: {
              'User-Agent': 'RSS Reader/1.0'
            }
          });

          const parsedFeed = await parser.parseString(response.data);

          // Update feed metadata
          await storage.updateFeed(feed.id, { lastFetched: new Date() });

          // Add new articles
          if (parsedFeed.items && parsedFeed.items.length > 0) {
            const existingArticles = await storage.getArticlesByFeedId(feed.id);

            for (const item of parsedFeed.items) {
              if (!item.title || !item.link) continue;

              const guid = item.guid || item.id || item.link;
              const exists = existingArticles.some(article => article.guid === guid);

              if (!exists) {
                let imageUrl = '';
                if (item.enclosure?.url) {
                  imageUrl = item.enclosure.url;
                } else if (item.media?.$.url) {
                  imageUrl = item.media.$.url;
                }

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

                results.newArticles++;

                // Try to fetch full HTML content for new articles in the background
                // We don't want to slow down the refresh all operation, so we don't await this
                // and we catch any errors silently
                try {
                  if (newArticle && (!newArticle.content || newArticle.content.length < 500)) {
                    (async () => {
                      try {
                        console.log(`Background pre-fetching content for article ${newArticle.id}`);
                        const contentResponse = await axios.get(item.link, {
                          timeout: 5000,
                          headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                          },
                          responseType: 'text'
                        });

                        if (contentResponse.data) {
                          await storage.updateArticle(newArticle.id, { content: contentResponse.data });
                          console.log(`Stored full HTML content for article ${newArticle.id} in background`);
                        }
                      } catch (error) {
                        // Some websites block automated content fetching, which is expected
                        // Log with lower severity since this is a common and non-critical issue
                        console.log(`Note: Could not fetch full content for article ${newArticle.id}: ${error instanceof Error ? error.message : String(error)}`);
                      }
                    })();
                  }
                } catch (e) {
                  // Silently ignore any errors in background content fetching
                }
              }
            }
          }

          results.success++;
        } catch (error) {
          results.failed++;
        }
      }

      res.json({
        message: "All feeds refreshed",
        results
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to refresh feeds" });
    }
  });

  // Articles
  app.get("/api/articles", async (req, res) => {
    try {
      const feedId = req.query.feedId ? parseInt(req.query.feedId as string) : undefined;
      const sortBy = req.query.sortBy as string || 'newest';

      if (feedId) {
        const articles = await storage.getArticlesByFeedId(feedId, sortBy);
        res.json(articles);
      } else {
        const articles = await storage.getArticles();
        res.json(articles);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid article ID" });

      const article = await storage.getArticleById(id);
      if (article) {
        // Mark as read when viewed
        if (!article.read) {
          await storage.updateArticle(id, { read: true });
        }
        res.json(article);
      } else {
        res.status(404).json({ message: "Article not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  app.post("/api/articles/:id/action", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid article ID" });

      const actionData = articleOperationSchema.parse({
        id,
        operation: req.body.operation,
        explanation: req.body.explanation
      });

      const article = await storage.getArticleById(id);
      if (!article) return res.status(404).json({ message: "Article not found" });

      // Handle upvote/downvote operations which require authentication
      if (actionData.operation === 'upvote' || actionData.operation === 'downvote') {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Authentication required for voting" });
        }

        // Save article preference
        const preference = await storage.createArticlePreference({
          userId: req.user.id,
          articleId: id,
          preference: actionData.operation,
          explanation: actionData.explanation || null
        });

        // Update user profile if the user provided an explanation to improve recommendations
        if (actionData.explanation) {
          const userProfile = await storage.getUserProfile(req.user.id);
          if (userProfile) {
            // Get existing article preferences to build context for recommendations
            const userPreferences = await storage.getUserArticlePreferences(req.user.id);
            
            // We might want to trigger recommendation regeneration here in the future
            console.log(`User ${req.user.id} ${actionData.operation}d article ${id} with explanation: "${actionData.explanation}"`);
          }
        }

        // Get the article preference to return in the response
        const currentPreference = await storage.getArticlePreference(req.user.id, id);
        return res.json({
          ...article,
          preference: currentPreference
        });
      }

      // Handle other operations (read/unread/favorite/unfavorite)
      let updateData = {};

      switch (actionData.operation) {
        case 'read':
          updateData = { read: true };
          break;
        case 'unread':
          updateData = { read: false };
          break;
        case 'favorite':
          updateData = { favorite: true };
          break;
        case 'unfavorite':
          updateData = { favorite: false };
          break;
        default:
          return res.status(400).json({ message: "Invalid operation" });
      }

      const updatedArticle = await storage.updateArticle(id, updateData);
      res.json(updatedArticle);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        console.error("Error in article action:", error);
        res.status(500).json({ message: "Failed to update article" });
      }
    }
  });

  // Endpoint for AI-powered "For You" page recommendations
  app.get("/api/recommendations", async (req, res) => {
    try {
      // Require authentication for recommendations
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get recommendations specific to the authenticated user
      const recommendedArticles = await storage.getRecommendedArticles(req.user.id);
      res.json(recommendedArticles);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({
        message: "Failed to fetch recommendations",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint to get article preferences for the authenticated user
  app.get("/api/article-preferences", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const preferences = await storage.getUserArticlePreferences(req.user.id);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching article preferences:", error);
      res.status(500).json({
        message: "Failed to fetch article preferences",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint to get a specific article preference
  app.get("/api/articles/:id/preference", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid article ID" });
      }
      
      const preference = await storage.getArticlePreference(req.user.id, id);
      if (preference) {
        res.json(preference);
      } else {
        res.status(404).json({ message: "No preference found for this article" });
      }
    } catch (error) {
      console.error("Error fetching article preference:", error);
      res.status(500).json({
        message: "Failed to fetch article preference",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint to submit a preference (upvote/downvote) for an article
  app.post("/api/articles/:id/preference", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const articleId = parseInt(req.params.id);
      if (isNaN(articleId)) {
        return res.status(400).json({ message: "Invalid article ID" });
      }
      
      // Validate the request body
      try {
        const preferenceData = insertArticlePreferenceSchema.parse({
          ...req.body,
          userId: req.user.id,
          articleId
        });
        
        // Save the preference to the database
        const articlePreference = await storage.createArticlePreference(preferenceData);
        
        // Start background job to process the vote (rescore articles, update user profile)
        processArticleVote(req.user.id, articleId, articlePreference).catch(error => {
          console.error(`Error processing article vote:`, error);
          // Don't fail the request if processing fails
        });
        
        res.status(201).json(articlePreference);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({ message: error.errors[0].message });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error saving article preference:", error);
      res.status(500).json({
        message: "Failed to save article preference",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint to mark recommendation as viewed
  app.post("/api/recommendations/:id/viewed", async (req, res) => {
    try {
      // Require authentication for marking recommendations as viewed
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recommendation ID" });
      }

      // Verify the recommendation belongs to the current user
      const recommendation = await storage.getRecommendationById(id);
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }

      // Make sure the recommendation belongs to the current user
      if (recommendation.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to mark this recommendation as viewed" });
      }

      const updated = await storage.markRecommendationAsViewed(id);
      if (!updated) {
        return res.status(404).json({ message: "Recommendation not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error marking recommendation as viewed:", error);
      res.status(500).json({
        message: "Failed to mark recommendation as viewed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint to fetch external article content for a single article
  app.get("/api/articles/:id/content", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid article ID" });

      const article = await storage.getArticleById(id);
      if (!article) return res.status(404).json({ message: "Article not found" });

      // If we already have full HTML content, return it
      if (article.content && article.content.includes("<html")) {
        console.log(`Using stored HTML content for article ${id}`);
        return res.json({ content: article.content });
      }

      // Otherwise, fetch the content from the external URL
      try {
        console.log(`Fetching full HTML content from ${article.link}`);
        const response = await axios.get(article.link, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          responseType: 'text'
        });

        // Extract and return the HTML content
        const content = response.data;

        // Update the article in the database with the fetched content
        await storage.updateArticle(id, { content });

        console.log(`Stored full HTML content for article ${id}`);
        res.json({ content });
      } catch (fetchError) {
        console.error(`Error fetching article content: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);

        // If we have partial content, return that instead
        if (article.content) {
          console.log(`Returning partial content for article ${id} after fetch error`);
          return res.json({ content: article.content });
        }

        res.status(500).json({
          message: "Failed to fetch article content",
          error: fetchError instanceof Error ? fetchError.message : String(fetchError)
        });
      }
    } catch (error) {
      console.error("Error in content fetch endpoint:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Endpoint to fetch article summary for a single article
  app.get("/api/articles/:id/summary", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid article ID" });

      const article = await storage.getArticleById(id);
      if (!article) return res.status(404).json({ message: "Article not found" });

      // Fetch article summary from storage
      const summary = await storage.getArticleSummary(id);

      if (summary) {
        console.log(`Found summary for article ${id}`);
        return res.json(summary);
      } else {
        console.log(`No summary available for article ${id}`);
        return res.status(404).json({ message: "No summary available for this article" });
      }
    } catch (error) {
      console.error("Error in summary fetch endpoint:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Endpoint to fetch article contents for a feed
  app.get("/api/feeds/:id/contents", async (req, res) => {
    try {
      const feedId = parseInt(req.params.id);
      if (isNaN(feedId)) return res.status(400).json({ message: "Invalid feed ID" });

      // Get articles for this feed
      const articles = await storage.getArticlesByFeedId(feedId);
      if (!articles.length) {
        return res.json({ articles: [] });
      }

      // Process articles (fetch content for those without content)
      const processedArticles = [];
      const fetchPromises = [];

      for (const article of articles) {
        // Check if article already has content
        if (article.content && article.content.length > 100) {
          processedArticles.push({
            ...article,
            hasFullContent: true
          });
        } else {
          // Queue up this article for content fetching
          fetchPromises.push(
            (async () => {
              try {
                console.log(`Batch fetching content for article ${article.id} from ${article.link}`);
                const response = await axios.get(article.link, {
                  timeout: 8000,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                  },
                  responseType: 'text'
                });

                // Extract content - full HTML
                const content = response.data;

                // Update in database
                await storage.updateArticle(article.id, { content });

                // Add to processed articles
                processedArticles.push({
                  ...article,
                  content,
                  hasFullContent: true
                });
              } catch (fetchError) {
                // Many websites block content scraping, so this is expected
                console.log(`Note: Could not fetch full content for article ${article.id}: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
                // Add original article without content
                processedArticles.push({
                  ...article,
                  hasFullContent: false
                });
              }
            })()
          );
        }
      }

      // Wait for all fetch operations to complete (with a timeout)
      if (fetchPromises.length > 0) {
        await Promise.allSettled(fetchPromises);
      }

      // Make sure we return a proper response
      res.json({ articles: processedArticles });
    } catch (error) {
      console.error("Error in feed contents endpoint:", error);
      res.status(500).json({ message: "Server error", error: String(error) });
    }
  });

  // Test endpoint to manually trigger article processing
  // Only for testing - should be removed in production
  app.post("/api/test/process-articles", async (req, res) => {
    try {
      console.log('Manually triggering article processing...');
      await processNewArticles();
      res.json({ message: 'Article processing completed successfully' });
    } catch (error) {
      console.error('Error processing articles:', error);
      res.status(500).json({ message: 'Failed to process articles' });
    }
  });

  // Endpoint to regenerate summaries for articles with error summaries
  app.post("/api/regenerate-summaries", async (req, res) => {
    try {
      console.log('Manually triggering regeneration of article summaries with errors...');

      // Call processNewArticles with forceRegenerate=true
      await processNewArticles(undefined, true);

      res.json({ message: 'Article summary regeneration initiated successfully' });
    } catch (error) {
      console.error('Error regenerating article summaries:', error);
      res.status(500).json({ message: 'Failed to regenerate article summaries' });
    }
  });

  // Endpoint to regenerate a specific article's summary by ID
  app.post("/api/articles/:id/regenerate-summary", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id, 10);

      if (isNaN(articleId)) {
        return res.status(400).json({ message: 'Invalid article ID' });
      }

      console.log(`Manually regenerating summary for article ID: ${articleId}`);

      // First, get the article
      const article = await storage.getArticleById(articleId);

      if (!article) {
        return res.status(404).json({ message: 'Article not found' });
      }

      // Prepare the content to summarize
      const contentToSummarize = article.content || article.description || '';

      if (!contentToSummarize) {
        return res.status(400).json({ message: 'No content available to summarize' });
      }

      console.log('content to summarize', contentToSummarize);

      // Generate a new summary
      const { summary, keywords } = await generateArticleSummary(
        article.title,
        contentToSummarize
      );

      // Save the new summary
      const articleSummary = {
        articleId,
        summary,
        keywords
      };

      console.log('article summary', articleSummary);

      const savedSummary = await storage.createArticleSummary(articleSummary);

      console.log('saved summary', savedSummary);

      res.json({
        message: 'Article summary regenerated successfully',
        summary: savedSummary
      });
    } catch (error) {
      console.error(`Error regenerating article summary:`, error);
      res.status(500).json({ message: 'Failed to regenerate article summary' });
    }
  });

  // Admin API endpoints for pipeline visualization
  app.get("/api/admin/pipeline", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Get all articles for pipeline visualization
      const allArticles = await storage.getArticles();
      
      // Get all article summaries
      const allSummaries = await storage.getArticleSummaries();
      
      // Create a pipeline status object for each article
      const pipelineStatus = await Promise.all(
        allArticles.map(async (article) => {
          // Find the article's summary if it exists
          const summary = allSummaries.find(s => s.articleId === article.id);
          
          // Count recommendations for this article
          const recommendations = await storage.getRecommendationsForAllUsersForArticle(article.id);
          
          // Count preferences (upvotes/downvotes) for this article
          const preferences = await storage.getPreferencesForArticle(article.id);
          
          return {
            id: article.id,
            title: article.title,
            feedId: article.feedId,
            pubDate: article.pubDate,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
            status: {
              hasContent: Boolean(article.content && article.content.length > 100),
              hasSummary: Boolean(summary),
              summaryStatus: summary ? (summary.summary.toLowerCase().includes("error") ? "error" : "success") : "missing",
              processedAt: summary?.processedAt,
              recommendationCount: recommendations.length,
              upvoteCount: preferences.filter(p => p.preference === "upvote").length,
              downvoteCount: preferences.filter(p => p.preference === "downvote").length
            }
          };
        })
      );
      
      res.json(pipelineStatus);
    } catch (error) {
      console.error("Error fetching pipeline data:", error);
      res.status(500).json({ message: "Failed to fetch pipeline data" });
    }
  });
  
  // Admin API endpoint for getting processing statistics
  app.get("/api/admin/stats", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const allArticles = await storage.getArticles();
      const allSummaries = await storage.getArticleSummaries();
      const allRecommendations = await storage.getAllRecommendations();
      const allPreferences = await storage.getAllArticlePreferences();
      
      const stats = {
        articles: {
          total: allArticles.length,
          withContent: allArticles.filter(a => a.content && a.content.length > 100).length
        },
        summaries: {
          total: allSummaries.length,
          withErrors: allSummaries.filter(s => s.summary.toLowerCase().includes("error")).length
        },
        recommendations: {
          total: allRecommendations.length,
          viewed: allRecommendations.filter(r => r.viewed).length
        },
        preferences: {
          total: allPreferences.length,
          upvotes: allPreferences.filter(p => p.preference === "upvote").length,
          downvotes: allPreferences.filter(p => p.preference === "downvote").length
        },
        processingQueue: {
          unprocessedArticles: allArticles.filter(a => !allSummaries.some(s => s.articleId === a.id)).length
        }
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
  });

  return httpServer;
}
