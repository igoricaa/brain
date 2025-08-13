import { useState, useCallback } from 'react';
import { http } from '@/lib/http';

export interface DraftDeal {
    uuid: string;
    name: string;
    description?: string;
    website?: string;
    funding_target?: string;
    company?: {
        uuid: string;
        name: string;
    };
    created_at: string;
    updated_at: string;
}

export interface CreateDraftDealRequest {
    name: string;
    description?: string;
    website?: string;
    funding_target?: string;
}

export interface DraftDealFile {
    uuid: string;
    name: string;
    file_type: string;
    file_size: number;
    category: string;
    document_type?: string;
    proprietary: boolean;
    tldr?: string;
    tags: string[];
    processing_status: string;
    created_at: string;
}

export interface UploadDraftFileRequest {
    file: File;
    category: string;
    document_type?: string;
    proprietary?: boolean;
    tldr?: string;
    tags?: string[];
}

export interface DraftDealValidationError {
    file?: string | string[];
    deal?: string | string[];
    category?: string | string[];
    document_type?: string | string[];
    proprietary?: string | string[];
    tldr?: string | string[];
    tags?: string | string[];
    detail?: string;
    non_field_errors?: string | string[];
}

export interface ApiErrorResponse {
    response?: {
        data?: DraftDealValidationError;
        status?: number;
    };
    message?: string;
}

export const useDraftDeals = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createDraftDeal = useCallback(
        async (data: CreateDraftDealRequest): Promise<DraftDeal> => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await http.post<DraftDeal>('/deals/drafts/', data);
                return response.data;
            } catch (err: unknown) {
                // Pass through the full validation error data for better error handling
                const apiError = err as ApiErrorResponse;
                const errorData = apiError.response?.data || {
                    detail: 'Failed to create draft deal',
                };
                const errorMessage = JSON.stringify(errorData);
                setError(errorMessage);
                throw new Error(errorMessage);
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    const updateDraftDeal = useCallback(
        async (uuid: string, data: Partial<CreateDraftDealRequest>): Promise<DraftDeal> => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await http.patch<DraftDeal>(`/deals/drafts/${uuid}/`, data);
                return response.data;
            } catch (err: unknown) {
                // Pass through the full validation error data for better error handling
                const apiError = err as ApiErrorResponse;
                const errorData = apiError.response?.data || {
                    detail: 'Failed to update draft deal',
                };
                const errorMessage = JSON.stringify(errorData);
                setError(errorMessage);
                throw new Error(errorMessage);
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    const uploadDraftFile = useCallback(
        async (
            draftUuid: string,
            fileData: UploadDraftFileRequest,
            onProgress?: (progress: number) => void,
        ): Promise<DraftDealFile> => {
            setError(null);

            // CRITICAL FIX: FormData construction for file uploads
            // The key fix is NOT setting Content-Type header manually - browsers must set it
            // with the boundary parameter for multipart/form-data uploads
            const formData = new FormData();
            formData.append('file', fileData.file);
            formData.append('deal', draftUuid); // References draft deal UUID
            formData.append('category', fileData.category);

            // Optional fields
            if (fileData.document_type) {
                formData.append('document_type', fileData.document_type);
            }
            if (fileData.proprietary !== undefined) {
                formData.append('proprietary', String(fileData.proprietary));
            }
            if (fileData.tldr) {
                formData.append('tldr', fileData.tldr);
            }
            if (fileData.tags && fileData.tags.length > 0) {
                formData.append('tags', JSON.stringify(fileData.tags));
            }

            // Debug logging in development
            if (process.env.NODE_ENV === 'development') {
                console.log('Draft file upload:', {
                    draftUuid,
                    fileName: fileData.file.name,
                    fileSize: fileData.file.size,
                    category: fileData.category,
                });
            }

            try {
                const response = await http.post<DraftDealFile>('/deals/files/', formData, {
                    // CRITICAL: Don't set Content-Type header - let browser set it with boundary for FormData
                    // Previously this was set to 'multipart/form-data' which broke the boundary parameter
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total && onProgress) {
                            const progress = Math.round(
                                (progressEvent.loaded * 100) / progressEvent.total,
                            );
                            onProgress(progress);
                        }
                    },
                });

                return response.data;
            } catch (err: unknown) {
                // Handle validation errors from Django REST Framework
                let errorMessage = 'Failed to upload file';

                const apiError = err as ApiErrorResponse;

                if (apiError.response?.data) {
                    const errorData = apiError.response.data;

                    if (errorData.file) {
                        // File field validation error
                        const fileError = Array.isArray(errorData.file)
                            ? errorData.file[0]
                            : errorData.file;
                        errorMessage = `File upload error: ${fileError}`;
                    } else if (errorData.deal) {
                        // Deal field validation error
                        const dealError = Array.isArray(errorData.deal)
                            ? errorData.deal[0]
                            : errorData.deal;
                        errorMessage = `Deal reference error: ${dealError}`;
                    } else if (errorData.category) {
                        // Category field validation error
                        const categoryError = Array.isArray(errorData.category)
                            ? errorData.category[0]
                            : errorData.category;
                        errorMessage = `Category error: ${categoryError}`;
                    } else if (errorData.detail) {
                        // Generic detail error
                        errorMessage = errorData.detail;
                    } else if (errorData.non_field_errors) {
                        // Non-field validation errors
                        const nonFieldError = Array.isArray(errorData.non_field_errors)
                            ? errorData.non_field_errors[0]
                            : errorData.non_field_errors;
                        errorMessage = `Validation error: ${nonFieldError}`;
                    }
                } else if (apiError.message) {
                    errorMessage = apiError.message;
                }

                setError(errorMessage);
                throw new Error(errorMessage);
            }
        },
        [],
    );

    const finalizeDraftDeal = useCallback(async (uuid: string): Promise<DraftDeal> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await http.post<DraftDeal>(`/deals/drafts/${uuid}/finalize/`);
            return response.data;
        } catch (err: unknown) {
            const apiError = err as ApiErrorResponse;
            const errorMessage = apiError.response?.data?.detail || 'Failed to finalize draft deal';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const getDraftDeal = useCallback(async (uuid: string): Promise<DraftDeal> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await http.get<DraftDeal>(`/deals/drafts/${uuid}/`);
            return response.data;
        } catch (err: unknown) {
            const apiError = err as ApiErrorResponse;
            const errorMessage = apiError.response?.data?.detail || 'Failed to fetch draft deal';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const deleteDraftDeal = useCallback(async (uuid: string): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            await http.delete(`/deals/drafts/${uuid}/`);
        } catch (err: unknown) {
            const apiError = err as ApiErrorResponse;
            const errorMessage = apiError.response?.data?.detail || 'Failed to delete draft deal';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        createDraftDeal,
        updateDraftDeal,
        uploadDraftFile,
        finalizeDraftDeal,
        getDraftDeal,
        deleteDraftDeal,
        isLoading,
        error,
        clearError: () => setError(null),
    };
};
