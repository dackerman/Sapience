import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RssIcon, Menu, RefreshCw, Plus } from 'lucide-react';
import { useFeedActions } from '@/hooks/useFeedActions';
import AddFeedModal from './AddFeedModal';

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const [showAddFeedModal, setShowAddFeedModal] = useState(false);
  const { refreshAllFeeds, isRefreshing } = useFeedActions();

  const handleRefreshFeeds = async () => {
    await refreshAllFeeds();
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 py-2 px-4 flex items-center justify-between shadow-sm">
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
        <div className="flex items-center space-x-3">
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
