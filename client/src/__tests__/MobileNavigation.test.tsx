/// <reference types="jest" />

/**
 * @jest-environment jsdom
 */

import React from 'react';
import '@testing-library/jest-dom'; // Import the jest-dom matchers
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import Home from '../pages/Home';
import { useMobile } from '@/hooks/use-mobile';
import type { Feed, Article } from '@shared/schema';

// Create mock implementations
jest.mock('@/hooks/use-mobile', () => ({
  useMobile: jest.fn(() => true) // Mock as mobile view
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

jest.mock('@/hooks/useFeedActions', () => ({
  useFeedActions: () => ({
    createFeed: jest.fn(),
    deleteFeed: jest.fn(),
    refreshFeed: jest.fn(),
    refreshAllFeeds: jest.fn(),
    isRefreshing: false
  }),
}));

jest.mock('@/lib/queryClient', () => ({
  apiRequest: jest.fn(),
  getQueryFn: jest.fn(),
  queryClient: {
    invalidateQueries: jest.fn(),
    defaultOptions: { queries: { retry: false } }
  }
}));

// Sample data for our tests
const mockCategories = [
  { id: 1, name: 'News', feedCount: 2 }
];

const mockFeeds = [
  { id: 1, title: 'Hacker News', url: 'https://news.ycombinator.com', categoryId: 1, favicon: null, description: null, articleCount: 5, unreadCount: 3 },
  { id: 2, title: 'Tech Blog', url: 'https://techblog.com', categoryId: 1, favicon: null, description: null, articleCount: 3, unreadCount: 1 }
];

const mockArticles = [
  { 
    id: 1, 
    feedId: 1, 
    title: 'Test Article 1', 
    link: 'https://example.com/1', 
    description: 'Description 1', 
    content: '<p>Content 1</p>', 
    pubDate: new Date().toISOString(),
    read: false,
    favorite: false
  },
  { 
    id: 2, 
    feedId: 1, 
    title: 'Test Article 2', 
    link: 'https://example.com/2', 
    description: 'Description 2', 
    content: '<p>Content 2</p>', 
    pubDate: new Date().toISOString(),
    read: false,
    favorite: false
  }
];

// Mock components used by Home
jest.mock('@/components/Header', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="header">Header</div>
  };
});

jest.mock('@/components/Sidebar', () => {
  return {
    __esModule: true,
    default: ({ onSelectFeed }: { onSelectFeed: (id: number) => void }) => (
      <div data-testid="sidebar">
        <div onClick={() => onSelectFeed(1)}>Hacker News</div>
        <div onClick={() => onSelectFeed(2)}>Tech Blog</div>
      </div>
    )
  };
});

jest.mock('@/components/ArticleList', () => {
  return {
    __esModule: true,
    default: ({ onSelectArticle }: { onSelectArticle: (article: Article) => void }) => (
      <div data-testid="article-list">
        <div onClick={() => onSelectArticle(mockArticles[0])}>Test Article 1</div>
        <div onClick={() => onSelectArticle(mockArticles[1])}>Test Article 2</div>
      </div>
    )
  };
});

jest.mock('@/components/ArticleView', () => {
  return {
    __esModule: true,
    default: ({ article }: { article: Article | null }) => (
      article && <div data-testid="article-view">
        <p>{article.content.replace(/<\/?p>/g, '')}</p>
      </div>
    )
  };
});

// Mock modules
jest.mock('wouter', () => ({
  Router: ({ children }: { children: React.ReactNode }) => children,
  useLocation: jest.fn(() => ['/']),
  useRoute: jest.fn(() => [false, {}]),
}));

// Mock tanstack query hooks
jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn(() => ({
    defaultOptions: {},
    invalidateQueries: jest.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useQuery: jest.fn().mockImplementation(({ queryKey }) => {
    if (queryKey && queryKey[0] === '/api/categories') {
      return { data: mockCategories, isLoading: false };
    }
    
    if (queryKey && queryKey[0] === '/api/feeds') {
      return { data: mockFeeds, isLoading: false };
    }
    
    if (queryKey && queryKey[0] === '/api/articles') {
      return { data: mockArticles, isLoading: false, refetch: jest.fn() };
    }
    
    if (queryKey && typeof queryKey[0] === 'string' && queryKey[0].includes('/api/feeds/')) {
      return { 
        data: { 
          id: 1, 
          title: 'Hacker News', 
          url: 'https://news.ycombinator.com', 
          categoryId: 1, 
          favicon: null, 
          description: null 
        }, 
        isLoading: false 
      };
    }
    
    return { data: undefined, isLoading: false };
  }),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false
  }))
}));

describe('Mobile Navigation Flow', () => {
  // Using any here because we've mocked QueryClient
  let queryClient: any;
  
  beforeEach(() => {
    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should navigate from sidebar to article list to article detail and back', async () => {
    render(
      <Router base="/">
        <QueryClientProvider client={queryClient}>
          <Home />
        </QueryClientProvider>
      </Router>
    );

    // Step 1: Verify sidebar is shown with feed options
    const mobileView = screen.getByTestId('feed-view');
    expect(mobileView).toBeInTheDocument();
    const hackerNewsElement = within(mobileView).getByText('Hacker News');
    expect(hackerNewsElement).toBeInTheDocument();
    expect(within(mobileView).getByText('Tech Blog')).toBeInTheDocument();
    
    // Step 2: Select a feed to show the article list
    fireEvent.click(hackerNewsElement);
    
    // Wait for articles to load and verify article list is shown
    const articleListView = await waitFor(() => screen.getByTestId('article-list-view'));
    
    await waitFor(() => {
      expect(within(articleListView).getByText('Test Article 1')).toBeInTheDocument();
      expect(within(articleListView).getByText('Test Article 2')).toBeInTheDocument();
      // Back to feeds button should be visible
      expect(within(articleListView).getByText('← Back to feeds')).toBeInTheDocument();
    });
    
    // Step 3: Select an article to view its details
    fireEvent.click(within(articleListView).getByText('Test Article 1'));
    
    // Wait for article detail to load
    const articleDetailView = await waitFor(() => screen.getByTestId('article-detail-view'));
    
    await waitFor(() => {
      // Full article content should be visible
      expect(within(articleDetailView).getByText('Content 1')).toBeInTheDocument();
      // Back to articles button should be visible
      expect(within(articleDetailView).getByText('← Back to articles')).toBeInTheDocument();
    });
    
    // Step 4: Navigate back to article list
    fireEvent.click(within(articleDetailView).getByText('← Back to articles'));
    
    // Verify we're back to article list
    const articleListView2 = await waitFor(() => screen.getByTestId('article-list-view'));
    
    await waitFor(() => {
      expect(within(articleListView2).getByText('Test Article 1')).toBeInTheDocument();
      expect(within(articleListView2).getByText('Test Article 2')).toBeInTheDocument();
      expect(within(articleListView2).getByText('← Back to feeds')).toBeInTheDocument();
    });
    
    // Step 5: Navigate back to feeds
    fireEvent.click(within(articleListView2).getByText('← Back to feeds'));
    
    // Verify we're back to the sidebar
    const feedView = await waitFor(() => screen.getByTestId('feed-view'));
    await waitFor(() => {
      expect(within(feedView).getByText('Hacker News')).toBeInTheDocument();
      expect(within(feedView).getByText('Tech Blog')).toBeInTheDocument();
    });
  });
});