import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from '../pages/Home';
import { useMobile } from '../hooks/use-mobile';

// Mock the useMobile hook to simulate mobile view
jest.mock('../hooks/use-mobile', () => ({
  useMobile: jest.fn()
}));

// Mock API responses
jest.mock('../lib/queryClient', () => ({
  apiRequest: jest.fn(),
  getQueryFn: jest.fn(),
  queryClient: new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  }),
}));

// Create a helper function to set up the test component
const renderHomeComponent = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>
  );
};

describe('Mobile Article Navigation', () => {
  // Mock API responses
  beforeEach(() => {
    // Mock the useMobile hook to return true (mobile view)
    (useMobile as jest.Mock).mockReturnValue(true);

    // Mock global fetch
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/feeds')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 1, title: 'Test Feed', url: 'http://test.com/feed' }
          ]),
        });
      }
      
      if (url.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 1, name: 'Test Category', feedCount: 1 }
          ]),
        });
      }
      
      if (url.includes('/api/articles')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { 
              id: 1, 
              feedId: 1, 
              title: 'Test Article', 
              description: 'Test description',
              content: '<p>Test content</p>',
              pubDate: new Date().toISOString(),
              link: 'http://test.com/article',
              read: false
            }
          ]),
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should be able to navigate back from article detail view to article list', async () => {
    // Set up the component
    renderHomeComponent();
    
    // Wait for feeds to load and select the first feed
    await waitFor(() => {
      const feedItem = screen.getByText('Test Feed');
      expect(feedItem).toBeInTheDocument();
      fireEvent.click(feedItem);
    });
    
    // Wait for articles to load and select the first article
    await waitFor(() => {
      const articleItem = screen.getByText('Test Article');
      expect(articleItem).toBeInTheDocument();
      fireEvent.click(articleItem);
    });
    
    // Wait for article view to load
    await waitFor(() => {
      const backButton = screen.getByText('← Back to articles');
      expect(backButton).toBeInTheDocument();
      
      // Try to navigate back to article list
      fireEvent.click(backButton);
    });
    
    // Verify we're back at the article list view
    await waitFor(() => {
      // Should see articles list again
      const articleItem = screen.getByText('Test Article');
      expect(articleItem).toBeInTheDocument();
      
      // Should not see article content
      const articleContent = screen.queryByText('Test content');
      expect(articleContent).not.toBeInTheDocument();
    });
  });
});