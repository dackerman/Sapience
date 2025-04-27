import {
  feeds, type Feed, type InsertFeed,
  categories, type Category, type InsertCategory,
  articles, type Article, type InsertArticle,
  type FeedWithArticleCount, type CategoryWithFeedCount,
  userProfiles, type UserProfile, type InsertUserProfile,
  articleSummaries, type ArticleSummary, type InsertArticleSummary,
  recommendations, type Recommendation, type InsertRecommendation,
  articlePreferences, type ArticlePreference, type InsertArticlePreference,
  type ArticleWithSummary,
  users, type User, type InsertUser
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUsers(): Promise<User[]>;
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
  
  // User Profile methods
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: number, profile: Partial<UserProfile>): Promise<UserProfile | undefined>;
  
  // Article Summary methods
  getArticleSummary(articleId: number): Promise<ArticleSummary | undefined>;
  getArticleSummaries(processedSince?: Date): Promise<ArticleSummary[]>;
  createArticleSummary(summary: InsertArticleSummary): Promise<ArticleSummary>;
  getArticlesWithErrorSummaries(): Promise<Article[]>;
  
  // Recommendation methods
  getRecommendations(userId: number, viewed?: boolean): Promise<Recommendation[]>;
  getRecommendationById(id: number): Promise<Recommendation | undefined>;
  getRecommendationForArticle(userId: number, articleId: number): Promise<Recommendation | undefined>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendation(id: number, recommendation: Partial<InsertRecommendation>): Promise<Recommendation | undefined>;
  deleteRecommendation(id: number): Promise<boolean>;
  markRecommendationAsViewed(id: number): Promise<Recommendation | undefined>;
  deleteAllRecommendations(): Promise<boolean>;
  deleteUserRecommendations(userId: number): Promise<boolean>;
  getAllRecommendations(): Promise<Recommendation[]>;
  getRecommendationsForAllUsersForArticle(articleId: number): Promise<Recommendation[]>;
  
  // Article Preference methods
  getArticlePreference(userId: number, articleId: number): Promise<ArticlePreference | undefined>;
  createArticlePreference(preference: InsertArticlePreference): Promise<ArticlePreference>;
  updateArticlePreference(id: number, preference: Partial<ArticlePreference>): Promise<ArticlePreference | undefined>;
  getUserArticlePreferences(userId: number): Promise<ArticlePreference[]>;
  getAllArticlePreferences(): Promise<ArticlePreference[]>;
  getPreferencesForArticle(articleId: number): Promise<ArticlePreference[]>;

  // Combined query for "For You" page
  getRecommendedArticles(userId: number): Promise<ArticleWithSummary[]>;
  getUnprocessedArticles(limit?: number): Promise<Article[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private feeds: Map<number, Feed>;
  private articles: Map<number, Article>;
  private articlePreferences: Map<number, ArticlePreference>;
  
  private userId: number;
  private categoryId: number;
  private feedId: number;
  private articleId: number;
  private articlePreferenceId: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.feeds = new Map();
    this.articles = new Map();
    this.articlePreferences = new Map();
    
    this.userId = 1;
    this.categoryId = 1;
    this.feedId = 1;
    this.articleId = 1;
    this.articlePreferenceId = 1;

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
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
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
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now,
      updatedAt: now
    };
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

  // Stub implementations for "For You" feature - not used in MemStorage
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    return undefined;
  }
  
  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    throw new Error("Not implemented in MemStorage");
  }
  
  async updateUserProfile(userId: number, profile: Partial<UserProfile>): Promise<UserProfile | undefined> {
    return undefined;
  }
  
  async getArticleSummary(articleId: number): Promise<ArticleSummary | undefined> {
    return undefined;
  }
  
  async getArticleSummaries(processedSince?: Date): Promise<ArticleSummary[]> {
    return [];
  }
  
  async createArticleSummary(summary: InsertArticleSummary): Promise<ArticleSummary> {
    throw new Error("Not implemented in MemStorage");
  }
  
  async getArticlesWithErrorSummaries(): Promise<Article[]> {
    return []; // Not implemented in MemStorage
  }
  
  async getRecommendations(userId: number, viewed?: boolean): Promise<Recommendation[]> {
    return [];
  }
  
  async getRecommendationById(id: number): Promise<Recommendation | undefined> {
    return undefined;
  }
  
  async getRecommendationForArticle(userId: number, articleId: number): Promise<Recommendation | undefined> {
    return undefined;
  }
  
  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    throw new Error("Not implemented in MemStorage");
  }
  
  async updateRecommendation(id: number, recommendation: Partial<InsertRecommendation>): Promise<Recommendation | undefined> {
    return undefined; // Not implemented in MemStorage
  }
  
  async deleteRecommendation(id: number): Promise<boolean> {
    return true; // Not implemented in MemStorage
  }
  
  async markRecommendationAsViewed(id: number): Promise<Recommendation | undefined> {
    return undefined;
  }
  
  async deleteAllRecommendations(): Promise<boolean> {
    return true; // Not applicable for MemStorage, but return true to indicate success
  }
  
  async deleteUserRecommendations(userId: number): Promise<boolean> {
    return true; // Not applicable for MemStorage, but return true to indicate success
  }
  
  async getRecommendedArticles(userId: number): Promise<ArticleWithSummary[]> {
    return [];
  }
  
  async getUnprocessedArticles(limit?: number): Promise<Article[]> {
    return [];
  }

  // Article Preference methods
  async getArticlePreference(userId: number, articleId: number): Promise<ArticlePreference | undefined> {
    return Array.from(this.articlePreferences.values()).find(
      pref => pref.userId === userId && pref.articleId === articleId
    );
  }

  async createArticlePreference(preference: InsertArticlePreference): Promise<ArticlePreference> {
    const id = this.articlePreferenceId++;
    const now = new Date();
    const newPreference: ArticlePreference = {
      userId: preference.userId,
      articleId: preference.articleId,
      preference: preference.preference,
      explanation: preference.explanation ?? null,
      id,
      createdAt: now,
    };
    this.articlePreferences.set(id, newPreference);
    return newPreference;
  }

  async updateArticlePreference(id: number, preference: Partial<ArticlePreference>): Promise<ArticlePreference | undefined> {
    const existingPreference = this.articlePreferences.get(id);
    if (!existingPreference) return undefined;
    
    const updatedPreference: ArticlePreference = { ...existingPreference, ...preference };
    this.articlePreferences.set(id, updatedPreference);
    return updatedPreference;
  }

  async getUserArticlePreferences(userId: number): Promise<ArticlePreference[]> {
    return Array.from(this.articlePreferences.values()).filter(
      pref => pref.userId === userId
    );
  }
}

