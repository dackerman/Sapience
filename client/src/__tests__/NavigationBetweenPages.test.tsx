import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ForYou from "../pages/ForYou";
import Home from "../pages/Home";

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

jest.mock("@/components/Sidebar", () => {
  return function MockSidebar() {
    return (
      <div data-testid="sidebar">
        <a href="/">Home</a>
        <a href="/for-you">For You</a>
      </div>
    );
  };
});

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

// Mock feed data
const mockFeedsData = [
  {
    id: 1,
    categoryId: 1,
    title: 'Test Feed 1',
    url: 'https://example.com/feed1',
    description: 'Test Feed 1 Description',
    favicon: null,
    lastFetched: new Date(),
    articleCount: 5,
    unreadCount: 3
  }
];

// Mock feeds by category
const mockFeedsByCategoryData: Record<number, typeof mockFeedsData> = {
  1: mockFeedsData
};

// Mock articles data
const mockArticlesData = [
  {
    id: 1,
    feedId: 1,
    title: 'Feed Article 1',
    link: 'https://example.com/article1',
    description: 'This is feed article 1',
    content: '<p>Full content for feed article 1</p>',
    author: 'Author 1',
    pubDate: new Date(),
    guid: 'guid1',
    read: false,
    favorite: false,
    category: null,
    imageUrl: null
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
      if (queryKey[0] === '/api/categories') {
        return {
          data: [{ id: 1, name: 'News', feedCount: 1 }],
          isLoading: false
        };
      }
      if (queryKey[0] === '/api/feeds') {
        if (queryKey.length > 1) {
          // This is for getFeedsByCategory
          const categoryId = queryKey[1];
          return {
            data: mockFeedsByCategoryData[categoryId] || [],
            isLoading: false
          };
        }
        return {
          data: mockFeedsData,
          isLoading: false
        };
      }
      if (queryKey[0] === '/api/articles') {
        return {
          data: mockArticlesData,
          isLoading: false
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

// Mock wouter
jest.mock('wouter', () => {
  const React = require('react');
  
  // Mock Route component
  const Route = ({ path, component: Component }: { path: string, component: React.ComponentType }) => {
    // Only render if the path matches mockPath
    if (path === mockPath) {
      return <Component />;
    }
    return null;
  };
  
  // Mock Link component
  const Link = ({ href, children }: { href: string, children: React.ReactNode }) => {
    return (
      <a 
        href={href} 
        onClick={(e) => {
          e.preventDefault();
          mockPath = href;
        }}
      >
        {children}
      </a>
    );
  };
  
  return {
    Route,
    Link,
    Switch: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useLocation: () => [mockPath, (path: string) => { mockPath = path; }]
  };
});

// Mock path for navigation testing
let mockPath = '/';

describe('Cross-Page Navigation Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Mock window.location to test navigation
    Object.defineProperty(window, 'location', {
      value: {
        href: '/',
        pathname: '/'
      },
      writable: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('can navigate from Home to ForYou page and back without issues', async () => {
    // Import Route from the mocked wouter
    const { Route } = require('wouter');
    
    render(
      <QueryClientProvider client={queryClient}>
        <div id="app-root">
          <Route path="/" component={Home} />
          <Route path="/for-you" component={ForYou} />
        </div>
      </QueryClientProvider>
    );

    // Find the For You link in sidebar and click it
    await waitFor(() => {
      const forYouLink = screen.getByText('For You');
      fireEvent.click(forYouLink);
    });

    // Verify we're on the For You page by checking for a recommendation
    await waitFor(() => {
      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
    });

    // Go back to the Home page
    await waitFor(() => {
      const homeLink = screen.getByText('Home');
      fireEvent.click(homeLink);
    });

    // Verify we're on the Home page
    await waitFor(() => {
      expect(screen.getByText('Feed Article 1')).toBeInTheDocument();
    });
  });

  test('navigating to ForYou page, selecting an article, and going back works properly', async () => {
    // Import Route from the mocked wouter
    const { Route } = require('wouter');
    
    render(
      <QueryClientProvider client={queryClient}>
        <div id="app-root">
          <Route path="/" component={Home} />
          <Route path="/for-you" component={ForYou} />
        </div>
      </QueryClientProvider>
    );

    // Navigate to For You page
    await waitFor(() => {
      const forYouLink = screen.getByText('For You');
      fireEvent.click(forYouLink);
    });

    // Select first article
    await waitFor(() => {
      const article = screen.getByText('Test Article 1');
      fireEvent.click(article);
    });

    // Verify article view is displayed
    await waitFor(() => {
      expect(screen.getByText('← Back to recommendations')).toBeInTheDocument();
    });

    // Go back to recommendations list
    await waitFor(() => {
      const backButton = screen.getByText('← Back to recommendations');
      fireEvent.click(backButton);
    });

    // Verify recommendations list is visible again
    await waitFor(() => {
      expect(screen.getByText('Articles tailored to your interests')).toBeVisible();
    });

    // Navigate back to Home page
    await waitFor(() => {
      const homeLink = screen.getByText('Home');
      fireEvent.click(homeLink);
    });

    // Verify we're on the Home page
    await waitFor(() => {
      expect(screen.getByText('Feed Article 1')).toBeInTheDocument();
    });
  });
});