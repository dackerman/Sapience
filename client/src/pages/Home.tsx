import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ArticleList from '@/components/ArticleList';
import ArticleView from '@/components/ArticleView';
import { Article, Feed } from '@/lib/types';
import { useMobile } from '@/hooks/use-mobile';

export default function Home() {
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [selectedFeed, setSelectedFeed] = useState<number | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

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
    setSelectedArticle(null);
  }, [selectedFeed]);

  // Handle mobile sidebar toggle
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Handle feed selection
  const handleSelectFeed = (feedId: number) => {
    setSelectedFeed(feedId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Handle article selection
  const handleSelectArticle = (article: Article) => {
    // On mobile, set selected article which changes the view
    // On desktop, just update the selected article state
    setSelectedArticle(article);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header toggleSidebar={toggleSidebar} />
      
      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        {/* Three states: feeds > articles > article detail */}
        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto">
            <Sidebar 
              sidebarOpen={true} 
              selectedFeed={selectedFeed} 
              onSelectFeed={handleSelectFeed} 
            />
          </div>
        )}
        
        {!sidebarOpen && selectedFeed && !selectedArticle && (
          <div className="flex-1 overflow-y-auto" key="article-list-view">
            <div className="bg-white border-b p-2 shadow-sm">
              <button 
                onClick={() => setSidebarOpen(true)}
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
          <div className="flex-1 overflow-y-auto flex flex-col" key="article-detail-view">
            <div className="bg-white border-b p-2 shadow-sm">
              <button 
                onClick={() => {
                  // Force state update in the correct order to prevent flickering
                  setSelectedArticle(null);
                }}
                className="text-sm font-medium text-primary flex items-center"
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
