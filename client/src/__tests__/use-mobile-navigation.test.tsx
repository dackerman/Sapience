import { renderHook, act } from '@testing-library/react';
import { useMobileNavigation } from '../hooks/use-mobile-navigation';

// Mock the useMobile hook
jest.mock('../hooks/use-mobile', () => ({
  useMobile: jest.fn().mockReturnValue(true)
}));

describe('useMobileNavigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('initial state should show sidebar with no feed or article selected', () => {
    const { result } = renderHook(() => useMobileNavigation());
    
    expect(result.current.sidebarOpen).toBe(true);
    expect(result.current.selectedFeed).toBeNull();
    expect(result.current.selectedArticle).toBeNull();
  });

  test('selecting a feed should update state and hide sidebar on mobile', () => {
    const { result } = renderHook(() => useMobileNavigation());
    
    act(() => {
      result.current.handleSelectFeed(1);
    });
    
    expect(result.current.selectedFeed).toBe(1);
    expect(result.current.sidebarOpen).toBe(false);
  });

  test('selecting an article should update state', () => {
    const { result } = renderHook(() => useMobileNavigation());
    
    // First select a feed
    act(() => {
      result.current.handleSelectFeed(1);
    });
    
    // Then select an article
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
    
    act(() => {
      result.current.handleSelectArticle(mockArticle);
    });
    
    expect(result.current.selectedArticle).toEqual(mockArticle);
  });

  test('navigating back to articles should clear selected article with a navigation delay', () => {
    const { result } = renderHook(() => useMobileNavigation());
    
    // First select a feed
    act(() => {
      result.current.handleSelectFeed(1);
    });
    
    // Then select an article
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
    
    act(() => {
      result.current.handleSelectArticle(mockArticle);
    });
    
    // Now navigate back to articles
    act(() => {
      result.current.navigateToArticles();
    });
    
    // Article should be cleared immediately
    expect(result.current.selectedArticle).toBeNull();
    
    // But we should be in navigating state
    expect(result.current.isNavigating).toBe(true);
    
    // After the delay, we should no longer be navigating
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    expect(result.current.isNavigating).toBe(false);
  });

  test('should not select article during navigation transition', () => {
    const { result } = renderHook(() => useMobileNavigation());
    
    // First select a feed
    act(() => {
      result.current.handleSelectFeed(1);
    });
    
    // Start navigation (e.g., going back to feeds)
    act(() => {
      result.current.navigateToArticles();
    });
    
    // Now try to select an article during navigation
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
    
    act(() => {
      result.current.handleSelectArticle(mockArticle);
    });
    
    // The article should not be selected because we're in a navigation state
    expect(result.current.selectedArticle).toBeNull();
    
    // Complete the navigation
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Now we can select an article
    act(() => {
      result.current.handleSelectArticle(mockArticle);
    });
    
    expect(result.current.selectedArticle).toEqual(mockArticle);
  });
});