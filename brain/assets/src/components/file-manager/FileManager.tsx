import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Upload,
    FileText,
    Database,
    RefreshCw,
    AlertCircle,
    Save,
    CheckCircle2,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import FileUpload, { UploadFile } from './FileUpload';
import FileTable, { FileTableData } from './FileTable';
import UploadProgressOverlay, { UploadState } from './UploadProgressOverlay';
import { useDraftDeals } from '@/hooks/useDraftDeals';
import { useFileManagement } from '@/hooks/useFileManagement';
import { sanitizeError, getUserFriendlyMessage } from '@/utils/errorSanitization';

export interface FileManagerProps {
    mode: 'draft-deal' | 'existing-deal' | 'library';
    dealId?: string;
    onDraftSubmit?: (draftId: string) => void;
    onCancel?: () => void;
    allowSubmission?: boolean;
    showUpload?: boolean;
}

export interface FileMetadata {
    name: string;
    type: string;
    size: number;
    lastModified: number;
    category?: string;
    documentType?: string;
    proprietary?: boolean;
    tldr?: string;
}

export default function FileManager({
    mode,
    dealId,
    onDraftSubmit,
    onCancel,
    allowSubmission = true,
    showUpload = true,
}: FileManagerProps) {
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
    
    // Existing draft files (already uploaded to backend)
    const [existingDraftFiles, setExistingDraftFiles] = useState<FileTableData[]>([]);
    const [loadingDraftFiles, setLoadingDraftFiles] = useState(false);

    // File management state
    const [dealFiles, setDealFiles] = useState<FileTableData[]>([]);
    const [libraryFiles, setLibraryFiles] = useState<FileTableData[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);

    // Form state (backend-only)
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isCreatingDraft, setIsCreatingDraft] = useState(false);

    // Upload progress state
    const [uploadState, setUploadState] = useState<UploadState>({
        isUploading: false,
        currentFile: 0,
        totalFiles: 0,
        currentFileName: '',
        overallProgress: 0,
        fileProgress: 0,
        errors: [],
        isCompleted: false,
    });

    const {
        createDraftDeal,
        updateDraftDeal,
        uploadDraftFile,
        finalizeDraftDeal,
        isLoading: isDraftLoading,
        error: draftError,
        clearError,
    } = useDraftDeals();

    const {
        getDealFiles,
        uploadDealFile,
        updateDealFile,
        deleteDealFile,
        reprocessDealFile,
        getLibraryFiles,
        uploadLibraryFile,
        updateLibraryFile,
        deleteLibraryFile,
        reprocessLibraryFile,
        bulkDeleteFiles,
        bulkUpdateFiles,
        bulkReprocessFiles,
        downloadFile,
        isLoading: fileManagementLoading,
        error: fileManagementError,
        clearError: clearFileManagementError,
    } = useFileManagement();

    // Initialize currentDraftId from dealId prop when in draft mode
    useEffect(() => {
        if (mode === 'draft-deal' && dealId && dealId !== currentDraftId) {
            setCurrentDraftId(dealId);
        }
    }, [mode, dealId, currentDraftId]);

    // Load existing draft files when currentDraftId changes
    useEffect(() => {
        const loadDraftFiles = async () => {
            if (mode !== 'draft-deal' || !currentDraftId) {
                setExistingDraftFiles([]);
                return;
            }

            setLoadingDraftFiles(true);
            try {
                clearFileManagementError();
                const response = await getDealFiles(currentDraftId);
                setExistingDraftFiles(response.results);
            } catch (error) {
                console.error('Error loading draft files:', error);
                const sanitizedError = sanitizeError(error, 'Draft file loading');
                const userFriendlyMessage = getUserFriendlyMessage(sanitizedError, 'Draft file loading');
                toast.error('Failed to load draft files', {
                    description: userFriendlyMessage,
                    duration: 4000,
                });
            } finally {
                setLoadingDraftFiles(false);
            }
        };

        loadDraftFiles();
    }, [mode, currentDraftId, getDealFiles, clearFileManagementError]);

    const handleFileAdd = useCallback((newFiles: File[]) => {
        const uploadFiles: UploadFile[] = newFiles.map((file, index) => ({
            id: `${Date.now()}_${index}`,
            file,
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            status: 'pending',
            progress: 0,
        }));

        setFiles((prev) => [...prev, ...uploadFiles]);
    }, []);

    const handleFileRemove = useCallback((fileId: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
    }, []);

    // Load files based on mode
    const loadFiles = useCallback(async () => {
        if (mode === 'draft-deal') return;

        setFilesLoading(true);
        try {
            clearFileManagementError();

            if (mode === 'existing-deal' && dealId) {
                const response = await getDealFiles(dealId);
                setDealFiles(response.results);
            } else if (mode === 'library') {
                const response = await getLibraryFiles();
                setLibraryFiles(response.results);
            }
        } catch (error) {
            console.error('Error loading files:', error);
            const sanitizedError = sanitizeError(error, 'File loading');
            const userFriendlyMessage = getUserFriendlyMessage(sanitizedError, 'File loading');
            toast.error('Failed to load files', {
                description: userFriendlyMessage,
                duration: 4000,
            });
        } finally {
            setFilesLoading(false);
        }
    }, [mode, dealId, getDealFiles, getLibraryFiles, clearFileManagementError]);

    // Load files on mount and when mode/dealId changes
    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    // File table handlers
    const handleFileUpdate = useCallback(
        async (fileId: string, data: any) => {
            if (mode === 'existing-deal') {
                await updateDealFile(fileId, data);
            } else if (mode === 'library') {
                await updateLibraryFile(fileId, data);
            }
        },
        [mode, updateDealFile, updateLibraryFile],
    );

    const handleFileDelete = useCallback(
        async (fileId: string) => {
            try {
                if (mode === 'existing-deal') {
                    await deleteDealFile(fileId);
                } else if (mode === 'library') {
                    await deleteLibraryFile(fileId);
                } else if (mode === 'draft-deal') {
                    // Delete draft file using the same API endpoint
                    await deleteDealFile(fileId);
                    // Remove the file from existingDraftFiles state immediately
                    setExistingDraftFiles(prev => prev.filter(file => file.uuid !== fileId));
                    toast.success('File removed successfully');
                }
            } catch (error) {
                console.error('Error deleting file:', error);
                const sanitizedError = sanitizeError(error, 'File deletion');
                const userFriendlyMessage = getUserFriendlyMessage(sanitizedError, 'File deletion');
                toast.error('Failed to delete file', {
                    description: userFriendlyMessage,
                    duration: 4000,
                });
            }
        },
        [mode, deleteDealFile, deleteLibraryFile, setExistingDraftFiles],
    );

    const handleFileReprocess = useCallback(
        async (fileId: string) => {
            if (mode === 'existing-deal') {
                await reprocessDealFile(fileId);
            } else if (mode === 'library') {
                await reprocessLibraryFile(fileId);
            }
        },
        [mode, reprocessDealFile, reprocessLibraryFile],
    );

    const handleFileDownload = useCallback(
        async (fileId: string) => {
            await downloadFile(fileId, mode === 'existing-deal' ? 'deal' : 'library');
        },
        [downloadFile, mode],
    );

    const handleBulkDelete = useCallback(
        async (fileIds: string[]) => {
            await bulkDeleteFiles(fileIds, mode === 'existing-deal' ? 'deal' : 'library');
        },
        [bulkDeleteFiles, mode],
    );

    const handleBulkUpdate = useCallback(
        async (fileIds: string[], data: any) => {
            await bulkUpdateFiles(fileIds, data, mode === 'existing-deal' ? 'deal' : 'library');
        },
        [bulkUpdateFiles, mode],
    );

    const handleBulkReprocess = useCallback(
        async (fileIds: string[]) => {
            await bulkReprocessFiles(fileIds, mode === 'existing-deal' ? 'deal' : 'library');
        },
        [bulkReprocessFiles, mode],
    );

    const handleCloseUploadOverlay = useCallback(() => {
        setUploadState({
            isUploading: false,
            currentFile: 0,
            totalFiles: 0,
            currentFileName: '',
            overallProgress: 0,
            fileProgress: 0,
            errors: [],
            isCompleted: false,
        });
    }, []);

    // Simple save draft handler for new UI
    const handleSimpleSaveDraft = useCallback(async () => {
        try {
            clearError();
            setSubmitError(null);

            let draftDeal;
            if (currentDraftId) {
                // Use existing draft
                draftDeal = { uuid: currentDraftId };
            } else {
                // Create new draft
                draftDeal = await createDraftDeal({
                    name: 'Untitled Deal',
                });
                setCurrentDraftId(draftDeal.uuid);
            }

            // Upload files one by one to the draft
            for (const uploadFile of files) {
                await uploadDraftFile(draftDeal.uuid, {
                    file: uploadFile.file,
                    category: 'other', // Default category for simplified version
                    proprietary: false,
                });
            }

            // Clear files after upload since they're now saved to backend
            setFiles([]);

            // Reload existing draft files to show the newly uploaded files
            try {
                const response = await getDealFiles(draftDeal.uuid);
                setExistingDraftFiles(response.results);
            } catch (error) {
                console.error('Error reloading draft files:', error);
                // Don't show error toast as the main operation succeeded
            }

            // Show success message but stay on the same page (no redirect)
            toast.success('Draft saved successfully');
        } catch (error) {
            console.error('Error saving draft:', error);
            const sanitizedError = sanitizeError(error, 'Draft save');
            const userFriendlyMessage = getUserFriendlyMessage(sanitizedError, 'Draft save');
            setSubmitError(userFriendlyMessage);
            toast.error('Failed to save draft', {
                description: userFriendlyMessage,
            });
        }
    }, [files, currentDraftId, createDraftDeal, uploadDraftFile, clearError]);

    // Simple submit handler for new UI
    const handleSimpleSubmit = useCallback(async () => {
        try {
            clearError();
            setSubmitError(null);

            // Initialize upload state
            setUploadState({
                isUploading: true,
                currentFile: 0,
                totalFiles: files.length,
                currentFileName: '',
                overallProgress: 0,
                fileProgress: 0,
                errors: [],
                isCompleted: false,
            });

            // Step 1: Create/ensure draft exists
            let draftDeal;
            if (currentDraftId) {
                draftDeal = { uuid: currentDraftId };
            } else {
                draftDeal = await createDraftDeal({
                    name: 'Untitled Deal',
                });
                setCurrentDraftId(draftDeal.uuid);
            }

            // Step 2: Upload files to draft with progress tracking
            const uploadErrors: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const uploadFile = files[i];

                setUploadState((prev) => ({
                    ...prev,
                    currentFile: i + 1,
                    currentFileName: uploadFile.name,
                    fileProgress: 0,
                    overallProgress: (i / files.length) * 80, // Reserve 20% for finalization
                }));

                try {
                    await uploadDraftFile(
                        draftDeal.uuid,
                        {
                            file: uploadFile.file,
                            category: 'other', // Default category for simplified version
                            proprietary: false,
                        },
                        (progress) => {
                            setUploadState((prev) => ({
                                ...prev,
                                fileProgress: progress,
                            }));
                        },
                    );

                    setUploadState((prev) => ({
                        ...prev,
                        fileProgress: 100,
                        overallProgress: ((i + 1) / files.length) * 80,
                    }));
                } catch (error) {
                    console.error('Error uploading file:', error);
                    const sanitizedError = sanitizeError(error, 'File upload');
                    const userFriendlyMessage = getUserFriendlyMessage(
                        sanitizedError,
                        'File upload',
                    );
                    uploadErrors.push(`${uploadFile.name}: ${userFriendlyMessage}`);
                }
            }

            if (uploadErrors.length > 0) {
                setUploadState((prev) => ({
                    ...prev,
                    isUploading: false,
                    isCompleted: true,
                    errors: uploadErrors,
                }));
                return;
            }

            // Step 3: Finalize the draft deal
            setUploadState((prev) => ({
                ...prev,
                currentFileName: 'Finalizing deal...',
                overallProgress: 90,
            }));

            const finalDeal = await finalizeDraftDeal(draftDeal.uuid);

            // Step 4: Show success state briefly
            setUploadState((prev) => ({
                ...prev,
                isUploading: false,
                isCompleted: true,
                overallProgress: 100,
                currentFileName: 'Deal submitted successfully!',
            }));

            // Step 5: Redirect to the finalized deal
            setTimeout(() => {
                if (onDraftSubmit) {
                    onDraftSubmit(finalDeal.uuid);
                }
            }, 1500);
        } catch (error) {
            console.error('Error submitting deal:', error);
            const sanitizedError = sanitizeError(error, 'Deal submission');
            const userFriendlyMessage = getUserFriendlyMessage(sanitizedError, 'Deal submission');
            setSubmitError(userFriendlyMessage);
            setUploadState((prev) => ({
                ...prev,
                isUploading: false,
                isCompleted: true,
                errors: [userFriendlyMessage],
            }));
        }
    }, [
        files,
        currentDraftId,
        existingDraftFiles,
        createDraftDeal,
        uploadDraftFile,
        finalizeDraftDeal,
        clearError,
        onDraftSubmit,
    ]);

    // File upload for existing deals and library
    const handleUploadToExistingMode = useCallback(
        async (newFiles: File[]) => {
            for (const file of newFiles) {
                const fileData = {
                    file,
                    category: 'other',
                    proprietary: false,
                };

                try {
                    if (mode === 'existing-deal' && dealId) {
                        await uploadDealFile(dealId, fileData);
                    } else if (mode === 'library') {
                        await uploadLibraryFile(fileData);
                    }
                } catch (error) {
                    console.error('Error uploading file:', error);
                    const sanitizedError = sanitizeError(error, 'File upload');
                    const userFriendlyMessage = getUserFriendlyMessage(
                        sanitizedError,
                        'File upload',
                    );
                    toast.error('File upload failed', {
                        description: `${file.name}: ${userFriendlyMessage}`,
                        duration: 4000,
                    });
                }
            }

            // Reload files after upload
            await loadFiles();
        },
        [mode, dealId, uploadDealFile, uploadLibraryFile, loadFiles],
    );

    const renderModeContent = () => {
        switch (mode) {
            case 'draft-deal':
                return (
                    <div className="space-y-6">
                        {/* Existing Files (if any) */}
                        {existingDraftFiles.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Previously Uploaded Files ({existingDraftFiles.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {existingDraftFiles.map((file) => (
                                            <div
                                                key={file.uuid}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-4 w-4 text-gray-500" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {file.file_name || 'Unknown file'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {file.categories?.[0] || 'other'} • 
                                                            {file.processing_status || 'pending'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleFileDelete(file.uuid)}
                                                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* File Upload */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Upload className="h-5 w-5" />
                                    {currentDraftId ? 'Add More Files' : 'Upload Files for New Deal'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {currentDraftId 
                                        ? 'Add additional files to this draft deal.'
                                        : 'Upload multiple files to create a new deal. Files will be staged until you submit for underwriting.'
                                    }
                                </p>
                                <FileUpload
                                    files={files}
                                    onFilesAdd={handleFileAdd}
                                    onFileRemove={handleFileRemove}
                                    maxFiles={20}
                                    disabled={isDraftLoading || isCreatingDraft || loadingDraftFiles}
                                />
                            </CardContent>
                        </Card>

                        {/* Show errors if any */}
                        {submitError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <div className="flex justify-between items-start">
                                        <span>{submitError}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSubmitError(null)}
                                            className="h-6 w-6 p-0"
                                        >
                                            ×
                                        </Button>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Add bottom padding to prevent overlap with sticky bar */}
                        <div className="pb-24"></div>

                        {/* Sticky Bottom Action Bar */}
                        <div className="fixed bottom-0 left-64 right-0 bg-white shadow-lg z-50">
                            <div className="max-w-7xl mx-auto p-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-lg">Ready to Submit?</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Review your deal information and uploaded files before
                                            submitting for underwriting.
                                        </p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                        <Button
                                            type="button"
                                            onClick={onCancel}
                                            className="h-11 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Cancel
                                        </Button>

                                        <Button
                                            type="button"
                                            onClick={() => handleSimpleSaveDraft()}
                                            disabled={(files.length === 0 && existingDraftFiles.length === 0) || isDraftLoading}
                                            className="h-11 px-6 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                                        >
                                            {isDraftLoading ? (
                                                <>
                                                    <Save className="h-4 w-4 mr-2 animate-spin" />
                                                    Saving Draft...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Save Draft
                                                </>
                                            )}
                                        </Button>

                                        <Button
                                            type="button"
                                            onClick={() => handleSimpleSubmit()}
                                            disabled={
                                                (files.length === 0 && existingDraftFiles.length === 0) ||
                                                isDraftLoading ||
                                                isCreatingDraft
                                            }
                                            className="h-11 px-8"
                                        >
                                            {isDraftLoading || isCreatingDraft ? (
                                                <>
                                                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    Submit for Underwriting
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'existing-deal':
                return (
                    <Tabs defaultValue="files" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="files" className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Manage Files ({dealFiles.length})
                            </TabsTrigger>
                            <TabsTrigger value="upload" className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                Add Files
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="files" className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium">Deal Files</h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={loadFiles}
                                    disabled={filesLoading}
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 mr-2 ${filesLoading ? 'animate-spin' : ''}`}
                                    />
                                    Refresh
                                </Button>
                            </div>

                            <FileTable
                                files={dealFiles}
                                mode="deal"
                                dealId={dealId}
                                isLoading={filesLoading}
                                onFileUpdate={handleFileUpdate}
                                onFileDelete={handleFileDelete}
                                onFileReprocess={handleFileReprocess}
                                onFileDownload={handleFileDownload}
                                onBulkDelete={handleBulkDelete}
                                onBulkUpdate={handleBulkUpdate}
                                onBulkReprocess={handleBulkReprocess}
                                onFilesChange={loadFiles}
                            />
                        </TabsContent>

                        <TabsContent value="upload" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="h-5 w-5" />
                                        Add Files to Deal
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Upload additional files to this deal.
                                    </p>
                                    <FileUpload
                                        files={[]}
                                        onFilesAdd={handleUploadToExistingMode}
                                        onFileRemove={() => {}}
                                        maxFiles={50}
                                        disabled={fileManagementLoading}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                );

            case 'library':
                return (
                    <Tabs defaultValue="files" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="files" className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                Knowledge Base ({libraryFiles.length})
                            </TabsTrigger>
                            <TabsTrigger value="upload" className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                Add Files
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="files" className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium">Library Files</h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={loadFiles}
                                    disabled={filesLoading}
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 mr-2 ${filesLoading ? 'animate-spin' : ''}`}
                                    />
                                    Refresh
                                </Button>
                            </div>

                            <FileTable
                                files={libraryFiles}
                                mode="library"
                                isLoading={filesLoading}
                                onFileUpdate={handleFileUpdate}
                                onFileDelete={handleFileDelete}
                                onFileReprocess={handleFileReprocess}
                                onFileDownload={handleFileDownload}
                                onBulkDelete={handleBulkDelete}
                                onBulkUpdate={handleBulkUpdate}
                                onBulkReprocess={handleBulkReprocess}
                                onFilesChange={loadFiles}
                            />
                        </TabsContent>

                        <TabsContent value="upload" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="h-5 w-5" />
                                        Add Files to Knowledge Base
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Upload files to the general knowledge base for analysis and
                                        research.
                                    </p>
                                    <FileUpload
                                        files={[]}
                                        onFilesAdd={handleUploadToExistingMode}
                                        onFileRemove={() => {}}
                                        maxFiles={100}
                                        disabled={fileManagementLoading}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                );

            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            {/* Loading state for draft creation */}
            {mode === 'draft-deal' && isCreatingDraft && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <span className="animate-pulse">Creating new draft...</span>
                    </AlertDescription>
                </Alert>
            )}

            {/* Mode-specific content */}
            {renderModeContent()}

            {/* Upload progress overlay */}
            <UploadProgressOverlay uploadState={uploadState} onClose={handleCloseUploadOverlay} />
        </div>
    );
}