// Database implementation
import { db } from "./db";
import { and, eq, desc, asc, isNull, count, sql, not, notInArray } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users);
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    
    return user;
  }

  // Category methods
  async getCategories(): Promise<CategoryWithFeedCount[]> {
    const categoriesResult = await db.select().from(categories);
    const categoriesWithCount: CategoryWithFeedCount[] = [];

    for (const category of categoriesResult) {
      const feedsCount = await db
        .select({ count: count() })
        .from(feeds)
        .where(eq(feeds.categoryId, category.id));
      
      categoriesWithCount.push({
        ...category,
        feedCount: Number(feedsCount[0]?.count || 0)
      });
    }

    return categoriesWithCount;
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    
    return category;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    
    return category;
  }

  async deleteCategory(id: number): Promise<boolean> {
    // First, update any feeds in this category to "Uncategorized" (id: 4)
    await db
      .update(feeds)
      .set({ categoryId: 4 })
      .where(eq(feeds.categoryId, id));
    
    const result = await db
      .delete(categories)
      .where(eq(categories.id, id));
    
    return true;
  }

  // Feed methods
  async getFeeds(): Promise<FeedWithArticleCount[]> {
    const feedsResult = await db.select().from(feeds);
    const feedsWithCounts: FeedWithArticleCount[] = [];

    for (const feed of feedsResult) {
      const articlesResult = await db
        .select({ count: count() })
        .from(articles)
        .where(eq(articles.feedId, feed.id));
      
      const unreadResult = await db
        .select({ count: count() })
        .from(articles)
        .where(and(
          eq(articles.feedId, feed.id),
          eq(articles.read, false)
        ));
      
      feedsWithCounts.push({
        ...feed,
        articleCount: Number(articlesResult[0]?.count || 0),
        unreadCount: Number(unreadResult[0]?.count || 0)
      });
    }

    return feedsWithCounts;
  }

  async getFeedsByCategory(categoryId: number): Promise<FeedWithArticleCount[]> {
    const feedsResult = await db
      .select()
      .from(feeds)
      .where(eq(feeds.categoryId, categoryId));
    
    const feedsWithCounts: FeedWithArticleCount[] = [];

    for (const feed of feedsResult) {
      const articlesResult = await db
        .select({ count: count() })
        .from(articles)
        .where(eq(articles.feedId, feed.id));
      
      const unreadResult = await db
        .select({ count: count() })
        .from(articles)
        .where(and(
          eq(articles.feedId, feed.id),
          eq(articles.read, false)
        ));
      
      feedsWithCounts.push({
        ...feed,
        articleCount: Number(articlesResult[0]?.count || 0),
        unreadCount: Number(unreadResult[0]?.count || 0)
      });
    }

    return feedsWithCounts;
  }

  async getFeedById(id: number): Promise<Feed | undefined> {
    const [feed] = await db
      .select()
      .from(feeds)
      .where(eq(feeds.id, id));
    
    return feed;
  }

  async createFeed(
    insertFeed: InsertFeed,
    title?: string,
    description?: string,
    favicon?: string
  ): Promise<Feed> {
    const [feed] = await db
      .insert(feeds)
      .values({
        url: insertFeed.url,
        title: title || "Untitled Feed",
        description: description || null,
        favicon: favicon || null,
        categoryId: insertFeed.categoryId || null,
        autoRefresh: insertFeed.autoRefresh || false,
        lastFetched: new Date()
      })
      .returning();
    
    return feed;
  }

  async updateFeed(id: number, feedUpdate: Partial<Feed>): Promise<Feed | undefined> {
    const [updatedFeed] = await db
      .update(feeds)
      .set(feedUpdate)
      .where(eq(feeds.id, id))
      .returning();
    
    return updatedFeed;
  }

  async deleteFeed(id: number): Promise<boolean> {
    // First delete all articles from this feed
    await this.deleteArticlesByFeedId(id);
    
    // Then delete the feed
    await db
      .delete(feeds)
      .where(eq(feeds.id, id));
    
    return true;
  }

  // Article methods
  async getArticles(feedId?: number): Promise<Article[]> {
    if (feedId) {
      return this.getArticlesByFeedId(feedId);
    }
    
    const articlesResult = await db
      .select()
      .from(articles);
    
    // Sort by publication date in descending order
    return articlesResult.sort((a, b) => {
      if (!a.pubDate || !b.pubDate) return 0;
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });
  }

  async getArticleById(id: number): Promise<Article | undefined> {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id));
    
    return article;
  }

  async getArticlesByFeedId(feedId: number, sortBy = 'newest'): Promise<Article[]> {
    let query = db
      .select()
      .from(articles)
      .where(eq(articles.feedId, feedId));
    
    // Execute the query first
    const articlesResult = await query;
    
    // Then apply sorting based on the sortBy parameter
    if (sortBy === 'newest') {
      return articlesResult.sort((a, b) => {
        if (!a.pubDate || !b.pubDate) return 0;
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      });
    } else if (sortBy === 'oldest') {
      return articlesResult.sort((a, b) => {
        if (!a.pubDate || !b.pubDate) return 0;
        return new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime();
      });
    } else if (sortBy === 'unread') {
      return articlesResult.sort((a, b) => {
        if (a.read === b.read) {
          const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
          const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
          return dateB - dateA;
        }
        return a.read ? 1 : -1;
      });
    }
    
    return articlesResult;
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const [article] = await db
      .insert(articles)
      .values({
        ...insertArticle,
        read: false,
        favorite: false
      })
      .returning();
    
    return article;
  }

  async updateArticle(id: number, articleUpdate: Partial<Article>): Promise<Article | undefined> {
    const [updatedArticle] = await db
      .update(articles)
      .set(articleUpdate)
      .where(eq(articles.id, id))
      .returning();
    
    return updatedArticle;
  }

  async deleteArticle(id: number): Promise<boolean> {
    await db
      .delete(articles)
      .where(eq(articles.id, id));
    
    return true;
  }

  async deleteArticlesByFeedId(feedId: number): Promise<boolean> {
    await db
      .delete(articles)
      .where(eq(articles.feedId, feedId));
    
    return true;
  }

  // User Profile methods
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    // First check if a profile already exists for this user
    const existingProfile = await this.getUserProfile(profile.userId);
    
    if (existingProfile) {
      // If a profile already exists, update it instead
      return this.updateUserProfile(existingProfile.userId, { interests: profile.interests }) as Promise<UserProfile>;
    }

    const [newProfile] = await db
      .insert(userProfiles)
      .values({
        ...profile,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newProfile;
  }

  async updateUserProfile(userId: number, profileUpdate: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const existingProfile = await this.getUserProfile(userId);
    
    if (!existingProfile) {
      return undefined;
    }

    const [updatedProfile] = await db
      .update(userProfiles)
      .set({
        ...profileUpdate,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.userId, userId))
      .returning();
    
    return updatedProfile;
  }

  // Article Summary methods
  async getArticleSummary(articleId: number): Promise<ArticleSummary | undefined> {
    const [summary] = await db
      .select()
      .from(articleSummaries)
      .where(eq(articleSummaries.articleId, articleId));
    
    return summary;
  }

  async getArticleSummaries(processedSince?: Date): Promise<ArticleSummary[]> {
    if (processedSince) {
      const results = await db
        .select()
        .from(articleSummaries)
        .where(sql`${articleSummaries.processedAt} >= ${processedSince}`);
      
      return results;
    }
    
    const results = await db
      .select()
      .from(articleSummaries);
    
    return results;
  }

  async createArticleSummary(summary: InsertArticleSummary): Promise<ArticleSummary> {
    // Check if summary already exists for this article
    const existingSummary = await this.getArticleSummary(summary.articleId);
    
    if (existingSummary) {
      // If a summary already exists, update it
      const [updatedSummary] = await db
        .update(articleSummaries)
        .set({
          articleId: summary.articleId,
          summary: summary.summary,
          keywords: Array.isArray(summary.keywords) 
            ? summary.keywords.map(String)
            : summary.keywords 
              ? [String(summary.keywords)] 
              : [],
          processedAt: new Date()
        })
        .where(eq(articleSummaries.id, existingSummary.id))
        .returning();
      
      return updatedSummary;
    }

    // Insert a new summary with properly formatted keywords
    // Ensure keywords is a properly formatted string array
    let keywordsArray: string[] = [];
    
    if (Array.isArray(summary.keywords)) {
      keywordsArray = summary.keywords.map(String);
    } else if (summary.keywords) {
      keywordsArray = [String(summary.keywords)];
    }
    
    const summaryToInsert = {
      articleId: summary.articleId,
      summary: summary.summary,
      keywords: keywordsArray
    };

    const [newSummary] = await db
      .insert(articleSummaries)
      .values(summaryToInsert)
      .returning();
    
    return newSummary;
  }
  
  async getArticlesWithErrorSummaries(): Promise<Article[]> {
    // Get all article summaries that contain "Error generating summary"
    const errorSummaries = await db
      .select()
      .from(articleSummaries)
      .where(sql`${articleSummaries.summary} LIKE '%Error generating summary%'`);
    
    // Get the article IDs from those summaries
    const articleIds = errorSummaries.map(summary => summary.articleId);
    
    if (articleIds.length === 0) {
      return [];
    }
    
    // Fetch the actual articles - process in batches to avoid SQL errors
    const articlesWithErrors: Article[] = [];
    
    // Process in batches of 10 to avoid very long IN clauses
    for (let i = 0; i < articleIds.length; i += 10) {
      const batchIds = articleIds.slice(i, i + 10);
      
      // Use a for loop to query articles individually
      for (const id of batchIds) {
        const [article] = await db
          .select()
          .from(articles)
          .where(eq(articles.id, id));
          
        if (article) {
          articlesWithErrors.push(article);
        }
      }
    }
    
    console.log(`Found ${articlesWithErrors.length} articles with error summaries`);
    return articlesWithErrors;
  }

  // Recommendation methods
  async getRecommendations(userId: number, viewed?: boolean): Promise<Recommendation[]> {
    if (viewed !== undefined) {
      const results = await db
        .select()
        .from(recommendations)
        .where(
          and(
            eq(recommendations.userId, userId),
            eq(recommendations.viewed, viewed)
          )
        );
      
      return results;
    }
    
    const results = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.userId, userId));
    
    return results;
  }

  async getRecommendationById(id: number): Promise<Recommendation | undefined> {
    const [recommendation] = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.id, id));
    
    return recommendation;
  }

  async getRecommendationForArticle(userId: number, articleId: number): Promise<Recommendation | undefined> {
    const [recommendation] = await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.userId, userId),
          eq(recommendations.articleId, articleId)
        )
      );
    
    return recommendation;
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    // Check if a recommendation already exists for this article for this user
    const existingRecommendation = await this.getRecommendationForArticle(
      recommendation.userId, 
      recommendation.articleId
    );
    
    if (existingRecommendation) {
      // If a recommendation already exists, update it
      const [updatedRecommendation] = await db
        .update(recommendations)
        .set({
          ...recommendation,
          createdAt: new Date()
        })
        .where(eq(recommendations.id, existingRecommendation.id))
        .returning();
      
      return updatedRecommendation;
    }

    const [newRecommendation] = await db
      .insert(recommendations)
      .values({
        ...recommendation,
        viewed: false,
        createdAt: new Date()
      })
      .returning();
    
    return newRecommendation;
  }

  async markRecommendationAsViewed(id: number): Promise<Recommendation | undefined> {
    const [recommendation] = await db
      .update(recommendations)
      .set({ viewed: true })
      .where(eq(recommendations.id, id))
      .returning();
    
    return recommendation;
  }
  
  async updateRecommendation(id: number, recommendation: Partial<InsertRecommendation>): Promise<Recommendation | undefined> {
    const [updatedRecommendation] = await db
      .update(recommendations)
      .set(recommendation)
      .where(eq(recommendations.id, id))
      .returning();
    
    return updatedRecommendation;
  }
  
  async deleteRecommendation(id: number): Promise<boolean> {
    await db
      .delete(recommendations)
      .where(eq(recommendations.id, id));
    
    return true;
  }
  
  async deleteAllRecommendations(): Promise<boolean> {
    await db
      .delete(recommendations)
      .where(sql`1=1`); // This deletes all records
    
    console.log('All recommendations deleted');
    return true;
  }
  
  async deleteUserRecommendations(userId: number): Promise<boolean> {
    await db
      .delete(recommendations)
      .where(eq(recommendations.userId, userId));
    
    console.log(`Recommendations deleted for user ${userId}`);
    return true;
  }
  
  async getAllRecommendations(): Promise<Recommendation[]> {
    try {
      return await db.select().from(recommendations);
    } catch (err) {
      console.error('Error getting all recommendations:', err);
      return [];
    }
  }
  
  async getRecommendationsForAllUsersForArticle(articleId: number): Promise<Recommendation[]> {
    try {
      return await db.select()
        .from(recommendations)
        .where(eq(recommendations.articleId, articleId));
    } catch (err) {
      console.error(`Error getting recommendations for article ${articleId}:`, err);
      return [];
    }
  }

  // Combined queries for "For You" page
  async getRecommendedArticles(userId: number): Promise<ArticleWithSummary[]> {
    // Get all unviewed recommendations for this user
    const unviewedRecs = await this.getRecommendations(userId, false);
    
    if (unviewedRecs.length === 0) {
      return [];
    }

    const result: ArticleWithSummary[] = [];
    
    for (const rec of unviewedRecs) {
      // Get the article
      const article = await this.getArticleById(rec.articleId);
      if (!article) continue;
      
      // Get the summary
      const summary = await this.getArticleSummary(rec.articleId);
      
      // Add to results
      result.push({
        ...article,
        summary,
        recommendation: rec
      });
    }
    
    // Sort by recommendation score (highest first) and then by publication date
    return result.sort((a, b) => {
      if (a.recommendation && b.recommendation) {
        if (a.recommendation.relevanceScore !== b.recommendation.relevanceScore) {
          return b.recommendation.relevanceScore - a.recommendation.relevanceScore;
        }
      }
      
      if (!a.pubDate || !b.pubDate) return 0;
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });
  }

  async getUnprocessedArticles(limit = 10): Promise<Article[]> {
    // Get articles that don't have summaries yet
    const articleIds = await db
      .select({
        articleId: articleSummaries.articleId
      })
      .from(articleSummaries);
    
    const processedIds = articleIds.map(item => item.articleId);
    
    let query = db
      .select()
      .from(articles)
      .orderBy(desc(articles.pubDate))
      .limit(limit);
    
    if (processedIds.length > 0) {
      // Use a more straightforward approach - fetch all and filter in-memory for small datasets
      const allArticles = await query;
      // Filter out articles that have already been processed
      return allArticles.filter(article => 
        !processedIds.includes(article.id)
      );
    }
    
    return query;
  }

  // Article Preference methods
  async getArticlePreference(userId: number, articleId: number): Promise<ArticlePreference | undefined> {
    const [preference] = await db
      .select()
      .from(articlePreferences)
      .where(and(
        eq(articlePreferences.userId, userId),
        eq(articlePreferences.articleId, articleId)
      ));
    
    return preference;
  }

  async createArticlePreference(preference: InsertArticlePreference): Promise<ArticlePreference> {
    // Check if preference already exists
    const existingPreference = await this.getArticlePreference(preference.userId, preference.articleId);
    
    if (existingPreference) {
      // Update instead of creating a new one
      return this.updateArticlePreference(existingPreference.id, {
        preference: preference.preference,
        explanation: preference.explanation
      }) as Promise<ArticlePreference>;
    }

    const [newPreference] = await db
      .insert(articlePreferences)
      .values({
        userId: preference.userId,
        articleId: preference.articleId,
        preference: preference.preference,
        explanation: preference.explanation ?? null,
        createdAt: new Date()
      })
      .returning();
    
    return newPreference;
  }

  async updateArticlePreference(id: number, preference: Partial<ArticlePreference>): Promise<ArticlePreference | undefined> {
    const [updatedPreference] = await db
      .update(articlePreferences)
      .set(preference)
      .where(eq(articlePreferences.id, id))
      .returning();
    
    return updatedPreference;
  }

  async getUserArticlePreferences(userId: number): Promise<ArticlePreference[]> {
    return await db
      .select()
      .from(articlePreferences)
      .where(eq(articlePreferences.userId, userId));
  }
  
  async getAllArticlePreferences(): Promise<ArticlePreference[]> {
    try {
      return await db.select().from(articlePreferences);
    } catch (err) {
      console.error('Error getting all article preferences:', err);
      return [];
    }
  }
  
  async getPreferencesForArticle(articleId: number): Promise<ArticlePreference[]> {
    try {
      return await db.select()
        .from(articlePreferences)
        .where(eq(articlePreferences.articleId, articleId));
    } catch (err) {
      console.error(`Error getting preferences for article ${articleId}:`, err);
      return [];
    }
  }
}

// Export the database storage implementation
export const storage = new DatabaseStorage();
