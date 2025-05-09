import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Article, Feed, ArticleSummary, Recommendation } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { useFeedActions } from '@/hooks/useFeedActions';
import { useMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { RecommendationStatusBadge } from './RecommendationStatus';

interface ArticleListProps {
  feedId: number | null;
  onSelectArticle: (article: Article) => void;
  selectedArticle: Article | null;
}

/**
 * Component that displays a list of articles for a selected feed
 * Supports both desktop and mobile interaction patterns
 */
export default function ArticleList({ feedId, onSelectArticle, selectedArticle }: ArticleListProps) {
  const [sortBy, setSortBy] = useState('newest');
  const { refreshFeed, isRefreshing } = useFeedActions();
  // Get mobile status from custom hook
  const isMobile = useMobile();

  // Fetch feed details
  const { 
    data: feed,
    isLoading: feedLoading
  } = useQuery<Feed>({
    queryKey: feedId ? [`/api/feeds/${feedId}`] : ['empty-feed'],
    enabled: !!feedId
  });

  // Fetch articles for the selected feed
  const { 
    data: articles = [], 
    isLoading: articlesLoading,
    refetch: refetchArticles
  } = useQuery<ArticleWithSummary[]>({
    queryKey: feedId ? [`/api/articles?feedId=${feedId}&sortBy=${sortBy}`] : ['empty-articles'],
    enabled: !!feedId
  });
  
  // Auto-select the first article when feed changes or articles load (desktop only)
  useEffect(() => {
    // Only auto-select on desktop view
    // On mobile view, we want to show the article list without auto-selecting
    if (!isMobile && articles && articles.length > 0 && !selectedArticle) {
      onSelectArticle(articles[0]);
    }
  }, [articles, selectedArticle, onSelectArticle, isMobile]);

  const handleRefresh = async () => {
    if (!feedId) return;
    
    await refreshFeed(feedId);
    refetchArticles();
  };

  const getTimeSince = (date?: Date | string | null) => {
    if (!date) return '';
    
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      return '';
    }
  };

  // Create excerpt from either content or description
  const getExcerpt = (article: Article): string => {
    if (article.content) {
      return article.content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .substring(0, 200) + (article.content.length > 200 ? '...' : '');
    } else if (article.description) {
      return article.description.substring(0, 200) + (article.description.length > 200 ? '...' : '');
    }
    return 'No preview available';
  };
  
  // Determine recommendation status of an article
  const getRecommendationStatus = (article: ArticleWithSummary) => {
    if (!article.summary) {
      return "not-processed";
    }
    
    if (article.recommendation) {
      return article.recommendation.relevanceScore >= 50 ? "recommended" : "not-recommended";
    }
    
    return "not-processed";
  };

  if (!feedId) {
    return (
      <div 
        className="w-full md:w-1/3 border-r border-gray-200 bg-white flex flex-col overflow-hidden"
        data-testid="article-list-empty"
      >
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <h3 className="text-lg font-medium text-gray-500">Select a feed to view articles</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full md:w-1/3 border-r border-gray-200 bg-white flex flex-col overflow-hidden"
      data-testid="article-list"
    >
      <div className="py-3 px-4 border-b border-gray-200 flex flex-wrap items-center justify-between bg-white gap-2">
        <div className="flex items-center mr-auto">
          {feedLoading ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <>
              <h2 className="text-lg font-semibold">{feed?.title}</h2>
              {/* Unread count can be added here when implemented */}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh feed"
            className="h-8 w-8"
            data-testid="refresh-button"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="unread">Unread First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {articlesLoading ? (
          <div className="p-4 space-y-4" data-testid="articles-loading">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex items-center justify-center h-full" data-testid="no-articles">
            <p className="text-gray-500">No articles found</p>
          </div>
        ) : (
          <div data-testid="articles-container">
            {articles.map(article => (
              <div 
                key={article.id}
                className={`article-item border-b border-gray-200 px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                  selectedArticle?.id === article.id ? 'bg-blue-50 md:bg-blue-50' : ''
                }`}
                onClick={() => onSelectArticle(article)}
                data-testid="article-item"
                data-article-id={article.id}
              >
                <div className="flex items-center justify-between mb-1">
                  {article.category ? (
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {article.category.split(',')[0]}
                    </span>
                  ) : (
                    <span></span>
                  )}
                  <span className="text-xs text-gray-500">{getTimeSince(article.pubDate)}</span>
                </div>
                <h3 className={`font-semibold text-gray-900 mb-1 ${article.read ? 'text-gray-600' : ''}`}>
                  {article.title}
                </h3>
                
                {article.content ? (
                  <div 
                    className="text-gray-600 text-sm article-preview"
                    dangerouslySetInnerHTML={{ 
                      __html: getExcerpt(article)
                    }}
                  />
                ) : article.description ? (
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {article.description}
                  </p>
                ) : (
                  <p className="text-gray-600 text-sm italic">
                    No preview available
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}