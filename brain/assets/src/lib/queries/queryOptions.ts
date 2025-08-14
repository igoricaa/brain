/**
 * Shared query options and configurations for consistent behavior across hooks
 */

import { keepPreviousData } from '@tanstack/react-query';

// Define stale times first to avoid circular reference
const staleTime = {
    short: 30 * 1000, // 30 seconds - for frequently changing data
    medium: 5 * 60 * 1000, // 5 minutes - for semi-static data
    long: 30 * 60 * 1000, // 30 minutes - for static reference data
} as const;

export const queryOptions = {
    // Standard stale times based on data volatility
    staleTime,

    // Common query configurations
    common: {
        // For paginated lists with filters
        paginatedList: {
            staleTime: staleTime.short,
            placeholderData: keepPreviousData,
        },

        // For single resource fetching
        singleResource: {
            staleTime: staleTime.medium,
        },

        // For dashboard/summary data
        dashboard: {
            staleTime: staleTime.short,
            refetchOnMount: true,
        },

        // For reference data (sources, categories, etc.)
        reference: {
            staleTime: staleTime.long,
            cacheTime: 60 * 60 * 1000, // 1 hour
        },
    },
} as const;
