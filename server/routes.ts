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

            await storage.createArticle({
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
                
                await storage.createArticle({
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

  return httpServer;
}
