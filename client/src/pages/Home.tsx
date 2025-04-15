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
    queryKey: selectedFeed ? [`/api/feeds/${selectedFeed}`] : null,
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
    setSelectedArticle(article);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
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
