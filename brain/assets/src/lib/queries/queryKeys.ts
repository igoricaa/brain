/**
 * Centralized query key factory for consistent caching and invalidation
 * Following TanStack Query best practices for hierarchical query keys
 */

export const queryKeys = {
    // Deals
    deals: () => ['deals'] as const,
    deal: (id: string) => [...queryKeys.deals(), id] as const,

    // Assessments
    assessments: () => ['assessments'] as const,
    assessmentsByDeal: (dealId: string) => [...queryKeys.assessments(), 'deal', dealId] as const,
    assessment: (id: string) => [...queryKeys.assessments(), id] as const,

    // Companies
    companies: () => ['companies'] as const,
    company: (id: string) => [...queryKeys.companies(), id] as const,
    companyFounders: (id: string) => [...queryKeys.company(id), 'founders'] as const,
    companyAdvisors: (id: string) => [...queryKeys.company(id), 'advisors'] as const,
    companyGrants: (id: string) => [...queryKeys.company(id), 'grants'] as const,
    companyPatents: (id: string) => [...queryKeys.company(id), 'patents'] as const,
    companyClinicalTrials: (id: string) => [...queryKeys.company(id), 'clinical-trials'] as const,

    // Library
    library: () => ['library'] as const,
    librarySources: () => [...queryKeys.library(), 'sources'] as const,
    libraryFiles: (filters?: Record<string, any>) =>
        [...queryKeys.library(), 'files', filters] as const,

    // Dashboard
    dashboard: () => ['dashboard'] as const,
    dashboardData: (filters?: Record<string, any>) =>
        [...queryKeys.dashboard(), 'data', filters] as const,

    // Dual Use
    dualUse: () => ['dual-use'] as const,
    dualUseSignals: (filters?: Record<string, any>) =>
        [...queryKeys.dualUse(), 'signals', filters] as const,
    dualUseSummary: (filters?: Record<string, any>) =>
        [...queryKeys.dualUse(), 'summary', filters] as const,

    // Files
    files: () => ['files'] as const,
    dealFiles: (dealId: string, filters?: Record<string, any>) =>
        [...queryKeys.files(), 'deal', dealId, filters] as const,

    // People
    people: () => ['people'] as const,
    founders: (filters?: Record<string, any>) =>
        [...queryKeys.people(), 'founders', filters] as const,
    advisors: (filters?: Record<string, any>) =>
        [...queryKeys.people(), 'advisors', filters] as const,
} as const;

/**
 * Helper function to create query keys with type safety
 */
export type QueryKeyFactory = typeof queryKeys;
export type QueryKey = ReturnType<QueryKeyFactory[keyof QueryKeyFactory]>;
