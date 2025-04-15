import { Category, Feed, Article } from "@shared/schema";

// Re-export the types from schema.ts
export type { Category, Feed, Article };

// Also export the extended types
export type { FeedWithArticleCount, CategoryWithFeedCount } from "@shared/schema";
