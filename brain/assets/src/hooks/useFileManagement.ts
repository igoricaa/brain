import { useState, useCallback, useEffect } from 'react';
import { http } from '@/lib/http';
import type { FileTableData } from '@/components/file-manager/FileTable';

export interface DealFile extends FileTableData {
  deal: {
    uuid: string;
    name: string;
  };
}

export interface LibraryFile extends FileTableData {
  source: string;
  is_public: boolean;
}

export interface UploadFileRequest {
  file: File;
  category: string;
  document_type?: string;
  proprietary?: boolean;
  tldr?: string;
  tags?: string[];
}

export interface UpdateFileRequest {
  category?: string;
  document_type?: string;
  proprietary?: boolean;
  tldr?: string;
  tags?: string[];
}

export interface FileFilters {
  category?: string[];
  processing_status?: string[];
  file_type?: string[];
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const useFileManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error helper
  const clearError = useCallback(() => setError(null), []);

  // Deal File Operations
  const getDealFiles = useCallback(async (
    dealUuid: string, 
    filters?: FileFilters
  ): Promise<PaginatedResponse<DealFile>> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('deal', dealUuid);
      
      if (filters?.category?.length) {
        filters.category.forEach(cat => params.append('category', cat));
      }
      if (filters?.processing_status?.length) {
        filters.processing_status.forEach(status => params.append('processing_status', status));
      }
      if (filters?.file_type?.length) {
        filters.file_type.forEach(type => params.append('file_type', type));
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }
      if (filters?.page) {
        params.append('page', String(filters.page));
      }
      if (filters?.page_size) {
        params.append('page_size', String(filters.page_size));
      }
      if (filters?.ordering) {
        params.append('ordering', filters.ordering);
      }
      
      const response = await http.get<PaginatedResponse<DealFile>>(
        `/deals/files/?${params.toString()}`
      );
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to fetch deal files';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadDealFile = useCallback(async (
    dealUuid: string,
    fileData: UploadFileRequest,
    onProgress?: (progress: number) => void
  ): Promise<DealFile> => {
    setError(null);
    
    const formData = new FormData();
    formData.append('file', fileData.file);
    formData.append('deal', dealUuid);
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
      const response = await http.post<DealFile>('/deals/files/', formData, {
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

  const updateDealFile = useCallback(async (
    fileUuid: string,
    data: UpdateFileRequest
  ): Promise<DealFile> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await http.patch<DealFile>(`/deals/files/${fileUuid}/`, data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to update file';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDealFile = useCallback(async (fileUuid: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await http.delete(`/deals/files/${fileUuid}/`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to delete file';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reprocessDealFile = useCallback(async (fileUuid: string): Promise<DealFile> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await http.post<DealFile>(`/deals/files/${fileUuid}/reprocess/`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to reprocess file';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Library File Operations
  const getLibraryFiles = useCallback(async (
    filters?: FileFilters
  ): Promise<PaginatedResponse<LibraryFile>> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (filters?.category?.length) {
        filters.category.forEach(cat => params.append('category', cat));
      }
      if (filters?.processing_status?.length) {
        filters.processing_status.forEach(status => params.append('processing_status', status));
      }
      if (filters?.file_type?.length) {
        filters.file_type.forEach(type => params.append('file_type', type));
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }
      if (filters?.page) {
        params.append('page', String(filters.page));
      }
      if (filters?.page_size) {
        params.append('page_size', String(filters.page_size));
      }
      if (filters?.ordering) {
        params.append('ordering', filters.ordering);
      }
      
      const response = await http.get<PaginatedResponse<LibraryFile>>(
        `/library/files/?${params.toString()}`
      );
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to fetch library files';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadLibraryFile = useCallback(async (
    fileData: UploadFileRequest & { is_public?: boolean; source?: string },
    onProgress?: (progress: number) => void
  ): Promise<LibraryFile> => {
    setError(null);
    
    const formData = new FormData();
    formData.append('file', fileData.file);
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
    if (fileData.is_public !== undefined) {
      formData.append('is_public', String(fileData.is_public));
    }
    if (fileData.source) {
      formData.append('source', fileData.source);
    }

    try {
      const response = await http.post<LibraryFile>('/library/files/', formData, {
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

  const updateLibraryFile = useCallback(async (
    fileUuid: string,
    data: UpdateFileRequest & { is_public?: boolean; source?: string }
  ): Promise<LibraryFile> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await http.patch<LibraryFile>(`/library/files/${fileUuid}/`, data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to update file';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteLibraryFile = useCallback(async (fileUuid: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await http.delete(`/library/files/${fileUuid}/`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to delete file';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reprocessLibraryFile = useCallback(async (fileUuid: string): Promise<LibraryFile> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await http.post<LibraryFile>(`/library/files/${fileUuid}/reprocess/`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to reprocess file';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Bulk Operations
  const bulkDeleteFiles = useCallback(async (
    fileUuids: string[],
    mode: 'deal' | 'library'
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = mode === 'deal' 
        ? '/deals/files/bulk_delete/' 
        : '/library/files/bulk_delete/';
        
      await http.post(endpoint, { file_uuids: fileUuids });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to delete files';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const bulkUpdateFiles = useCallback(async (
    fileUuids: string[],
    data: UpdateFileRequest,
    mode: 'deal' | 'library'
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = mode === 'deal' 
        ? '/deals/files/bulk_update/' 
        : '/library/files/bulk_update/';
        
      await http.post(endpoint, { file_uuids: fileUuids, ...data });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to update files';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const bulkReprocessFiles = useCallback(async (
    fileUuids: string[],
    mode: 'deal' | 'library'
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = mode === 'deal' 
        ? '/deals/files/bulk_reprocess/' 
        : '/library/files/bulk_reprocess/';
        
      await http.post(endpoint, { file_uuids: fileUuids });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to reprocess files';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // File download
  const downloadFile = useCallback(async (fileUuid: string, mode: 'deal' | 'library'): Promise<void> => {
    try {
      const endpoint = mode === 'deal' 
        ? `/deals/files/${fileUuid}/download/` 
        : `/library/files/${fileUuid}/download/`;
        
      const response = await http.get(endpoint, { responseType: 'blob' });
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Try to get filename from response headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'download';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to download file';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Real-time status updates (placeholder for WebSocket integration)
  const subscribeToFileUpdates = useCallback((
    fileUuids: string[],
    onUpdate: (fileUuid: string, status: string) => void
  ) => {
    // TODO: Implement WebSocket connection for real-time updates
    // For now, this is a placeholder that can be implemented later
    console.log('Subscribing to file updates:', fileUuids);
    
    // Return cleanup function
    return () => {
      console.log('Unsubscribing from file updates');
    };
  }, []);

  return {
    // State
    isLoading,
    error,
    clearError,
    
    // Deal file operations
    getDealFiles,
    uploadDealFile,
    updateDealFile,
    deleteDealFile,
    reprocessDealFile,
    
    // Library file operations
    getLibraryFiles,
    uploadLibraryFile,
    updateLibraryFile,
    deleteLibraryFile,
    reprocessLibraryFile,
    
    // Bulk operations
    bulkDeleteFiles,
    bulkUpdateFiles,
    bulkReprocessFiles,
    
    // Utility functions
    downloadFile,
    subscribeToFileUpdates,
  };
};