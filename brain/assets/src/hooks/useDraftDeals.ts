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

export const useDraftDeals = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDraftDeal = useCallback(async (data: CreateDraftDealRequest): Promise<DraftDeal> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await http.post<DraftDeal>('/deals/drafts/', data);
      return response.data;
    } catch (err: any) {
      // Pass through the full validation error data for better error handling
      const errorData = err.response?.data || { detail: 'Failed to create draft deal' };
      const errorMessage = JSON.stringify(errorData);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateDraftDeal = useCallback(async (uuid: string, data: Partial<CreateDraftDealRequest>): Promise<DraftDeal> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await http.patch<DraftDeal>(`/deals/drafts/${uuid}/`, data);
      return response.data;
    } catch (err: any) {
      // Pass through the full validation error data for better error handling
      const errorData = err.response?.data || { detail: 'Failed to update draft deal' };
      const errorMessage = JSON.stringify(errorData);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadDraftFile = useCallback(async (
    draftUuid: string, 
    fileData: UploadDraftFileRequest,
    onProgress?: (progress: number) => void
  ): Promise<DraftDealFile> => {
    setError(null);
    
    const formData = new FormData();
    formData.append('file', fileData.file);
    formData.append('deal', draftUuid);
    formData.append('category', fileData.category);
    
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

    try {
      const response = await http.post<DraftDealFile>('/deals/files/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to upload file';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const finalizeDraftDeal = useCallback(async (uuid: string): Promise<DraftDeal> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await http.post<DraftDeal>(`/deals/drafts/${uuid}/finalize/`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to finalize draft deal';
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
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to fetch draft deal';
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
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to delete draft deal';
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