import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useFeedActions() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Refresh a specific feed
  const refreshFeedMutation = useMutation({
    mutationFn: async (feedId: number) => {
      setIsRefreshing(true);
      try {
        return await apiRequest('POST', `/api/feeds/${feedId}/refresh`, {});
      } finally {
        setIsRefreshing(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/feeds'] });
      
      if (data.newArticlesCount > 0) {
        toast({
          title: "Feed refreshed",
          description: `${data.newArticlesCount} new articles found`,
        });
      } else {
        toast({
          title: "Feed refreshed",
          description: "No new articles found",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error refreshing feed",
        description: "Failed to refresh the feed. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Refresh all feeds
  const refreshAllFeedsMutation = useMutation({
    mutationFn: async () => {
      setIsRefreshing(true);
      try {
        return await apiRequest('POST', '/api/feeds/refresh/all', {});
      } finally {
        setIsRefreshing(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/feeds'] });
      
      if (data.results.newArticles > 0) {
        toast({
          title: "All feeds refreshed",
          description: `${data.results.newArticles} new articles found`,
        });
      } else {
        toast({
          title: "All feeds refreshed",
          description: "No new articles found",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error refreshing feeds",
        description: "Failed to refresh feeds. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete a feed
  const deleteFeedMutation = useMutation({
    mutationFn: async (feedId: number) => {
      return apiRequest('DELETE', `/api/feeds/${feedId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feeds'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      
      toast({
        title: "Feed deleted",
        description: "The feed has been removed from your collection",
      });
    },
    onError: () => {
      toast({
        title: "Error deleting feed",
        description: "Failed to delete the feed. Please try again.",
        variant: "destructive",
      });
    }
  });

  return {
    refreshFeed: refreshFeedMutation.mutate,
    refreshAllFeeds: refreshAllFeedsMutation.mutate,
    deleteFeed: deleteFeedMutation.mutate,
    isRefreshing: isRefreshing,
  };
}
