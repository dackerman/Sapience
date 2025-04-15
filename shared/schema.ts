import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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

export type FeedWithArticleCount = Feed & { articleCount: number, unreadCount: number };
export type CategoryWithFeedCount = Category & { feedCount: number };
