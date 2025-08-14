import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { queryKeys } from '@/lib/queries/queryKeys';
import { queryOptions } from '@/lib/queries/queryOptions';

// Library types
export type LibrarySource = {
    uuid: string;
    name: string;
    code?: string | null;
};

export type LibraryFile = {
    uuid: string;
    file?: string | null;
    src_url?: string | null;
    mime_type?: string | null;
    source?: LibrarySource | null;
    created_at?: string;
};

export type LibraryFilesResponse = {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: LibraryFile[];
};

export type LibraryFilesFilters = {
    company?: string;
    source?: string;
    page?: number;
    page_size?: number;
    search?: string;
    mime_type?: string;
};

/**
 * Hook to fetch library sources
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useLibrarySources(enabled = true) {
    return useQuery({
        queryKey: queryKeys.librarySources(),
        queryFn: async ({ signal }) => {
            const response = await http.get('/library/sources/', { signal });

            // Handle both array and paginated response formats
            const data = response.data as LibraryFilesResponse | LibrarySource[];
            const sources = Array.isArray(data) ? data : data.results || [];

            return sources as LibrarySource[];
        },
        enabled,
        ...queryOptions.common.reference,
    });
}

/**
 * Hook to fetch library files with filters
 * @param filters - Filters to apply to the query
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useLibraryFiles(filters: LibraryFilesFilters = {}, enabled = true) {
    // Use deals endpoint when company filter is provided for proper filtering
    const endpoint = filters.company ? '/deals/files/' : '/library/files/';
    const queryKey = filters.company 
        ? queryKeys.dealFiles('company-filtered', filters)
        : queryKeys.libraryFiles(filters);

    return useQuery({
        queryKey,
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();

            if (filters.company) params.set('company', filters.company);
            if (filters.source) params.set('source', filters.source);
            if (filters.page) params.set('page', String(filters.page));
            if (filters.page_size) params.set('page_size', String(filters.page_size));
            if (filters.search) params.set('search', filters.search);
            if (filters.mime_type) params.set('mime_type', filters.mime_type);

            const url = `${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;
            const response = await http.get(url, { signal });

            // Handle both array and paginated response formats
            const data = response.data as LibraryFilesResponse | LibraryFile[];
            const normalized: LibraryFilesResponse = Array.isArray(data)
                ? { count: data.length, results: data }
                : data;

            return normalized;
        },
        enabled: enabled && (filters.company ? !!filters.company : true),
        ...queryOptions.common.paginatedList,
    });
}

/**
 * Hook to fetch library files for a specific company
 * @param companyUuid - The UUID of the company
 * @param page - Page number (default: 1)
 * @param pageSize - Number of items per page (default: 20)
 * @param source - Optional source filter
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useCompanyLibraryFiles(
    companyUuid: string | null,
    page = 1,
    pageSize = 20,
    source?: string | null,
    enabled = true,
) {
    const filters: LibraryFilesFilters = {
        company: companyUuid || undefined,
        page,
        page_size: pageSize,
        ...(source ? { source } : {}),
    };

    return useLibraryFiles(filters, enabled && !!companyUuid);
}

/**
 * Utility function to get display name for a library file
 * @param file - The library file object
 * @returns A user-friendly display name
 */
export function getLibraryFileDisplayName(file: LibraryFile): string {
    if (file.src_url) return file.src_url;

    if (file.file) {
        try {
            const url = new URL(file.file, window.location.origin);
            const parts = url.pathname.split('/');
            return parts[parts.length - 1] || file.file;
        } catch {
            return file.file;
        }
    }

    return file.uuid;
}
