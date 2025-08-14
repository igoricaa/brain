import { useQueries } from '@tanstack/react-query';
import { http } from '@/lib/http';

// Type definitions for company-related data
export type Founder = {
    uuid: string;
    founder: {
        uuid: string;
        name?: string | null;
        email?: string | null;
        bio?: string | null;
        linkedin_url?: string | null;
    };
    title?: string | null;
    age_at_founding?: number | null;
    past_significant_employments?: string | null;
    start_date?: string | null;
    end_date?: string | null;
};

export type Advisor = {
    uuid: string;
    advisor?: {
        uuid: string;
        name: string;
        bio?: string | null;
        linkedin_url?: string | null;
        website?: string | null;
        country?: string | null;
        location?: string | null;
    };
    created_at?: string;
    updated_at?: string;
};

export type Grant = {
    uuid: string;
    name?: string | null;
    potential_amount?: number | null;
    amount_awarded?: number | null;
    program_name?: string | null;
    phase?: string | null;
    branch?: string | null;
    award_date?: string | null;
    solicitation_year?: number | null;
    description?: string | null;
    url?: string | null;
};

export type PatentApplication = {
    uuid: string;
    invention_title?: string | null;
    first_inventor_name?: string | null;
    application_number?: string | null;
    status_description?: string | null;
    filing_date?: string | null;
    publication_date?: string | null;
    patent_number?: string | null;
    abstract?: string | null;
};

export type ClinicalStudy = {
    uuid: string;
    title?: string | null;
    lead_sponsor_name?: string | null;
    status?: string | null;
    phase?: string | null;
    start_date_str?: string | null;
    completion_date_str?: string | null;
    primary_purpose?: string | null;
    intervention_type?: string | null;
    brief_summary?: string | null;
};

export type Company = {
    uuid: string;
    name?: string | null;
    description?: string | null;
    website?: string | null;
    headquarters_location?: string | null;
    founded_year?: number | null;
    employee_count?: number | null;
    total_funding?: number | null;
    latest_valuation?: number | null;
    status?: string | null;
};

export type CompanyDataResult = {
    company: Company | null;
    founders: Founder[];
    advisors: Advisor[];
    grants: Grant[];
    patents: PatentApplication[];
    clinicalTrials: ClinicalStudy[];
    loading: boolean;
    errors: {
        company?: string;
        founders?: string;
        advisors?: string;
        grants?: string;
        patents?: string;
        clinicalTrials?: string;
    };
    counts: {
        founders: number;
        advisors: number;
        grants: number;
        patents: number;
        clinicalTrials: number;
        totalGrantFunding: number;
    };
};

type ApiListResponse<T> = {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: T[];
};

/**
 * Hook to load all company-related data in parallel using TanStack Query
 * @param companyUuid - The UUID of the company to fetch data for
 * @param enabled - Whether the queries should be enabled (default: true)
 * @returns Structured company data with loading states and error handling
 */
