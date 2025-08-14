import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http, normalizeDrfErrors } from '@/lib/http';
import { queryKeys } from '@/lib/queries/queryKeys';
import { queryOptions } from '@/lib/queries/queryOptions';
import { toast } from 'sonner';

// Assessment types
export type DealAssessment = {
    uuid?: string;
    // Manual fields
    problem_solved?: string | null;
    solution?: string | null;
    thesis_fit_evaluation?: string | null;
    thesis_fit_score?: number | null;
    customer_traction?: string | null;
    intellectual_property?: string | null;
    business_model?: string | null;
    tam?: string | null;
    competition?: string | null;
    quality_percentile?: string | null;
    recommendation?: string | null;
    investment_rationale?: string | null;
    pros?: string | null;
    cons?: string | null;
    // AI (auto) fields
    auto_problem_solved?: string | null;
    auto_solution?: string | null;
    auto_thesis_fit_evaluation?: string | null;
    auto_thesis_fit_score?: number | null;
    auto_customer_traction?: string | null;
    auto_intellectual_property?: string | null;
    auto_business_model?: string | null;
    auto_tam?: string | null;
    auto_competition?: string | null;
    auto_quality_percentile?: string | null;
    auto_recommendation?: string | null;
    auto_investment_rationale?: string | null;
    auto_pros?: string | null;
    auto_cons?: string | null;
    created_at?: string;
    updated_at?: string;
};

export type AssessmentListResponse = {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: DealAssessment[];
};

export type AssessmentCreateRequest = Omit<DealAssessment, 'uuid' | 'created_at' | 'updated_at'> & {
    deal: string;
};

export type AssessmentUpdateRequest = Partial<
    Omit<DealAssessment, 'uuid' | 'created_at' | 'updated_at'>
>;

/**
 * Hook to fetch assessments for a deal
 * @param dealUuid - The UUID of the deal
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useAssessments(dealUuid: string | null, enabled = true) {
    return useQuery({
        queryKey: queryKeys.assessmentsByDeal(dealUuid || ''),
        queryFn: async ({ signal }) => {
            if (!dealUuid) throw new Error('Deal UUID is required');

            const params = new URLSearchParams({
                deal: dealUuid,
                ordering: '-created_at',
                page_size: '1',
            });

            const response = await http.get(`/deals/assessments/?${params.toString()}`, {
                signal,
            });

            return response.data as AssessmentListResponse;
        },
        enabled: enabled && !!dealUuid,
        ...queryOptions.common.singleResource,
    });
}

/**
 * Hook to fetch a single assessment
 * @param assessmentUuid - The UUID of the assessment
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useAssessment(assessmentUuid: string | null, enabled = true) {
    return useQuery({
        queryKey: queryKeys.assessment(assessmentUuid || ''),
        queryFn: async ({ signal }) => {
            if (!assessmentUuid) throw new Error('Assessment UUID is required');

            const response = await http.get(`/deals/assessments/${assessmentUuid}/`, {
                signal,
            });

            return response.data as DealAssessment;
        },
        enabled: enabled && !!assessmentUuid,
        ...queryOptions.common.singleResource,
    });
}

/**
 * Hook to create a new assessment
 */
export function useCreateAssessment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AssessmentCreateRequest): Promise<DealAssessment> => {
            const response = await http.post('/deals/assessments/', data);
            return response.data;
        },
        onSuccess: (data, variables) => {
            // Invalidate assessments for this deal
            queryClient.invalidateQueries({
                queryKey: queryKeys.assessmentsByDeal(variables.deal),
            });

            // Set the new assessment in cache
            if (data.uuid) {
                queryClient.setQueryData(queryKeys.assessment(data.uuid), data);
            }

            toast.success('Assessment created successfully');
        },
        onError: (error) => {
            const normalized = normalizeDrfErrors(error);
            toast.error(normalized.formError || 'Failed to create assessment');
        },
    });
}

/**
 * Hook to update an existing assessment
 */
export function useUpdateAssessment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            assessmentUuid,
            dealUuid,
            data,
        }: {
            assessmentUuid: string;
            dealUuid: string;
            data: AssessmentUpdateRequest;
        }): Promise<DealAssessment> => {
            const response = await http.patch(`/deals/assessments/${assessmentUuid}/`, data);
            return response.data;
        },
        onSuccess: (data, variables) => {
            // Update the assessment in cache
            if (data.uuid) {
                queryClient.setQueryData(queryKeys.assessment(data.uuid), data);
            }

            // Invalidate assessments list for this deal
            queryClient.invalidateQueries({
                queryKey: queryKeys.assessmentsByDeal(variables.dealUuid),
            });

            toast.success('Assessment updated successfully');
        },
        onError: (error) => {
            const normalized = normalizeDrfErrors(error);
            toast.error(normalized.formError || 'Failed to update assessment');
        },
    });
}

/**
 * Hook to delete an assessment
 */
export function useDeleteAssessment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (assessmentUuid: string): Promise<void> => {
            await http.delete(`/deals/assessments/${assessmentUuid}/`);
        },
        onSuccess: (_, assessmentUuid) => {
            // Remove from cache
            queryClient.removeQueries({
                queryKey: queryKeys.assessment(assessmentUuid),
            });

            // Invalidate all assessment lists
            queryClient.invalidateQueries({
                queryKey: queryKeys.assessments(),
            });

            toast.success('Assessment deleted successfully');
        },
        onError: (error) => {
            const normalized = normalizeDrfErrors(error);
            toast.error(normalized.formError || 'Failed to delete assessment');
        },
    });
}
