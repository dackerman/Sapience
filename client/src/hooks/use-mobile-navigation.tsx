import { useState } from 'react';
import { useMobile } from './use-mobile';
import type { Article } from '@shared/schema';

/**
 * Custom hook for managing mobile navigation state
 * Encapsulates the navigation logic for mobile views
 */
export function useMobileNavigation() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFeed, setSelectedFeed] = useState<number | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const isMobile = useMobile();
  
  // Used to track if we're transitioning between states to prevent race conditions
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Select a feed and hide sidebar on mobile
  const handleSelectFeed = (feedId: number) => {
    setSelectedFeed(feedId);
    
    // Only close sidebar automatically on mobile
    if (isMobile) {
      setSidebarOpen(false);
    }
  };
  
  // Select an article to view
  const handleSelectArticle = (article: Article) => {
    // Only if we're not already navigating (prevents race conditions)
    if (!isNavigating) {
      setSelectedArticle(article);
    }
  };
  
  // Navigate back to feed list
  const navigateToFeeds = () => {
    setIsNavigating(true);
    setSidebarOpen(true);
    
    // Small delay to prevent race conditions
    setTimeout(() => {
      setIsNavigating(false);
    }, 50);
  };
  
  // Navigate back to article list
  const navigateToArticles = () => {
    setIsNavigating(true);
    setSelectedArticle(null);
    
    // Small delay to prevent race conditions
    setTimeout(() => {
      setIsNavigating(false);
    }, 50);
  };
  
  return {
    sidebarOpen,
    selectedFeed,
    selectedArticle,
    isMobile,
    isNavigating,
    toggleSidebar,
    handleSelectFeed,
    handleSelectArticle,
    navigateToFeeds,
    navigateToArticles
  };
}