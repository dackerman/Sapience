import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ForYou from "../pages/ForYou";

// Mock the hooks and components
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock("@/components/Header", () => {
  return function MockHeader({ toggleSidebar }: { toggleSidebar: () => void }) {
    return (
      <div data-testid="header">
        <button onClick={toggleSidebar}>Toggle Sidebar</button>
      </div>
    );
  };
});

jest.mock("@/components/ArticleView", () => {
  return function MockArticleView({ 
    article, 
    isLoading 
  }: { 
    article: any | null;
    feed: any;
    isLoading: boolean;
  }) {
    if (!article) {
      return <div data-testid="article-view">No article selected</div>;
    }
    
    return (
      <div data-testid="article-view">
        <h1>{article.title}</h1>
        <div>{article.content}</div>
      </div>
    );
  };
});

jest.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-testid="link">
      {children}
    </a>
  ),
}));

// Mock data
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

// Mock react-query hooks
jest.mock('@tanstack/react-query', () => {
  const original = jest.requireActual('@tanstack/react-query');
  return {
    ...original,
    useQuery: jest.fn().mockImplementation(({ queryKey }) => {
      if (queryKey[0] === '/api/recommendations') {
        return {
          data: mockRecommendationsData,
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

    // Check if recommendations are rendered in mobile layout
    await waitFor(() => {
      expect(screen.getAllByText('Test Article 1')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Test Article 2')[0]).toBeInTheDocument();
    });
  });

  test('clicking on an article selects it and shows the article view on mobile', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ForYou />
      </QueryClientProvider>
    );

    // Find the first article in the mobile list and click it
    await waitFor(() => {
      const articleElements = screen.getAllByText('Test Article 1');
      fireEvent.click(articleElements[0]); // Click the first one
    });

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
    await waitFor(() => {
      const articleElements = screen.getAllByText('Test Article 1');
      fireEvent.click(articleElements[0]);
    });

    // Now click the back button
    await waitFor(() => {
      const backButton = screen.getByText('← Back to recommendations');
      fireEvent.click(backButton);
    });

    // Should be back at the recommendations list
    // We allow a small delay for the state update to complete (via setTimeout)
    await waitFor(() => {
      const forYouHeadings = screen.getAllByText('For You');
      expect(forYouHeadings[0]).toBeVisible();
    }, { timeout: 1000 });
  });

  test('selecting different articles updates the article view', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ForYou />
      </QueryClientProvider>
    );

    // Click the first article
    await waitFor(() => {
      const articleElements = screen.getAllByText('Test Article 1');
      fireEvent.click(articleElements[0]);
    });

    // Go back to recommendations
    await waitFor(() => {
      const backButton = screen.getByText('← Back to recommendations');
      fireEvent.click(backButton);
    });

    // Click the second article
    await waitFor(() => {
      const articleElements = screen.getAllByText('Test Article 2');
      fireEvent.click(articleElements[0]);
    });

    // The article view should now show article 2
    await waitFor(() => {
      const articleViews = screen.getAllByTestId('article-view');
      expect(articleViews[0]).toHaveTextContent('Test Article 2');
    });
  });
});