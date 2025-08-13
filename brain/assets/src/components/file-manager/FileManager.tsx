import React, { useState, useCallback, useEffect } from 'react';
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
    Clock,
    CheckCircle,
} from 'lucide-react';
import FileUpload, { UploadFile } from './FileUpload';
import FileMetadataForm from './FileMetadataForm';
import FileTable, { FileTableData } from './FileTable';
import { useDraftDeals } from '@/hooks/useDraftDeals';
import { useFileManagement } from '@/hooks/useFileManagement';
import { useDraftPersistence, type DraftState } from '@/hooks/useDraftPersistence';

export interface FileManagerProps {
    mode: 'draft-deal' | 'existing-deal' | 'library';
    draftId?: string;
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
    draftId,
    dealId,
    onDraftSubmit,
    onCancel,
    allowSubmission = true,
    showUpload = true,
}: FileManagerProps) {
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [activeTab, setActiveTab] = useState('upload');
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId || null);

    // File management state
    const [dealFiles, setDealFiles] = useState<FileTableData[]>([]);
    const [libraryFiles, setLibraryFiles] = useState<FileTableData[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);

    // Draft persistence state
    const [draftFormData, setDraftFormData] = useState<any>(null);
    const [showDraftConflict, setShowDraftConflict] = useState(false);
    const [showDraftRecovery, setShowDraftRecovery] = useState(false);
    const [existingDraft, setExistingDraft] = useState<DraftState | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

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

    // Draft persistence hook (only for draft-deal mode)
    const {
        saveDraft,
        loadDraft,
        deleteDraft,
        scheduleAutoSave,
        getAllDrafts,
        checkForConflicts,
        currentDraftId: persistenceDraftId,
        isAutoSaving,
        lastSaved,
        error: persistenceError,
        clearError: clearPersistenceError,
    } = useDraftPersistence(currentDraftId || undefined);

    // Convert component state to DraftState format
    const createDraftState = useCallback(
        (formData: any): Omit<DraftState, 'draftId' | 'lastSaved' | 'version'> => {
            return {
                dealName: formData?.name || '',
                description: formData?.description || '',
                website: formData?.website || '',
                fundingTarget: formData?.fundingTarget || '',
                files: files.map((f) => ({
                    id: f.id,
                    name: f.name,
                    size: f.size,
                    type: f.type,
                    category: f.category,
                    documentType: f.documentType,
                    proprietary: f.proprietary || false,
                    tldr: f.tldr,
                    tags: f.tags || [],
                })),
            };
        },
        [files],
    );

    // Load files from DraftState
    const loadFilesFromDraft = useCallback((draft: DraftState) => {
        const uploadFiles: UploadFile[] = draft.files.map((f) => ({
            id: f.id,
            file: null as any, // File object will be lost, but metadata is preserved
            name: f.name,
            type: f.type,
            size: f.size,
            lastModified: Date.now(),
            status: 'completed' as const,
            progress: 100,
            category: f.category,
            documentType: f.documentType,
            proprietary: f.proprietary,
            tldr: f.tldr,
            tags: f.tags,
        }));
        setFiles(uploadFiles);
        setActiveTab('metadata');
    }, []);

    // Auto-save draft when form data or files change
    const handleAutoSave = useCallback(
        (formData: any) => {
            if (mode !== 'draft-deal' || !formData) return;

            const draftState = createDraftState(formData);
            scheduleAutoSave(draftState);
            setDraftFormData(formData);
        },
        [mode, createDraftState, scheduleAutoSave],
    );

    // Check for draft conflicts
    const handleConflictCheck = useCallback(() => {
        if (mode !== 'draft-deal') return;

        const { hasConflict } = checkForConflicts();
        if (hasConflict) {
            setShowDraftConflict(true);
        }
    }, [mode, checkForConflicts]);

    // Load existing draft on mount
    useEffect(() => {
        if (mode !== 'draft-deal') return;

        // Check for existing drafts
        const drafts = getAllDrafts();
        if (drafts.length > 0 && !currentDraftId) {
            setExistingDraft(drafts[0]);
            setShowDraftRecovery(true);
        } else if (currentDraftId) {
            const draft = loadDraft(currentDraftId);
            if (draft) {
                loadFilesFromDraft(draft);
                setDraftFormData({
                    name: draft.dealName,
                    description: draft.description,
                    website: draft.website,
                    fundingTarget: draft.fundingTarget,
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, currentDraftId]);

    // Periodic conflict checking
    useEffect(() => {
        if (mode !== 'draft-deal') return;

        const interval = setInterval(handleConflictCheck, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, [mode, handleConflictCheck]);

    const handleFileAdd = useCallback(
        (newFiles: File[]) => {
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

            setFiles((prev) => {
                const newFiles = [...prev, ...uploadFiles];

                // Trigger auto-save for draft mode
                if (mode === 'draft-deal' && draftFormData) {
                    setTimeout(() => handleAutoSave(draftFormData), 100);
                }

                return newFiles;
            });

            // Auto-switch to metadata tab if we have files
            if (uploadFiles.length > 0) {
                setActiveTab('metadata');
            }
        },
        [mode, draftFormData, handleAutoSave],
    );

    const handleFileRemove = useCallback(
        (fileId: string) => {
            setFiles((prev) => {
                const newFiles = prev.filter((f) => f.id !== fileId);

                // Trigger auto-save for draft mode
                if (mode === 'draft-deal' && draftFormData) {
                    setTimeout(() => handleAutoSave(draftFormData), 100);
                }

                return newFiles;
            });
        },
        [mode, draftFormData, handleAutoSave],
    );

    const handleDraftSubmit = useCallback(
        async (formData: any) => {
            try {
                clearError();
                setSubmitError(null); // Clear any previous submit errors

                // Reset file error states for retry
                setFiles((prev) =>
                    prev.map((f) => ({
                        ...f,
                        status: f.status === 'error' ? ('pending' as const) : f.status,
                        error: f.status === 'error' ? undefined : f.error,
                    })),
                );

                // Step 1: Create or update draft deal
                let draftDeal;

                // Check if currentDraftId is a real UUID (from backend) or a localStorage-generated ID
                const isRealDraftId = currentDraftId && !currentDraftId.startsWith('draft_');

                if (isRealDraftId) {
                    // Update existing draft deal with real UUID
                    draftDeal = await updateDraftDeal(currentDraftId, {
                        name: formData.name,
                        description: formData.description,
                        website: formData.website,
                        funding_target: formData.fundingTarget,
                    });
                } else {
                    // Create new draft deal (either no ID or localStorage-generated ID)
                    draftDeal = await createDraftDeal({
                        name: formData.name,
                        description: formData.description,
                        website: formData.website,
                        funding_target: formData.fundingTarget,
                    });
                    setCurrentDraftId(draftDeal.uuid);
                }

                // Step 2: Upload files with metadata
                for (const fileData of formData.files) {
                    const uploadFile = files.find((f) => f.id === fileData.id);
                    if (!uploadFile) continue;

                    // Update file status to uploading
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === fileData.id
                                ? { ...f, status: 'uploading' as const, progress: 0 }
                                : f,
                        ),
                    );

                    try {
                        await uploadDraftFile(
                            draftDeal.uuid,
                            {
                                file: uploadFile.file,
                                category: fileData.category,
                                document_type: fileData.documentType,
                                proprietary: fileData.proprietary,
                                tldr: fileData.tldr,
                                tags: fileData.tags,
                            },
                            (progress) => {
                                setFiles((prev) =>
                                    prev.map((f) =>
                                        f.id === fileData.id ? { ...f, progress } : f,
                                    ),
                                );
                            },
                        );

                        // Mark file as completed
                        setFiles((prev) =>
                            prev.map((f) =>
                                f.id === fileData.id
                                    ? { ...f, status: 'completed' as const, progress: 100 }
                                    : f,
                            ),
                        );
                    } catch (error) {
                        console.error('Error uploading file:', error);
                        setFiles((prev) =>
                            prev.map((f) =>
                                f.id === fileData.id
                                    ? {
                                          ...f,
                                          status: 'error' as const,
                                          error:
                                              error instanceof Error
                                                  ? error.message
                                                  : 'Upload failed',
                                      }
                                    : f,
                            ),
                        );
                    }
                }

                // Step 3: Finalize the draft deal
                const finalDeal = await finalizeDraftDeal(draftDeal.uuid);

                // Clean up draft storage after successful submission
                if (mode === 'draft-deal' && currentDraftId) {
                    deleteDraft(currentDraftId);
                }

                // Call the parent handler
                if (onDraftSubmit) {
                    onDraftSubmit(finalDeal.uuid);
                }
            } catch (error) {
                console.error('Error submitting draft:', error);

                // Extract validation errors from API response
                let errorMessage = 'Submission failed';
                if (error instanceof Error) {
                    try {
                        // Try to parse structured validation errors
                        const apiError = JSON.parse(error.message);
                        if (apiError.website) {
                            errorMessage = `Website: ${Array.isArray(apiError.website) ? apiError.website[0] : apiError.website}`;
                        } else if (apiError.name) {
                            errorMessage = `Name: ${Array.isArray(apiError.name) ? apiError.name[0] : apiError.name}`;
                        } else if (apiError.detail) {
                            errorMessage = apiError.detail;
                        } else {
                            errorMessage = error.message;
                        }
                    } catch {
                        errorMessage = error.message;
                    }
                }

                setSubmitError(errorMessage);

                // Only mark files as error if they were being uploaded
                setFiles((prev) =>
                    prev.map((f) => ({
                        ...f,
                        status: f.status === 'uploading' ? ('error' as const) : f.status,
                        error: f.status === 'uploading' ? errorMessage : f.error,
                    })),
                );
            }
        },
        [
            files,
            currentDraftId,
            createDraftDeal,
            updateDraftDeal,
            uploadDraftFile,
            finalizeDraftDeal,
            clearError,
            onDraftSubmit,
        ],
    );

    const handleSaveDraft = useCallback(
        async (formData: any) => {
            if (mode !== 'draft-deal') return;

            try {
                // Save to localStorage
                const draftState = createDraftState(formData);
                await saveDraft(draftState);
                setDraftFormData(formData);

                // Also save to backend if we have a real draft ID
                const isRealDraftId = currentDraftId && !currentDraftId.startsWith('draft_');
                if (isRealDraftId) {
                    await updateDraftDeal(currentDraftId, {
                        name: formData.name,
                        description: formData.description,
                        website: formData.website,
                        funding_target: formData.fundingTarget,
                    });
                }
            } catch (error) {
                console.error('Error saving draft:', error);
            }
        },
        [mode, createDraftState, saveDraft, currentDraftId, updateDraftDeal],
    );

    // Handle draft recovery actions
    const handleRecoverDraft = useCallback(() => {
        if (existingDraft) {
            loadFilesFromDraft(existingDraft);
            setDraftFormData({
                name: existingDraft.dealName,
                description: existingDraft.description,
                website: existingDraft.website,
                fundingTarget: existingDraft.fundingTarget,
            });
            setCurrentDraftId(existingDraft.draftId);
        }
        setShowDraftRecovery(false);
    }, [existingDraft, loadFilesFromDraft]);

    const handleDiscardDraft = useCallback(() => {
        if (existingDraft) {
            deleteDraft(existingDraft.draftId);
        }
        setShowDraftRecovery(false);
        setExistingDraft(null);
    }, [existingDraft, deleteDraft]);

    // Handle conflict resolution
    const handleResolveConflict = useCallback(
        (action: 'keep_local' | 'use_remote') => {
            if (action === 'use_remote' && currentDraftId) {
                const draft = loadDraft(currentDraftId);
                if (draft) {
                    loadFilesFromDraft(draft);
                    setDraftFormData({
                        name: draft.dealName,
                        description: draft.description,
                        website: draft.website,
                        fundingTarget: draft.fundingTarget,
                    });
                }
            }
            setShowDraftConflict(false);
        },
        [currentDraftId, loadDraft, loadFilesFromDraft],
    );

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
            if (mode === 'existing-deal') {
                await deleteDealFile(fileId);
            } else if (mode === 'library') {
                await deleteLibraryFile(fileId);
            }
        },
        [mode, deleteDealFile, deleteLibraryFile],
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
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 px-0">
                            <TabsTrigger value="upload">Upload Files</TabsTrigger>
                            <TabsTrigger value="metadata" disabled={files.length === 0}>
                                Configure Details ({files.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="upload" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="h-5 w-5" />
                                        Upload Files for New Deal
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Upload multiple files to create a new deal. Files will be
                                        staged until you submit for underwriting.
                                    </p>
                                    <FileUpload
                                        files={files}
                                        onFilesAdd={handleFileAdd}
                                        onFileRemove={handleFileRemove}
                                        maxFiles={20}
                                        disabled={isDraftLoading}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="metadata" className="space-y-4">
                            {submitError && (
                                <Alert variant="destructive" className="mb-4">
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
                            <FileMetadataForm
                                files={files}
                                onSubmit={handleDraftSubmit}
                                onSaveDraft={handleSaveDraft}
                                onCancel={onCancel || (() => {})}
                                onFormChange={handleAutoSave}
                                isSubmitting={isDraftLoading}
                                isDraftSaving={isDraftLoading}
                                initialData={draftFormData}
                            />
                        </TabsContent>
                    </Tabs>
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
            {/* Draft Status Indicators - only show for draft-deal mode */}
            {mode === 'draft-deal' && (
                <>
                    {/* Auto-save status */}
                    {(isAutoSaving || lastSaved) && (
                        <Alert>
                            <Clock className="h-4 w-4" />
                            <AlertDescription>
                                <div className="flex items-center justify-between">
                                    <span>
                                        {isAutoSaving ? (
                                            <>
                                                <span className="animate-pulse">
                                                    Auto-saving draft...
                                                </span>
                                            </>
                                        ) : lastSaved ? (
                                            <>
                                                <CheckCircle className="h-4 w-4 inline mr-1 text-green-600" />
                                                Draft saved {lastSaved.toLocaleTimeString()}
                                            </>
                                        ) : null}
                                    </span>
                                    {persistenceError && (
                                        <span className="text-red-600 text-sm">
                                            Error: {persistenceError}
                                        </span>
                                    )}
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Draft recovery dialog */}
                    {showDraftRecovery && existingDraft && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="font-medium mb-1">Draft Found</h4>
                                        <p className="text-sm text-muted-foreground">
                                            You have a saved draft "{existingDraft.dealName}" from{' '}
                                            {new Date(existingDraft.lastSaved).toLocaleString()}.
                                            Would you like to continue working on it?
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={handleRecoverDraft}>
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Continue Draft
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleDiscardDraft}
                                        >
                                            Start Fresh
                                        </Button>
                                    </div>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Draft conflict dialog */}
                    {showDraftConflict && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="font-medium mb-1">
                                            Draft Conflict Detected
                                        </h4>
                                        <p className="text-sm">
                                            Your draft has been modified in another tab or window.
                                            What would you like to do?
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleResolveConflict('keep_local')}
                                        >
                                            Keep My Changes
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleResolveConflict('use_remote')}
                                        >
                                            Use Other Version
                                        </Button>
                                    </div>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}
                </>
            )}

            {/* Mode-specific content */}
            {renderModeContent()}
        </div>
    );
}
