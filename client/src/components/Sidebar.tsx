import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, File, Plus } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CategoryWithFeedCount, FeedWithArticleCount } from '@/lib/types';

interface SidebarProps {
  sidebarOpen: boolean;
  selectedFeed: number | null;
  onSelectFeed: (feedId: number) => void;
}

export default function Sidebar({ sidebarOpen, selectedFeed, onSelectFeed }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { toast } = useToast();

  // Fetch categories
  const { 
    data: categories = [],
    isLoading: categoriesLoading,
    refetch: refetchCategories 
  } = useQuery<CategoryWithFeedCount[]>({
    queryKey: ['/api/categories']
  });

  // Fetch feeds
  const { 
    data: feeds = [],
    isLoading: feedsLoading,
    refetch: refetchFeeds 
  } = useQuery<FeedWithArticleCount[]>({
    queryKey: ['/api/feeds']
  });

  // Set default expanded state for categories with feeds
  useEffect(() => {
    if (categories.length > 0 && feeds.length > 0) {
      // Expand News category by default
      const newsCategory = categories.find(c => c.name === 'News');
      if (newsCategory) {
        setExpandedCategories([newsCategory.id]);
      }
    }
  }, [categories, feeds]);

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getFeedsForCategory = (categoryId: number) => {
    return feeds.filter(feed => feed.categoryId === categoryId);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Category name required",
        description: "Please enter a name for the category",
        variant: "destructive"
      });
      return;
    }

    try {
      await apiRequest('POST', '/api/categories', { name: newCategoryName });
      toast({
        title: "Category added",
        description: `Category "${newCategoryName}" has been added`
      });
      setNewCategoryName('');
      setShowAddCategoryDialog(false);
      refetchCategories();
    } catch (error) {
      toast({
        title: "Failed to add category",
        description: "There was an error adding the category",
        variant: "destructive"
      });
    }
  };

  // Filter feeds based on search term
  const filteredFeeds = feeds.filter(feed => 
    feed.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter categories that have feeds or match search term
  const filteredCategories = categories.filter(category => {
    const categoryFeeds = getFeedsForCategory(category.id);
    return categoryFeeds.length > 0 || category.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const sidebarClasses = `w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ${
    !sidebarOpen ? 'md:translate-x-0 -translate-x-full' : ''
  }`;

  return (
    <>
      <aside className={sidebarClasses}>
        <div className="p-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search feeds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-primary/50"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-3 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <ScrollArea className="px-2 flex-1">
          {(categoriesLoading || feedsLoading) ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div>
              {filteredCategories.map(category => (
                <div key={category.id} className="mb-2">
                  <div 
                    className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center">
                      {expandedCategories.includes(category.id) ? (
                        <ChevronDown className="h-4 w-4 mr-1" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-1" />
                      )}
                      {category.name}
                    </div>
                    <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-xs">
                      {category.feedCount}
                    </span>
                  </div>
                  
                  {expandedCategories.includes(category.id) && (
                    <div className="ml-4 space-y-1">
                      {filteredFeeds
                        .filter(feed => feed.categoryId === category.id)
                        .map(feed => (
                          <div 
                            key={feed.id}
                            className={`flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-100 cursor-pointer ${
                              selectedFeed === feed.id ? 'bg-blue-50 text-primary' : ''
                            }`}
                            onClick={() => onSelectFeed(feed.id)}
                          >
                            <div className="flex items-center">
                              <File className={`h-4 w-4 mr-2 ${selectedFeed === feed.id ? 'text-primary' : 'text-gray-500'}`} />
                              {feed.title}
                            </div>
                            {feed.unreadCount > 0 && (
                              <span className={`${
                                selectedFeed === feed.id 
                                  ? 'bg-primary text-white' 
                                  : 'bg-gray-200 text-gray-700'
                              } px-1.5 py-0.5 rounded-full text-xs`}>
                                {feed.unreadCount}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center"
            onClick={() => setShowAddCategoryDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Category
          </Button>
        </div>
      </aside>

      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
