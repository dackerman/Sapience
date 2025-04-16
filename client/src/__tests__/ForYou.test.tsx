/**
 * ForYou.test.tsx
 * Tests for the For You page component focusing on article navigation and state management
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ForYou from '../pages/ForYou';
import '@testing-library/jest-dom';
import { ArticleWithSummary } from '@shared/schema';

// Mock the wouter Link component
jest.mock('wouter', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="mock-link">
      {children}
    </a>
  ),
  useLocation: () => ['/', jest.fn()]
}));

// Mock ArticleView component
jest.mock('../components/ArticleView', () => {
  return {
    __esModule: true,
    default: ({ article, isLoading }: { article: any; isLoading: boolean }) => (
      <div data-testid="article-view">
        {isLoading ? (
          <div>Loading article...</div>
        ) : article ? (
          <div>
            <h1>{article.title}</h1>
            <div>{article.content || article.description}</div>
          </div>
        ) : (
          <div>No article selected</div>
        )}
      </div>
    )
  };
});

// Mock Header component
jest.mock('../components/Header', () => {
  return {
    __esModule: true,
    default: ({ toggleSidebar }: { toggleSidebar: () => void }) => (
      <header data-testid="header">
        <button onClick={toggleSidebar}>Toggle Sidebar</button>
      </header>
    )
  };
});

// Sample recommendation data
const mockRecommendationsData = [
  {
    id: 1,
    feedId: 1,
    title: 'Test Article 1',
    link: 'https://example.com/article1',
    description: 'This is test article 1',
    content: '<p>Full content for article 1</p>',
    author: 'Author 1',
    pubDate: new Date(),
    guid: 'guid1',
    read: false,
    favorite: false,
    category: null,
    imageUrl: null,
    summary: {
      id: 1,
      articleId: 1,
      summary: 'Summary of test article 1',
      processedAt: new Date(),
      keywords: ['test', 'article']
    },
    recommendation: {
      id: 1,
      articleId: 1,
      relevanceScore: 80,
      reasonForRecommendation: 'This matches your interests in testing',
      viewed: false,
      createdAt: new Date()
    }
  },
  {
    id: 2,
    feedId: 1,
    title: 'Test Article 2',
    link: 'https://example.com/article2',
    description: 'This is test article 2',
    content: '<p>Full content for article 2</p>',
    author: 'Author 2',
    pubDate: new Date(),
    guid: 'guid2',
    read: false,
    favorite: false,
    category: null,
    imageUrl: null,
    summary: {
      id: 2,
      articleId: 2,
      summary: 'Summary of test article 2',
      processedAt: new Date(),
      keywords: ['test', 'article']
    },
    recommendation: {
      id: 2,
      articleId: 2,
      relevanceScore: 75,
      reasonForRecommendation: 'This matches your interests in development',
      viewed: false,
      createdAt: new Date()
    }
  }
];

// Cast mock data to ArticleWithSummary
const mockRecommendations = mockRecommendationsData as any as ArticleWithSummary[];

// Mock API responses
jest.mock('@tanstack/react-query', () => {
  const originalModule = jest.requireActual('@tanstack/react-query');
  return {
    ...originalModule,
    useQuery: jest.fn().mockImplementation(({ queryKey }) => {
      if (queryKey[0] === '/api/recommendations') {
        return {
          data: mockRecommendations,
          isLoading: false,
          refetch: jest.fn()
        };
      }
      
      return {
        data: null,
        isLoading: false,
        refetch: jest.fn()
      };
    }),
    useMutation: jest.fn().mockImplementation(() => {
      return {
        mutate: jest.fn(),
        isPending: false,
        isError: false,
        isSuccess: true
      };
    })
  };
});

// Mock the queryClient
jest.mock('@/lib/queryClient', () => {
  return {
    queryClient: {
      invalidateQueries: jest.fn()
    },
    apiRequest: jest.fn().mockImplementation(() => Promise.resolve({}))
  };
});

describe('ForYou Page', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
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

  test('renders the recommendations list', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ForYou />
      </QueryClientProvider>
    );

    // Check if recommendations are rendered in both mobile and desktop layouts
    await waitFor(() => {
      expect(screen.getAllByText('Test Article 1')).toHaveLength(2); // One for mobile, one for desktop
      expect(screen.getAllByText('Test Article 2')).toHaveLength(2);
    });
  });

  test('clicking on an article selects it and shows the article view on mobile', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ForYou />
      </QueryClientProvider>
    );

    // Find the first article in the mobile list and click it
    const mobileArticles = screen.getAllByText('Test Article 1');
    fireEvent.click(mobileArticles[0]); // The first one should be the mobile view

    // The mobile article view should now be visible with the article
    await waitFor(() => {
      const backButton = screen.getByText('← Back to recommendations');
      expect(backButton).toBeInTheDocument();
    });
  });

  test('clicking back button from article view returns to recommendations list', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ForYou />
      </QueryClientProvider>
    );

    // First select an article
    const mobileArticles = screen.getAllByText('Test Article 1');
    fireEvent.click(mobileArticles[0]);

    // Now click the back button
    await waitFor(() => {
      const backButton = screen.getByText('← Back to recommendations');
      fireEvent.click(backButton);
    });

    // Should be back at the recommendations list
    await waitFor(() => {
      // We should see the "For You" heading in the mobile view
      const forYouHeadings = screen.getAllByText('For You');
      // And the mobile article list should be visible again
      expect(forYouHeadings[0]).toBeVisible();
    });
  });

  test('selecting different articles updates the article view', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ForYou />
      </QueryClientProvider>
    );

    // Click the first article
    const article1 = screen.getAllByText('Test Article 1')[0];
    fireEvent.click(article1);

    // The article view should show article 1
    await waitFor(() => {
      const articleViews = screen.getAllByTestId('article-view');
      expect(articleViews[0]).toHaveTextContent('Test Article 1');
    });

    // Go back to recommendations
    const backButton = screen.getByText('← Back to recommendations');
    fireEvent.click(backButton);

    // Click the second article
    await waitFor(() => {
      const article2 = screen.getAllByText('Test Article 2')[0];
      fireEvent.click(article2);
    });

    // The article view should now show article 2
    await waitFor(() => {
      const articleViews = screen.getAllByTestId('article-view');
      expect(articleViews[0]).toHaveTextContent('Test Article 2');
    });
  });
});