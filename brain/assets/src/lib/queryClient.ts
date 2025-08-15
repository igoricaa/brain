import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1, // Allow 1 retry for transient failures
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false, // Keep this off for our use case
            staleTime: 30 * 1000, // 30 seconds default
            gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
        },
        mutations: {
            retry: false, // Keep mutations without retry
        },
    },
});