export function useCompanyData(companyUuid: string | null, enabled = true): CompanyDataResult {
    const results = useQueries({
        queries: [
            // Company details
            {
                queryKey: ['company', companyUuid],
                queryFn: async () => {
                    if (!companyUuid) return null;
                    const response = await http.get(`/companies/companies/${companyUuid}/`);
                    return response.data as Company;
                },
                enabled: enabled && !!companyUuid,
                staleTime: 5 * 60 * 1000, // 5 minutes
            },
            // Founders
            {
                queryKey: ['company-founders', companyUuid],
                queryFn: async () => {
                    if (!companyUuid) return [];
                    console.log('Fetching founders for company:', companyUuid);
                    const response = await http.get(
                        `/companies/founders/?company=${companyUuid}&page_size=50`,
                    );
                    const data = response.data as ApiListResponse<Founder> | Founder[];
                    const result = Array.isArray(data) ? data : data.results || [];
                    console.log('Founders data received:', result);
                    return result;
                },
                enabled: enabled && !!companyUuid,
                staleTime: 5 * 60 * 1000,
            },
            // Advisors
            {
                queryKey: ['company-advisors', companyUuid],
                queryFn: async () => {
                    if (!companyUuid) return [];
                    console.log('Fetching advisors for company:', companyUuid);
                    const response = await http.get(
                        `/companies/advisors/?company=${companyUuid}&page_size=50`,
                    );
                    const data = response.data as ApiListResponse<Advisor> | Advisor[];
                    const result = Array.isArray(data) ? data : data.results || [];
                    console.log('Advisors data received:', result);
                    return result;
                },
                enabled: enabled && !!companyUuid,
                staleTime: 5 * 60 * 1000,
            },
            // Grants
            {
                queryKey: ['company-grants', companyUuid],
                queryFn: async () => {
                    if (!companyUuid) return [];
                    const response = await http.get(
                        `/companies/grants/?company=${companyUuid}&page_size=100`,
                    );
                    const data = response.data as ApiListResponse<Grant> | Grant[];
                    return Array.isArray(data) ? data : data.results || [];
                },
                enabled: enabled && !!companyUuid,
                staleTime: 5 * 60 * 1000,
            },
            // Patents
            {
                queryKey: ['company-patents', companyUuid],
                queryFn: async () => {
                    if (!companyUuid) return [];
                    const response = await http.get(
                        `/companies/patent-applications/?company=${companyUuid}&page_size=100`,
                    );
                    const data = response.data as
                        | ApiListResponse<PatentApplication>
                        | PatentApplication[];
                    return Array.isArray(data) ? data : data.results || [];
                },
                enabled: enabled && !!companyUuid,
                staleTime: 5 * 60 * 1000,
            },
            // Clinical Trials
            {
                queryKey: ['company-clinical-trials', companyUuid],
                queryFn: async () => {
                    if (!companyUuid) return [];
                    const response = await http.get(
                        `/companies/clinical-studies/?company=${companyUuid}&page_size=100`,
                    );
                    const data = response.data as ApiListResponse<ClinicalStudy> | ClinicalStudy[];
                    return Array.isArray(data) ? data : data.results || [];
                },
                enabled: enabled && !!companyUuid,
                staleTime: 5 * 60 * 1000,
            },
        ],
    });

    const [
        companyResult,
        foundersResult,
        advisorsResult,
        grantsResult,
        patentsResult,
        clinicalTrialsResult,
    ] = results;

    // Extract data and handle null cases
    const company = companyResult.data || null;
    const founders = foundersResult.data || [];
    const advisors = advisorsResult.data || [];
    const grants = grantsResult.data || [];
    const patents = patentsResult.data || [];
    const clinicalTrials = clinicalTrialsResult.data || [];

    // Calculate loading state - true if any query is loading
    const loading = results.some((result) => result.isLoading);

    // Collect errors
    const errors: CompanyDataResult['errors'] = {};
    if (companyResult.error) errors.company = String(companyResult.error);
    if (foundersResult.error) errors.founders = String(foundersResult.error);
    if (advisorsResult.error) errors.advisors = String(advisorsResult.error);
    if (grantsResult.error) errors.grants = String(grantsResult.error);
    if (patentsResult.error) errors.patents = String(patentsResult.error);
    if (clinicalTrialsResult.error) errors.clinicalTrials = String(clinicalTrialsResult.error);

    // Calculate counts and totals
    const totalGrantFunding = grants.reduce((total, grant) => {
        const amount = grant.amount_awarded || grant.potential_amount || 0;
        return total + amount;
    }, 0);

    const counts = {
        founders: founders.length,
        advisors: advisors.length,
        grants: grants.length,
        patents: patents.length,
        clinicalTrials: clinicalTrials.length,
        totalGrantFunding,
    };

    return {
        company,
        founders,
        advisors,
        grants,
        patents,
        clinicalTrials,
        loading,
        errors,
        counts,
    };
}
