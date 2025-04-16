/**
 * Mock providers wrapper for testing
 * 
 * This file provides a utility component that wraps React components in
 * all necessary providers for testing, with default mocked implementations.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';

// Create a default query client for testing
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0, // Using gcTime instead of deprecated cacheTime
      staleTime: 0,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {}, // Silence errors in tests
  }
});

interface MockProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  route?: string;
}

export const MockProviders: React.FC<MockProvidersProps> = ({ 
  children, 
  queryClient = createTestQueryClient(),
  route = '/',
}) => {
  return (
    <Router base="/" hook={() => [route, () => {}]}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </Router>
  );
};