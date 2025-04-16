import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArticleWithSummary } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, BookOpenIcon, StarIcon, UserIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Header from "@/components/Header";
import ArticleView from "@/components/ArticleView";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Login required component
const LoginRequired = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
    <UserIcon className="h-12 w-12 text-slate-300 mb-4" />
    <h3 className="text-lg font-medium">Login Required</h3>
    <p className="text-sm text-slate-500 mt-2">
      Please log in to see personalized recommendations based on your interests.
    </p>
    <Button asChild className="mt-4">
      <Link href="/">Go to Home</Link>
    </Button>
  </div>
);

// Empty recommendations component
const EmptyRecommendations = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
    <BookOpenIcon className="h-12 w-12 text-slate-300 mb-4" />
    <h3 className="text-lg font-medium">No recommendations yet</h3>
    <p className="text-sm text-slate-500 mt-2">
      We're still learning about your interests. Add more feeds or
      interact with more articles to get personalized recommendations.
    </p>
    <Button asChild className="mt-4">
      <Link href="/">Browse Feeds</Link>
    </Button>
  </div>
);

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="p-4 space-y-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="pt-2">
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

export default function ForYou() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<ArticleWithSummary | null>(null);
  const { toast } = useToast();
  const { user, isLoading: userLoading } = useAuth();

  // Fetch recommended articles - only enabled when user is logged in
  const { data: recommendedArticles, isLoading, refetch: refetchRecommendations } = useQuery({
    queryKey: ["/api/recommendations"],
    select: (data) => data as ArticleWithSummary[],
    enabled: !!user, // Only run query when user is authenticated
  });

  // Mark recommendation as viewed mutation
  const markAsViewedMutation = useMutation({
    mutationFn: async (recommendationId: number) => {
      return apiRequest("POST", `/api/recommendations/${recommendationId}/viewed`, {});
    },
    onSuccess: () => {
      // No need to invalidate cache here as we handle the UI state directly
    },
    onError: () => {
      console.error("Failed to mark recommendation as viewed");
    }
  });

  // Handle article selection with proper state management
  const handleArticleSelect = useCallback((article: ArticleWithSummary) => {
    setSelectedArticle(article);
    
    // Mark the recommendation as viewed if it exists
    if (article.recommendation?.id) {
      markAsViewedMutation.mutate(article.recommendation.id);
    }
  }, [markAsViewedMutation]);

  // Safe way to clear selected article
  const clearSelectedArticle = useCallback(() => {
    // Immediately clear the selected article
    setSelectedArticle(null);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  // Content renderer based on authentication and data state
  const renderContent = () => {
    // Not logged in
    if (!user) {
      return <LoginRequired />;
    }
    
    // Loading
    if (isLoading) {
      return <LoadingSkeleton />;
    }
    
    // Has recommendations
    if (recommendedArticles && recommendedArticles.length > 0) {
      return (
        <div className="p-4 space-y-4">
          {recommendedArticles.map((article) => (
            <div
              key={article.id}
              onClick={() => handleArticleSelect(article)}
              className="p-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors border-l-4 border-transparent"
            >
              <h3 className="font-medium text-lg line-clamp-2">
                {article.title}
              </h3>

              {article.summary && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-3">
                  {article.summary.summary}
                </p>
              )}

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {article.pubDate
                    ? formatDistanceToNow(new Date(article.pubDate), {
                        addSuffix: true,
                      })
                    : "Recently"}
                </div>

                {article.recommendation && (
                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      <StarIcon className="h-3 w-3 mr-1 fill-current" />
                      {article.recommendation.relevanceScore}%
                    </Badge>
                  </div>
                )}
              </div>

              {article.recommendation && (
                <div className="mt-2 text-xs text-slate-600 italic bg-slate-100 dark:bg-slate-800 dark:text-slate-300 p-2 rounded">
                  <span className="font-medium">
                    Why we recommend this:
                  </span>{" "}
                  {article.recommendation.reasonForRecommendation}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    // No recommendations yet
    return <EmptyRecommendations />;
  };

  // Desktop content renderer (same logic but with different styling for selected state)
  const renderDesktopContent = () => {
    // Not logged in
    if (!user) {
      return <LoginRequired />;
    }
    
    // Loading
    if (isLoading) {
      return <LoadingSkeleton />;
    }
    
    // Has recommendations
    if (recommendedArticles && recommendedArticles.length > 0) {
      return (
        <div className="p-4 space-y-4">
          {recommendedArticles.map((article) => (
            <div
              key={article.id}
              onClick={() => handleArticleSelect(article)}
              className={`p-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
                selectedArticle?.id === article.id
                  ? "bg-primary/10 border-l-4 border-primary"
                  : "border-l-4 border-transparent"
              }`}
            >
              <h3 className="font-medium text-lg line-clamp-2">
                {article.title}
              </h3>

              {article.summary && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-3">
                  {article.summary.summary}
                </p>
              )}

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {article.pubDate
                    ? formatDistanceToNow(new Date(article.pubDate), {
                        addSuffix: true,
                      })
                    : "Recently"}
                </div>

                {article.recommendation && (
                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      <StarIcon className="h-3 w-3 mr-1 fill-current" />
                      {article.recommendation.relevanceScore}%
                    </Badge>
                  </div>
                )}
              </div>

              {article.recommendation && (
                <div className="mt-2 text-xs text-slate-600 italic bg-slate-100 dark:bg-slate-800 dark:text-slate-300 p-2 rounded">
                  <span className="font-medium">
                    Why we recommend this:
                  </span>{" "}
                  {article.recommendation.reasonForRecommendation}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    // No recommendations yet
    return <EmptyRecommendations />;
  };

  return (
    <div className="flex flex-col h-screen">
      <Header toggleSidebar={toggleSidebar} />

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Mobile Article Select View */}
        <div
          className={`md:hidden flex flex-col w-full ${selectedArticle ? "hidden" : "flex"} overflow-y-auto`}
        >
          <div className="p-4 border-b bg-gradient-to-r from-primary/90 to-primary/60 text-white">
            <h2 className="text-xl font-bold">For You</h2>
            <p className="text-sm opacity-90">
              Articles tailored to your interests
            </p>
          </div>

          {renderContent()}
        </div>

        {/* Mobile Article View with Back Button */}
        <div
          className={`md:hidden w-full ${selectedArticle ? "flex" : "hidden"} flex-col h-full`}
        >
          <div className="bg-white border-b p-2 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelectedArticle}
              className="mb-1"
            >
              ← Back to recommendations
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ArticleView
              article={selectedArticle}
              feed={null}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Desktop Layout */}
        <div
          className={`hidden md:flex border-r ${sidebarOpen ? "w-96" : "w-0"} transition-all duration-300 overflow-y-auto bg-slate-50 dark:bg-slate-900 flex-col`}
        >
          <div className="p-4 border-b bg-gradient-to-r from-primary/90 to-primary/60 text-white">
            <h2 className="text-xl font-bold">For You</h2>
            <p className="text-sm opacity-90">
              Articles tailored to your interests
            </p>
          </div>

          {renderDesktopContent()}
        </div>

        {/* Article View (Desktop) */}
        <div className="hidden md:block flex-1 overflow-y-auto">
          <ArticleView
            article={selectedArticle}
            feed={null}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
