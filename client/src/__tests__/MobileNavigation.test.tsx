/// <reference types="jest" />

/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from '../pages/Home';
import { useMobile } from '@/hooks/use-mobile';
import * as reactQuery from '@tanstack/react-query';
import { Router } from 'wouter';
import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';

// Mock the useMobile hook to simulate mobile view
jest.mock('@/hooks/use-mobile', () => ({
  useMobile: jest.fn()
}));

// Mock our API responses
jest.mock('@/lib/queryClient', () => {
  return {
    apiRequest: jest.fn(),
    getQueryFn: jest.fn(),
    queryClient: {
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    }
  };
});

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

const mockFeed = {
  id: 1, 
  title: 'Hacker News', 
  url: 'https://news.ycombinator.com', 
  categoryId: 1, 
  favicon: null, 
  description: null
};

describe('Mobile Navigation Flow', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    
    // Set up our mock implementations
    (useMobile as jest.Mock).mockReturnValue(true);
    
    // Mock useQuery responses
    jest.spyOn(reactQuery, 'useQuery')
      .mockImplementation((options: any) => {
        const queryKey = options.queryKey;
        if (queryKey[0] === '/api/categories') {
          return { data: mockCategories, isLoading: false } as any;
        }
        if (queryKey[0] === '/api/feeds') {
          return { data: mockFeeds, isLoading: false } as any;
        }
        if (queryKey[0] === '/api/articles') {
          return { data: mockArticles, isLoading: false, refetch: jest.fn() } as any;
        }
        if (Array.isArray(queryKey) && queryKey[0].includes('/api/feeds/')) {
          return { data: mockFeed, isLoading: false } as any;
        }
        return { data: undefined, isLoading: false } as any;
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
    expect(screen.getByText('Hacker News')).toBeInTheDocument();
    expect(screen.getByText('Tech Blog')).toBeInTheDocument();
    
    // Step 2: Select a feed to show the article list
    fireEvent.click(screen.getByText('Hacker News'));
    
    // Wait for articles to load and verify article list is shown
    await waitFor(() => {
      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
      expect(screen.getByText('Test Article 2')).toBeInTheDocument();
      // Back to feeds button should be visible
      expect(screen.getByText('← Back to feeds')).toBeInTheDocument();
    });
    
    // Step 3: Select an article to view its details
    fireEvent.click(screen.getByText('Test Article 1'));
    
    // Wait for article detail to load
    await waitFor(() => {
      // Full article content should be visible
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      // Back to articles button should be visible
      expect(screen.getByText('← Back to articles')).toBeInTheDocument();
    });
    
    // Step 4: Navigate back to article list
    fireEvent.click(screen.getByText('← Back to articles'));
    
    // Verify we're back to article list
    await waitFor(() => {
      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
      expect(screen.getByText('Test Article 2')).toBeInTheDocument();
      expect(screen.getByText('← Back to feeds')).toBeInTheDocument();
    });
    
    // Step 5: Navigate back to feeds
    fireEvent.click(screen.getByText('← Back to feeds'));
    
    // Verify we're back to the sidebar
    await waitFor(() => {
      expect(screen.getByText('Hacker News')).toBeInTheDocument();
      expect(screen.getByText('Tech Blog')).toBeInTheDocument();
    });
  });
});