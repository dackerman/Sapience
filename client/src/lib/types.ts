import { Category, Feed, Article, ArticleSummary as Summary, Recommendation } from "@shared/schema";

// Re-export the types from schema.ts
export type { Category, Feed, Article };

// Rename ArticleSummary to avoid confusion with component name
export type ArticleSummary = Summary;

// Also export the extended types
export type { FeedWithArticleCount, CategoryWithFeedCount, ArticleWithSummary } from "@shared/schema";
export type { Recommendation };
