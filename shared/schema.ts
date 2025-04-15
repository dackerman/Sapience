import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Feed Category table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Feed table
export const feeds = pgTable("feeds", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  favicon: text("favicon"),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id),
  lastFetched: timestamp("last_fetched"),
  autoRefresh: boolean("auto_refresh").default(false),
});

export const insertFeedSchema = createInsertSchema(feeds).pick({
  url: true,
  categoryId: true,
  autoRefresh: true,
});

export type InsertFeed = z.infer<typeof insertFeedSchema>;
export type Feed = typeof feeds.$inferSelect;

// Articles table
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  feedId: integer("feed_id").references(() => feeds.id).notNull(),
  title: text("title").notNull(),
  link: text("link").notNull(),
  description: text("description"),
  content: text("content"),
  author: text("author"),
  category: text("category"),
  pubDate: timestamp("pub_date"),
  guid: text("guid").unique(),
  read: boolean("read").default(false),
  favorite: boolean("favorite").default(false),
  imageUrl: text("image_url"),
});

export const insertArticleSchema = createInsertSchema(articles).pick({
  feedId: true,
  title: true,
  link: true,
  description: true,
  content: true,
  author: true,
  category: true,
  pubDate: true,
  guid: true,
  imageUrl: true,
});

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;

// User Profile schema for storing interest preferences
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  interests: text("interests").notNull(),  // Text field for storing interests
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).pick({
  interests: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// Article Summaries schema
export const articleSummaries = pgTable("article_summaries", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articles.id),
  summary: text("summary").notNull(),
  keywords: json("keywords").$type<string[]>(),
  processedAt: timestamp("processed_at").defaultNow(),
});

export const insertArticleSummarySchema = createInsertSchema(articleSummaries).pick({
  articleId: true,
  summary: true,
  keywords: true,
});

export type InsertArticleSummary = z.infer<typeof insertArticleSummarySchema>;
export type ArticleSummary = typeof articleSummaries.$inferSelect;

// Recommendations schema
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articles.id),
  relevanceScore: integer("relevance_score").notNull(),  // 1-100 score
  reasonForRecommendation: text("reason").notNull(),
  viewed: boolean("viewed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRecommendationSchema = createInsertSchema(recommendations).pick({
  articleId: true,
  relevanceScore: true,
  reasonForRecommendation: true,
});

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

// Validation schema for adding a new feed
export const validateFeedUrlSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  categoryId: z.number().optional(),
  autoRefresh: z.boolean().optional(),
});

// Schema for article operations
export const articleOperationSchema = z.object({
  id: z.number(),
  operation: z.enum(["read", "unread", "favorite", "unfavorite"]),
});

// User profile schema validation
export const userProfileSchema = z.object({
  interests: z.string().min(10, "Please describe your interests in at least 10 characters"),
});

export type FeedWithArticleCount = Feed & { articleCount: number, unreadCount: number };
export type CategoryWithFeedCount = Category & { feedCount: number };
export type ArticleWithSummary = Article & { 
  summary?: ArticleSummary, 
  recommendation?: Recommendation 
};
