import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import Parser from "rss-parser";
import { validateFeedUrlSchema, articleOperationSchema } from "@shared/schema";
import { ZodError } from "zod";

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
                console.error(`Error pre-fetching content during refresh: ${contentError instanceof Error ? contentError.message : String(contentError)}`);
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
                        console.error(`Error background fetching content: ${error instanceof Error ? error.message : String(error)}`);
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
        operation: req.body.operation
      });
      
      const article = await storage.getArticleById(id);
      if (!article) return res.status(404).json({ message: "Article not found" });
      
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
        res.status(500).json({ message: "Failed to update article" });
      }
    }
  });

  // Endpoint for AI-powered "For You" page recommendations
  app.get("/api/recommendations", async (req, res) => {
    try {
      const recommendedArticles = await storage.getRecommendedArticles();
      res.json(recommendedArticles);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ 
        message: "Failed to fetch recommendations", 
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
                console.error(`Error batch fetching content for article ${article.id}: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
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

  return httpServer;
}
