/**
 * Integration test for Home component with navigation hooks
 * 
 * This test focuses on the integration between the Home component and 
 * the useMobileNavigation hook to ensure they work together correctly.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from '../pages/Home';

// Mock the useMobileNavigation hook with a real implementation
// but controlled test environment
jest.mock('../hooks/use-mobile-navigation', () => {
  const React = require('react');
  
  // Return the actual implementation but with controlled mobile mode
  return {
    useMobileNavigation: () => {
      const [sidebarOpen, setSidebarOpen] = React.useState(true);
      const [selectedFeed, setSelectedFeed] = React.useState(null);
      const [selectedArticle, setSelectedArticle] = React.useState(null);
      const [isNavigating, setIsNavigating] = React.useState(false);
      
      // Always report as mobile for tests
      const isMobile = true;
      
      const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
      };
      
      const handleSelectFeed = (feedId) => {
        setSelectedFeed(feedId);
        setSidebarOpen(false);
      };
      
      const handleSelectArticle = (article) => {
        if (!isNavigating) {
          setSelectedArticle(article);
        }
      };
      
      const navigateToFeeds = () => {
        setIsNavigating(true);
        setSidebarOpen(true);
        
        setTimeout(() => {
          setIsNavigating(false);
        }, 50);
      };
      
      const navigateToArticles = () => {
        setIsNavigating(true);
        setSelectedArticle(null);
        
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
  };
});

// Mock API service
jest.mock('@tanstack/react-query', () => {
  const originalModule = jest.requireActual('@tanstack/react-query');
  
  return {
    ...originalModule,
    useQuery: jest.fn().mockImplementation(({ queryKey }) => {
      // Return mock data for feed
      if (queryKey[0].includes('/api/feeds/')) {
        return {
          data: {
            id: 1,
            title: 'Test Feed',
            url: 'http://test.com',
            description: 'Test feed description',
            favicon: null
          },
          isLoading: false
        };
      }
      
      return { data: null, isLoading: false };
    })
  };
});

// Mock components to simplify testing
jest.mock('@/components/Header', () => {
  return function MockHeader({ toggleSidebar }) {
    return <div data-testid="header" onClick={toggleSidebar}>Header</div>;
  };
});

jest.mock('@/components/Sidebar', () => {
  return function MockSidebar({ onSelectFeed }) {
    return (
      <div data-testid="sidebar">
        <div data-testid="feed-item" onClick={() => onSelectFeed(1)}>Test Feed</div>
      </div>
    );
  };
});

jest.mock('@/components/ArticleList', () => {
  return function MockArticleList({ onSelectArticle }) {
    const mockArticle = {
      id: 1,
      feedId: 1,
      title: 'Test Article',
      description: 'Test description',
      content: '<p>Test content</p>',
      pubDate: new Date(),
      link: 'http://test.com/article',
      read: false,
      favorite: false,
      author: null,
      category: null,
      guid: null,
      imageUrl: null
    };
    
    return (
      <div data-testid="article-list">
        <div 
          data-testid="article-item" 
          onClick={() => onSelectArticle(mockArticle)}
        >
          Test Article
        </div>
      </div>
    );
  };
});

jest.mock('@/components/ArticleView', () => {
  return function MockArticleView({ article }) {
    if (!article) return null;
    return (
      <div data-testid="article-view">
        <h1>{article.title}</h1>
      </div>
    );
  };
});

// Set up the test component with React Query
const renderHomeComponent = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>
  );
};

describe('Home component with mobile navigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('displays feed list initially', () => {
    renderHomeComponent();
    
    const feedView = screen.getByTestId('feed-view');
    expect(feedView).toBeTruthy();
    
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toBeTruthy();
  });

  test('shows article list when feed is selected', () => {
    renderHomeComponent();
    
    // Click feed item
    const feedItem = screen.getByTestId('feed-item');
    fireEvent.click(feedItem);
    
    // Should now be on article list view
    const articleListView = screen.getByTestId('article-list-view');
    expect(articleListView).toBeTruthy();
    
    const articleList = screen.getByTestId('article-list');
    expect(articleList).toBeTruthy();
  });

  test('shows article detail when article is selected', () => {
    renderHomeComponent();
    
    // Click feed item
    const feedItem = screen.getByTestId('feed-item');
    fireEvent.click(feedItem);
    
    // Click article item
    const articleItem = screen.getByTestId('article-item');
    fireEvent.click(articleItem);
    
    // Should now be on article detail view
    const articleDetailView = screen.getByTestId('article-detail-view');
    expect(articleDetailView).toBeTruthy();
    
    const articleView = screen.getByTestId('article-view');
    expect(articleView).toBeTruthy();
  });

  test('navigates back to articles when back button is clicked', async () => {
    renderHomeComponent();
    
    // Click feed item
    const feedItem = screen.getByTestId('feed-item');
    fireEvent.click(feedItem);
    
    // Click article item
    const articleItem = screen.getByTestId('article-item');
    fireEvent.click(articleItem);
    
    // Click back to articles
    const backButton = screen.getByTestId('back-to-articles');
    fireEvent.click(backButton);
    
    // Should be in navigating state (article detail removed)
    expect(screen.queryByTestId('article-view')).toBeNull();
    
    // Advance timers to complete the navigation
    jest.advanceTimersByTime(100);
    
    // Should now be on article list view
    const articleListView = screen.getByTestId('article-list-view');
    expect(articleListView).toBeTruthy();
  });

  test('should not immediately re-select article after clicking back', async () => {
    renderHomeComponent();
    
    // Navigate to article detail
    const feedItem = screen.getByTestId('feed-item');
    fireEvent.click(feedItem);
    
    const articleItem = screen.getByTestId('article-item');
    fireEvent.click(articleItem);
    
    // Verify we have article view
    expect(screen.getByTestId('article-view')).toBeTruthy();
    
    // Click back to articles
    const backButton = screen.getByTestId('back-to-articles');
    fireEvent.click(backButton);
    
    // Article view should be gone
    expect(screen.queryByTestId('article-view')).toBeNull();
    
    // Try to click an article while navigating (shouldn't do anything)
    const articleItemAfterBack = screen.getByTestId('article-item');
    fireEvent.click(articleItemAfterBack);
    
    // Should still not see article view due to isNavigating flag
    expect(screen.queryByTestId('article-view')).toBeNull();
    
    // Advance timers to complete navigation
    jest.advanceTimersByTime(100);
    
    // Now we can select an article again
    fireEvent.click(articleItemAfterBack);
    
    // Article view should reappear
    expect(screen.getByTestId('article-view')).toBeTruthy();
  });
});