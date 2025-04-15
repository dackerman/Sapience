import { useEffect, useState } from 'react';
import { Clock, Bookmark, Share, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Article, Feed } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface ArticleViewProps {
  article: Article | null;
  feed: Feed | null;
  isLoading: boolean;
}

export default function ArticleView({ article, feed, isLoading }: ArticleViewProps) {
  const { toast } = useToast();
  const [isLoadingExternalContent, setIsLoadingExternalContent] = useState(false);
  
  // Fetch external content if we don't have article content
  const { 
    data: externalContent,
    isLoading: externalContentLoading,
    refetch: refetchExternalContent
  } = useQuery<{content: string}>({
    queryKey: article ? ['/api/articles', article.id, 'content'] : [''],
    enabled: !!article && (!article.content || article.content.length < 100),
    staleTime: Infinity,
    retry: 1
  });

  // Mutation for toggling favorite status
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (article: Article) => {
      const operation = article.favorite ? 'unfavorite' : 'favorite';
      return apiRequest('POST', `/api/articles/${article.id}/action`, { operation });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/articles`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive"
      });
    }
  });

  const handleToggleFavorite = () => {
    if (!article) return;
    toggleFavoriteMutation.mutate(article);
  };

  const openExternalLink = () => {
    if (!article?.link) return;
    window.open(article.link, '_blank', 'noopener,noreferrer');
  };

  const shareArticle = async () => {
    if (!article) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: article.description,
          url: article.link,
        });
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(article.link);
        toast({
          title: "Link copied",
          description: "Article link copied to clipboard"
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Format the date nicely
  const formatDate = (date?: Date | string) => {
    if (!date) return '';
    
    try {
      return format(new Date(date), 'MMMM d, yyyy');
    } catch (error) {
      return '';
    }
  };

  if (!article) {
    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6 text-gray-500">
            <p className="text-lg">Select an article to read</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="border-b border-gray-200 py-3 px-4 md:px-6 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-full md:w-96" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center text-xs text-gray-500 mb-1 gap-1">
                {article.category && (
                  <span className="font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full mr-2">
                    {article.category.split(',')[0]}
                  </span>
                )}
                <span className="truncate">{feed?.title}</span>
                <span className="mx-1 md:mx-2">•</span>
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>{formatDate(article.pubDate)}</span>
                </div>
              </div>
              <h2 className="text-lg md:text-xl font-semibold line-clamp-2">{article.title}</h2>
            </>
          )}
        </div>
        <div className="flex space-x-2 self-end md:self-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFavorite}
            className={`${article.favorite ? 'text-yellow-500' : ''} h-8 w-8 p-0`}
            title={article.favorite ? 'Remove from bookmarks' : 'Add to bookmarks'}
          >
            <Bookmark className="h-4 w-4" fill={article.favorite ? 'currentColor' : 'none'} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={shareArticle}
            className="h-8 w-8 p-0"
            title="Share article"
          >
            <Share className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={openExternalLink}
            className="h-8 w-8 p-0"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 overflow-y-auto p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-4 max-w-3xl mx-auto">
            <Skeleton className="h-36 md:h-48 w-full rounded-lg mb-6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="article-content max-w-3xl mx-auto">
            {article.imageUrl && (
              <img 
                src={article.imageUrl} 
                alt={article.title} 
                className="w-full rounded-lg mb-4 md:mb-6 max-h-64 md:max-h-96 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            )}
            
            {externalContentLoading ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-center mt-4">
                  <p className="text-sm text-gray-500">Fetching original article content...</p>
                </div>
              </div>
            ) : (
              <>
                <div 
                  className="prose prose-sm md:prose-base prose-blue max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: 
                      // Show external content if available, fallback to article content or description
                      (externalContent?.content) || 
                      article.content || 
                      article.description || 
                      '<p>No content available. Click "Read original article" below to view the content on the original website.</p>'
                  }}
                />
                
                <div className="flex justify-end mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchExternalContent()}
                    className="flex items-center gap-1"
                    disabled={externalContentLoading}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh content
                  </Button>
                </div>
                
                <div className="mt-6 md:mt-8 border-t border-gray-200 pt-4">
                  <a 
                    href={article.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center text-sm md:text-base"
                  >
                    Read original article
                    <ExternalLink className="ml-1 h-3 w-3 md:h-4 md:w-4" />
                  </a>
                </div>
              </>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
