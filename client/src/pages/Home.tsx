import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ArticleList from '@/components/ArticleList';
import ArticleView from '@/components/ArticleView';
import type { Feed } from '@shared/schema';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';

export default function Home() {
  // Use our custom hook for navigation state
  const { 
    sidebarOpen, 
    selectedFeed, 
    selectedArticle, 
    isMobile,
    toggleSidebar, 
    handleSelectFeed, 
    handleSelectArticle,
    navigateToFeeds,
    navigateToArticles
  } = useMobileNavigation();

  // Fetch selected feed details
  const { 
    data: feed,
    isLoading: feedLoading
  } = useQuery<Feed>({
    queryKey: selectedFeed ? [`/api/feeds/${selectedFeed}`] : ['empty-feed'],
    enabled: !!selectedFeed
  });

  // Reset selected article when feed changes
  useEffect(() => {
    if (selectedArticle && selectedArticle.feedId !== selectedFeed) {
      navigateToArticles();
    }
  }, [selectedFeed]);

  return (
    <div className="h-screen flex flex-col">
      <Header toggleSidebar={toggleSidebar} />
      
      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        {/* Three states: feeds > articles > article detail */}
        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto" data-testid="feed-view">
            <Sidebar 
              sidebarOpen={true} 
              selectedFeed={selectedFeed} 
              onSelectFeed={handleSelectFeed} 
            />
          </div>
        )}
        
        {!sidebarOpen && selectedFeed && !selectedArticle && (
          <div className="flex-1 overflow-y-auto" data-testid="article-list-view">
            <div className="bg-white border-b p-2 shadow-sm">
              <button 
                onClick={navigateToFeeds}
                className="text-sm font-medium text-primary flex items-center"
              >
                ← Back to feeds
              </button>
            </div>
            <ArticleList 
              feedId={selectedFeed} 
              onSelectArticle={handleSelectArticle} 
              selectedArticle={null} /* Mobile view always passes null to prevent highlighting */ 
            />
          </div>
        )}
        
        {!sidebarOpen && selectedArticle && (
          <div className="flex-1 overflow-y-auto flex flex-col" data-testid="article-detail-view">
            <div className="bg-white border-b p-2 shadow-sm">
              <button 
                onClick={navigateToArticles}
                className="text-sm font-medium text-primary flex items-center"
                data-testid="back-to-articles"
              >
                ← Back to articles
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ArticleView 
                article={selectedArticle} 
                feed={feed || null}
                isLoading={feedLoading} 
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <Sidebar 
          sidebarOpen={sidebarOpen} 
          selectedFeed={selectedFeed} 
          onSelectFeed={handleSelectFeed} 
        />
        
        <ArticleList 
          feedId={selectedFeed} 
          onSelectArticle={handleSelectArticle} 
          selectedArticle={selectedArticle} 
        />
        
        <ArticleView 
          article={selectedArticle} 
          feed={feed || null}
          isLoading={feedLoading} 
        />
      </div>
    </div>
  );
}
