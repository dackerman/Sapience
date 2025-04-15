import {
  feeds, type Feed, type InsertFeed,
  categories, type Category, type InsertCategory,
  articles, type Article, type InsertArticle,
  type FeedWithArticleCount, type CategoryWithFeedCount
} from "@shared/schema";

// We don't have users in the schema yet, so let's define them here for now
interface User {
  id: number;
  username: string;
  email: string;
  password: string;
}

interface InsertUser {
  username: string;
  email: string;
  password: string;
}

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Category methods
  getCategories(): Promise<CategoryWithFeedCount[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteCategory(id: number): Promise<boolean>;

  // Feed methods
  getFeeds(): Promise<FeedWithArticleCount[]>;
  getFeedsByCategory(categoryId: number): Promise<FeedWithArticleCount[]>;
  getFeedById(id: number): Promise<Feed | undefined>;
  createFeed(feed: InsertFeed, title?: string, description?: string, favicon?: string): Promise<Feed>;
  updateFeed(id: number, feed: Partial<Feed>): Promise<Feed | undefined>;
  deleteFeed(id: number): Promise<boolean>;

  // Article methods
  getArticles(feedId?: number): Promise<Article[]>;
  getArticleById(id: number): Promise<Article | undefined>;
  getArticlesByFeedId(feedId: number, sortBy?: string): Promise<Article[]>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(id: number, article: Partial<Article>): Promise<Article | undefined>;
  deleteArticle(id: number): Promise<boolean>;
  deleteArticlesByFeedId(feedId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private feeds: Map<number, Feed>;
  private articles: Map<number, Article>;
  
  private userId: number;
  private categoryId: number;
  private feedId: number;
  private articleId: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.feeds = new Map();
    this.articles = new Map();
    
    this.userId = 1;
    this.categoryId = 1;
    this.feedId = 1;
    this.articleId = 1;

    // Initialize with default categories
    const defaultCategories: InsertCategory[] = [
      { name: "News" },
      { name: "Technology" },
      { name: "Sports" },
      { name: "Uncategorized" }
    ];

    defaultCategories.forEach(category => this.createCategory(category));
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Category methods
  async getCategories(): Promise<CategoryWithFeedCount[]> {
    return Array.from(this.categories.values()).map(category => {
      const feedCount = Array.from(this.feeds.values()).filter(
        feed => feed.categoryId === category.id
      ).length;
      return { ...category, feedCount };
    });
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.categoryId++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  async deleteCategory(id: number): Promise<boolean> {
    // Move all feeds to uncategorized (assuming uncategorized has ID 4)
    Array.from(this.feeds.values())
      .filter(feed => feed.categoryId === id)
      .forEach(feed => {
        feed.categoryId = 4; // Uncategorized
        this.feeds.set(feed.id, feed);
      });
    
    return this.categories.delete(id);
  }

  // Feed methods
  async getFeeds(): Promise<FeedWithArticleCount[]> {
    return Array.from(this.feeds.values()).map(feed => {
      const feedArticles = Array.from(this.articles.values()).filter(
        article => article.feedId === feed.id
      );
      
      const articleCount = feedArticles.length;
      const unreadCount = feedArticles.filter(article => !article.read).length;
      
      return { ...feed, articleCount, unreadCount };
    });
  }

  async getFeedsByCategory(categoryId: number): Promise<FeedWithArticleCount[]> {
    return (await this.getFeeds()).filter(feed => feed.categoryId === categoryId);
  }

  async getFeedById(id: number): Promise<Feed | undefined> {
    return this.feeds.get(id);
  }

  async createFeed(
    insertFeed: InsertFeed,
    title?: string,
    description?: string,
    favicon?: string
  ): Promise<Feed> {
    const id = this.feedId++;
    const feed: Feed = {
      id,
      url: insertFeed.url,
      title: title || "Untitled Feed",
      description: description || null,
      favicon: favicon || null,
      categoryId: insertFeed.categoryId || null,
      autoRefresh: insertFeed.autoRefresh || false,
      lastFetched: new Date()
    };
    this.feeds.set(id, feed);
    return feed;
  }

  async updateFeed(id: number, feedUpdate: Partial<Feed>): Promise<Feed | undefined> {
    const feed = this.feeds.get(id);
    if (!feed) return undefined;
    
    const updatedFeed: Feed = { ...feed, ...feedUpdate };
    this.feeds.set(id, updatedFeed);
    return updatedFeed;
  }

  async deleteFeed(id: number): Promise<boolean> {
    // Delete all articles from this feed
    await this.deleteArticlesByFeedId(id);
    return this.feeds.delete(id);
  }

  // Article methods
  async getArticles(feedId?: number): Promise<Article[]> {
    let articles = Array.from(this.articles.values());
    
    if (feedId) {
      articles = articles.filter(article => article.feedId === feedId);
    }
    
    // Sort by publication date desc
    return articles.sort((a, b) => {
      if (!a.pubDate || !b.pubDate) return 0;
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });
  }

  async getArticleById(id: number): Promise<Article | undefined> {
    return this.articles.get(id);
  }

  async getArticlesByFeedId(feedId: number, sortBy = 'newest'): Promise<Article[]> {
    const articles = Array.from(this.articles.values()).filter(
      article => article.feedId === feedId
    );
    
    if (sortBy === 'newest') {
      return articles.sort((a, b) => {
        if (!a.pubDate || !b.pubDate) return 0;
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      });
    } else if (sortBy === 'oldest') {
      return articles.sort((a, b) => {
        if (!a.pubDate || !b.pubDate) return 0;
        return new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime();
      });
    } else if (sortBy === 'unread') {
      return articles.sort((a, b) => {
        if (a.read === b.read) {
          return new Date(b.pubDate || "").getTime() - new Date(a.pubDate || "").getTime();
        }
        return a.read ? 1 : -1;
      });
    }
    
    return articles;
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = this.articleId++;
    const article: Article = { 
      id,
      feedId: insertArticle.feedId,
      title: insertArticle.title,
      link: insertArticle.link,
      description: insertArticle.description || null,
      content: insertArticle.content || null,
      author: insertArticle.author || null,
      category: insertArticle.category || null,
      pubDate: insertArticle.pubDate || null,
      guid: insertArticle.guid || null,
      imageUrl: insertArticle.imageUrl || null,
      read: false,
      favorite: false
    };
    this.articles.set(id, article);
    return article;
  }

  async updateArticle(id: number, articleUpdate: Partial<Article>): Promise<Article | undefined> {
    const article = this.articles.get(id);
    if (!article) return undefined;
    
    const updatedArticle: Article = { ...article, ...articleUpdate };
    this.articles.set(id, updatedArticle);
    return updatedArticle;
  }

  async deleteArticle(id: number): Promise<boolean> {
    return this.articles.delete(id);
  }

  async deleteArticlesByFeedId(feedId: number): Promise<boolean> {
    const articleIds = Array.from(this.articles.values())
      .filter(article => article.feedId === feedId)
      .map(article => article.id);
    
    articleIds.forEach(id => this.articles.delete(id));
    
    return true;
  }
}

export const storage = new MemStorage();
