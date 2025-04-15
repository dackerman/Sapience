import { useEffect } from 'react';
import { Clock, Bookmark, Share, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMutation } from '@tanstack/react-query';
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
      <div className="border-b border-gray-200 py-3 px-6 flex justify-between items-center">
        <div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-96" />
            </div>
          ) : (
            <>
              <div className="flex items-center text-xs text-gray-500 mb-1">
                {article.category && (
                  <span className="font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full mr-2">
                    {article.category.split(',')[0]}
                  </span>
                )}
                <span>{feed?.title}</span>
                <span className="mx-2">•</span>
                <Clock className="h-3 w-3 mr-1" />
                <span>{formatDate(article.pubDate)}</span>
              </div>
              <h2 className="text-xl font-semibold">{article.title}</h2>
            </>
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleFavorite}
            className={article.favorite ? 'text-yellow-500' : ''}
            title={article.favorite ? 'Remove from bookmarks' : 'Add to bookmarks'}
          >
            <Bookmark className="h-5 w-5" fill={article.favorite ? 'currentColor' : 'none'} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={shareArticle}
            title="Share article"
          >
            <Share className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={openExternalLink}
            title="Open in new tab"
          >
            <ExternalLink className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-4 max-w-3xl mx-auto">
            <Skeleton className="h-48 w-full rounded-lg mb-6" />
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
                className="w-full rounded-lg mb-6 max-h-96 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            )}
            
            <div 
              className="prose prose-blue max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: article.content || article.description || '' 
              }}
            />
            
            <div className="mt-8 border-t border-gray-200 pt-4">
              <a 
                href={article.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center"
              >
                Read original article
                <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
