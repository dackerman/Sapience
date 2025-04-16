import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RssIcon, Menu, RefreshCw, Plus, Sparkles } from 'lucide-react';
import { useFeedActions } from '@/hooks/useFeedActions';
import AddFeedModal from './AddFeedModal';
import { Link, useLocation } from 'wouter';

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const [showAddFeedModal, setShowAddFeedModal] = useState(false);
  const { refreshAllFeeds, isRefreshing } = useFeedActions();
  const [location] = useLocation();

  const handleRefreshFeeds = async () => {
    await refreshAllFeeds();
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 py-2 px-4 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-2">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar}
              className="mr-2 md:hidden text-gray-700 hover:text-primary focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center">
              <RssIcon className="h-6 w-6 text-primary" />
              <h1 className="ml-2 text-xl font-semibold text-gray-800">FeedReader</h1>
            </div>
          </div>
          
          {/* Mobile action buttons */}
          <div className="flex sm:hidden items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefreshFeeds}
              disabled={isRefreshing}
              title="Refresh all feeds"
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              onClick={() => setShowAddFeedModal(true)} 
              size="icon"
              className="h-8 w-8 bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Navigation links */}
        <nav className="flex items-center justify-center w-full sm:w-auto gap-1">
          <Link href="/">
            <Button 
              variant={location === '/' ? 'secondary' : 'ghost'} 
              className="text-sm"
            >
              All Feeds
            </Button>
          </Link>
          <Link href="/for-you">
            <Button 
              variant={location === '/for-you' ? 'secondary' : 'ghost'} 
              className="text-sm flex items-center gap-1"
            >
              <Sparkles className="h-3.5 w-3.5" />
              For You
            </Button>
          </Link>
        </nav>
        
        {/* Desktop action buttons */}
        <div className="hidden sm:flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefreshFeeds}
            disabled={isRefreshing}
            title="Refresh all feeds"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowAddFeedModal(true)} className="flex items-center bg-primary hover:bg-primary/90 text-white">
            <Plus className="h-4 w-4 mr-1" />
            Add Feed
          </Button>
        </div>
      </header>

      {showAddFeedModal && (
        <AddFeedModal 
          isOpen={showAddFeedModal} 
          onClose={() => setShowAddFeedModal(false)} 
        />
      )}
    </>
  );
}
