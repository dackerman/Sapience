import {
  feeds, type Feed, type InsertFeed,
  categories, type Category, type InsertCategory,
  articles, type Article, type InsertArticle,
  type FeedWithArticleCount, type CategoryWithFeedCount,
  userProfiles, type UserProfile, type InsertUserProfile,
  articleSummaries, type ArticleSummary, type InsertArticleSummary,
  recommendations, type Recommendation, type InsertRecommendation,
  type ArticleWithSummary
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
  
  // User Profile methods
  getUserProfile(): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile | undefined>;
  
  // Article Summary methods
  getArticleSummary(articleId: number): Promise<ArticleSummary | undefined>;
  getArticleSummaries(processedSince?: Date): Promise<ArticleSummary[]>;
  createArticleSummary(summary: InsertArticleSummary): Promise<ArticleSummary>;
  
  // Recommendation methods
  getRecommendations(viewed?: boolean): Promise<Recommendation[]>;
  getRecommendationForArticle(articleId: number): Promise<Recommendation | undefined>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  markRecommendationAsViewed(id: number): Promise<Recommendation | undefined>;
  
  // Combined query for "For You" page
  getRecommendedArticles(): Promise<ArticleWithSummary[]>;
  getUnprocessedArticles(limit?: number): Promise<Article[]>;
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

  // Stub implementations for "For You" feature - not used in MemStorage
  async getUserProfile(): Promise<UserProfile | undefined> {
    return undefined;
  }
  
  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    throw new Error("Not implemented in MemStorage");
  }
  
  async updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile | undefined> {
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
  
  async getRecommendations(viewed?: boolean): Promise<Recommendation[]> {
    return [];
  }
  
  async getRecommendationForArticle(articleId: number): Promise<Recommendation | undefined> {
    return undefined;
  }
  
  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    throw new Error("Not implemented in MemStorage");
  }
  
  async markRecommendationAsViewed(id: number): Promise<Recommendation | undefined> {
    return undefined;
  }
  
  async getRecommendedArticles(): Promise<ArticleWithSummary[]> {
    return [];
  }
  
  async getUnprocessedArticles(limit?: number): Promise<Article[]> {
    return [];
  }
}

// Database implementation
import { db } from "./db";
import { and, eq, desc, asc, isNull, count, sql, not, notInArray } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // User methods - Not implemented for PostgreSQL as we don't have users table
  async getUser(id: number): Promise<User | undefined> {
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    throw new Error("Users not implemented in database version");
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
  async getUserProfile(): Promise<UserProfile | undefined> {
    // Since we only have one user profile in this version, just get the first one
    const [profile] = await db
      .select()
      .from(userProfiles)
      .limit(1);
    
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    // First check if a profile already exists
    const existingProfile = await this.getUserProfile();
    
    if (existingProfile) {
      // If a profile already exists, update it instead
      return this.updateUserProfile(profile) as Promise<UserProfile>;
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

  async updateUserProfile(profileUpdate: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const existingProfile = await this.getUserProfile();
    
    if (!existingProfile) {
      return undefined;
    }

    const [updatedProfile] = await db
      .update(userProfiles)
      .set({
        ...profileUpdate,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.id, existingProfile.id))
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
          keywords: Array.isArray(summary.keywords) ? summary.keywords : [],
          processedAt: new Date()
        })
        .where(eq(articleSummaries.id, existingSummary.id))
        .returning();
      
      return updatedSummary;
    }

    // Insert a new summary
    const summaryToInsert = {
      articleId: summary.articleId,
      summary: summary.summary,
      keywords: Array.isArray(summary.keywords) ? summary.keywords : summary.keywords ? [summary.keywords.toString()] : []
    };

    const [newSummary] = await db
      .insert(articleSummaries)
      .values(summaryToInsert)
      .returning();
    
    return newSummary;
  }

  // Recommendation methods
  async getRecommendations(viewed?: boolean): Promise<Recommendation[]> {
    if (viewed !== undefined) {
      const results = await db
        .select()
        .from(recommendations)
        .where(eq(recommendations.viewed, viewed));
      
      return results;
    }
    
    const results = await db
      .select()
      .from(recommendations);
    
    return results;
  }

  async getRecommendationForArticle(articleId: number): Promise<Recommendation | undefined> {
    const [recommendation] = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.articleId, articleId));
    
    return recommendation;
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    // Check if a recommendation already exists for this article
    const existingRecommendation = await this.getRecommendationForArticle(recommendation.articleId);
    
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

  // Combined queries for "For You" page
  async getRecommendedArticles(): Promise<ArticleWithSummary[]> {
    // Get all unviewed recommendations
    const unviewedRecs = await this.getRecommendations(false);
    
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
      // Use db.query instead of db.execute to get properly typed results
      const result = await db.query.articles.findMany({
        where: sql`"id" NOT IN (${processedIds.join(',')})`,
        orderBy: (articles, { desc }) => [desc(articles.pubDate)],
        limit: limit
      });
      return result;
    }
    
    return query;
  }
}

// Export the database storage implementation
export const storage = new DatabaseStorage();
