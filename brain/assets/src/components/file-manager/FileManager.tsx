import { useState, useCallback, useEffect, useRef } from 'react';
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
    FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { showSubmitAreaSuccessToast, showSubmitAreaErrorToast } from '@/utils/customToast';
import FileUpload, { UploadFile } from './FileUpload';
import FileMetadataForm from './FileMetadataForm';
import FileTable, { FileTableData } from './FileTable';
import DraftSelectionDialog from './DraftSelectionDialog';
import UploadProgressOverlay, { UploadState } from './UploadProgressOverlay';
import { useDraftDeals } from '@/hooks/useDraftDeals';
import { useFileManagement } from '@/hooks/useFileManagement';
import {
    useDraftPersistence,
    type DraftState,
    type FileWithBlob,
} from '@/hooks/useDraftPersistence';
import { sanitizeError, getUserFriendlyMessage } from '@/utils/errorSanitization';

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

    // Add debugging for files state changes
    useEffect(() => {
        console.log('\ud83d\udcc1 FILES STATE CHANGED', {
            filesCount: files.length,
            files: files.map((f) => ({
                id: f.id,
                name: f.name,
                status: f.status,
                hasFile: f.file instanceof File,
                fileSize: f.file?.size || 0,
            })),
        });
    }, [files]);

    // File management state
    const [dealFiles, setDealFiles] = useState<FileTableData[]>([]);
    const [libraryFiles, setLibraryFiles] = useState<FileTableData[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);

    // Draft persistence state
    const [draftFormData, setDraftFormData] = useState<any>(null);
    const [showDraftConflict, setShowDraftConflict] = useState(false);
    const [showDraftSelection, setShowDraftSelection] = useState(false);
    const [availableDrafts, setAvailableDrafts] = useState<DraftState[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Add debugging for draft form data changes
    useEffect(() => {
        console.log('\ud83d\udcdd DRAFT FORM DATA CHANGED', {
            hasData: !!draftFormData,
            data: draftFormData,
        });
    }, [draftFormData]);

    // CRITICAL FIX: Add mount guard to prevent race conditions
    const mountedRef = useRef(false);
    const discoveryInProgressRef = useRef(false);

    // Form ref to access form data without reactive dependencies
    const formRef = useRef<{ getValues: () => any } | null>(null);

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

    // Draft persistence hook (only for draft-deal mode) - LAZY INITIALIZATION
    const {
        saveDraft,
        loadDraft,
        deleteDraft,
        scheduleAutoSave,
        getAllDrafts,
        checkForConflicts,
        convertFilesFromStorage,
        generateDraftId,
        setDiscoveredDraftId,
        currentDraftId: persistenceDraftId,
        isAutoSaving,
        lastSaved,
        justSaved,
        error: persistenceError,
        clearError: clearPersistenceError,
    } = useDraftPersistence(currentDraftId || undefined);

    // Convert UploadFile[] to FileWithBlob[] for storage
    const convertToFileWithBlob = useCallback((uploadFiles: UploadFile[]): FileWithBlob[] => {
        return uploadFiles.map(
            (f): FileWithBlob => ({
                id: f.id,
                name: f.name,
                size: f.size,
                type: f.type,
                lastModified: f.lastModified || Date.now(),
                category: f.category,
                documentType: f.documentType,
                proprietary: f.proprietary || false,
                tldr: f.tldr,
                tags: f.tags || [],
                file: f.file, // Include the File object for blob conversion
            }),
        );
    }, []);

    // Convert component state to DraftState format
    const createDraftState = useCallback(
        (formData: any): Omit<DraftState, 'draftId' | 'lastSaved' | 'version'> => {
            return {
                dealName: formData?.name || '',
                description: formData?.description || '',
                website: formData?.website || '',
                fundingTarget: formData?.fundingTarget || '',
                activeTab,
                files: files.map((f) => ({
                    id: f.id,
                    name: f.name,
                    size: f.size,
                    type: f.type,
                    lastModified: f.lastModified || Date.now(),
                    category: f.category,
                    documentType: f.documentType,
                    proprietary: f.proprietary || false,
                    tldr: f.tldr,
                    tags: f.tags || [],
                })),
            };
        },
        [files, activeTab],
    );

    // Load files from DraftState with reconstructed File objects - ENHANCED DEBUGGING
    const loadFilesFromDraft = useCallback(
        (draft: DraftState) => {
            console.log('📁 LOAD FILES FROM DRAFT - START', {
                draftId: draft.draftId,
                filesCount: draft.files.length,
                draftFiles: draft.files.map((f) => ({
                    id: f.id,
                    name: f.name,
                    size: f.size,
                    type: f.type,
                    hasBlob: f.hasBlob,
                    blobDataLength: f.blobData?.length || 0,
                })),
            });

            try {
                console.log('🔄 Converting files from storage format...');

                // Check if convertFilesFromStorage function exists and is callable
                if (typeof convertFilesFromStorage !== 'function') {
                    console.error('❌ convertFilesFromStorage is not a function', {
                        type: typeof convertFilesFromStorage,
                        value: convertFilesFromStorage,
                    });
                    throw new Error('convertFilesFromStorage function not available');
                }

                // Convert storage format back to FileWithBlob format with File objects
                const filesWithBlobs = convertFilesFromStorage(draft.files);

                console.log('✅ Files converted from storage', {
                    originalCount: draft.files.length,
                    convertedCount: filesWithBlobs.length,
                    filesWithBlobData: filesWithBlobs.filter((f) => f.hasBlob).length,
                    filesWithFileObjects: filesWithBlobs.filter((f) => f.file instanceof File)
                        .length,
                });

                // Convert to UploadFile format for component state
                console.log('🔄 Converting to UploadFile format...');
                const uploadFiles: UploadFile[] = filesWithBlobs.map((f, index): UploadFile => {
                    const hasValidFile = f.file instanceof File;
                    console.log(`  File ${index + 1}/${filesWithBlobs.length}:`, {
                        id: f.id,
                        name: f.name,
                        hasFile: hasValidFile,
                        fileSize: f.file?.size || 0,
                        hasBlob: f.hasBlob,
                    });

                    return {
                        id: f.id,
                        file: hasValidFile
                            ? f.file
                            : new File([''], f.name, {
                                  type: f.type,
                                  lastModified: f.lastModified,
                              }),
                        name: f.name,
                        type: f.type,
                        size: f.size,
                        lastModified: f.lastModified,
                        status: hasValidFile ? ('completed' as const) : ('error' as const),
                        progress: 100,
                        category: f.category,
                        documentType: f.documentType,
                        proprietary: f.proprietary,
                        tldr: f.tldr,
                        tags: f.tags,
                        error: hasValidFile
                            ? undefined
                            : 'File data could not be restored from storage',
                    };
                });

                console.log('✅ UploadFile conversion completed', {
                    totalFiles: uploadFiles.length,
                    completedFiles: uploadFiles.filter((f) => f.status === 'completed').length,
                    errorFiles: uploadFiles.filter((f) => f.status === 'error').length,
                });

                console.log('🔄 Updating files state...');
                setFiles(uploadFiles);

                // Log successful reconstruction
                const successfulFiles = uploadFiles.filter((f) => f.status === 'completed').length;
                const totalFiles = uploadFiles.length;

                console.log('📊 File loading summary', {
                    totalFiles,
                    successfulFiles,
                    failedFiles: totalFiles - successfulFiles,
                    successRate:
                        totalFiles > 0 ? Math.round((successfulFiles / totalFiles) * 100) : 0,
                });

                if (totalFiles > 0) {
                    console.log(
                        `✅ Loaded ${successfulFiles}/${totalFiles} files from draft with File objects`,
                    );
                    if (successfulFiles < totalFiles) {
                        console.warn(
                            `⚠️ ${totalFiles - successfulFiles} files could not be fully restored`,
                        );
                    }
                } else {
                    console.log('ℹ️ No files to load from draft');
                }

                console.log('🎉 LOAD FILES FROM DRAFT - SUCCESS');
            } catch (error) {
                console.error('💥 LOAD FILES FROM DRAFT - ERROR', {
                    error,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    errorStack: error instanceof Error ? error.stack : undefined,
                    draftId: draft.draftId,
                    filesCount: draft.files.length,
                });

                const sanitizedError = sanitizeError(error, 'Draft file loading');
                const userFriendlyMessage = getUserFriendlyMessage(
                    sanitizedError,
                    'Draft file loading',
                );

                showSubmitAreaErrorToast('Failed to load draft files', {
                    description: userFriendlyMessage,
                    duration: 4000,
                });

                // Fallback to empty files array
                console.log('🔄 Setting fallback empty files array');
                setFiles([]);
            }
            // Don't auto-switch tabs - let user stay on current tab
        },
        [convertFilesFromStorage],
    );

    // Auto-save draft when form data or files change
    const handleAutoSave = useCallback(
        (formData: any) => {
            if (mode !== 'draft-deal' || !formData) return;

            const draftState = createDraftState(formData);
            const filesWithBlobs = convertToFileWithBlob(files);
            scheduleAutoSave(draftState, filesWithBlobs);
            setDraftFormData(formData);
        },
        [mode, createDraftState, scheduleAutoSave, convertToFileWithBlob, files],
    );

    // Check for draft conflicts
    const handleConflictCheck = useCallback(() => {
        if (mode !== 'draft-deal') return;

        const { hasConflict } = checkForConflicts();
        if (hasConflict) {
            setShowDraftConflict(true);
        }
    }, [mode, checkForConflicts]);

    // CRITICAL FIX: Draft Discovery and Initialization - ENHANCED DEBUGGING with race condition protection
    useEffect(() => {
        if (mode !== 'draft-deal') {
            console.log('\ud83d\udcdd Skipping draft discovery - mode is not draft-deal:', mode);
            return;
        }
        
        // CRITICAL FIX: Prevent race conditions with operation guards
        if (discoveryInProgressRef.current) {
            console.log('\ud83d\udd12 Draft discovery already in progress - skipping');
            return;
        }
        
        discoveryInProgressRef.current = true;
        mountedRef.current = true;

        console.log('\ud83d\ude80 MOUNT EFFECT - Starting draft discovery and loading process', {
            mode,
            providedDraftId: draftId,
            currentDraftId,
            persistenceDraftId,
            hasGetAllDrafts: typeof getAllDrafts === 'function',
            hasLoadDraft: typeof loadDraft === 'function',
            hasSetDiscoveredDraftId: typeof setDiscoveredDraftId === 'function',
        });

        // CRITICAL: If a specific draft ID was provided, load it directly
        if (draftId) {
            console.log(`\ud83c\udfaf Specific draft ID provided: ${draftId}, loading directly...`);
            const loadSpecificDraft = async () => {
                try {
                    // CRITICAL FIX: Check if component is still mounted
                    if (!mountedRef.current) {
                        console.log('\u26a0\ufe0f Component unmounted during specific draft loading');
                        return;
                    }
                    
                    const draft = await loadDraft(draftId);
                    if (draft && mountedRef.current) {
                        console.log('\u2705 Provided draft loaded successfully', {
                            draftId: draft.draftId,
                            dealName: draft.dealName,
                            filesCount: draft.files.length,
                        });

                        // Load the draft content only if still mounted
                        loadFilesFromDraft(draft);
                        setDraftFormData({
                            name: draft.dealName,
                            description: draft.description,
                            website: draft.website,
                            fundingTarget: draft.fundingTarget,
                        });
                        if (draft.activeTab) {
                            setActiveTab(draft.activeTab);
                        }
                    } else if (!draft) {
                        console.warn(`\u26a0\ufe0f Provided draft ID ${draftId} not found`);
                    }
                } catch (error) {
                    console.error('\ud83d\udca5 Error loading provided draft:', error);
                } finally {
                    discoveryInProgressRef.current = false;
                }
            };
            loadSpecificDraft();
            return; // Exit early for specific draft ID
        }

        // DISCOVERY PHASE: Check for existing drafts - PROTECTED AGAINST RACE CONDITIONS
        const discoverAndLoadDrafts = async () => {
            try {
                console.log('\ud83d\udd0d DISCOVERY PHASE - Checking for existing drafts...');
                
                // CRITICAL FIX: Check if component is still mounted before proceeding
                if (!mountedRef.current) {
                    console.log('\u26a0\ufe0f Component unmounted during draft discovery');
                    return;
                }
                
                const drafts = await getAllDrafts();
                
                // CRITICAL FIX: Check again after async operation
                if (!mountedRef.current) {
                    console.log('\u26a0\ufe0f Component unmounted after getAllDrafts');
                    return;
                }

                console.log('\ud83d\udcca Draft discovery results', {
                    draftsCount: Array.isArray(drafts) ? drafts.length : 0,
                    draftIds: Array.isArray(drafts) ? drafts.map((d) => d.draftId) : [],
                    hasDrafts: Array.isArray(drafts) && drafts.length > 0,
                });

                setAvailableDrafts(Array.isArray(drafts) ? drafts : []);

                if (Array.isArray(drafts) && drafts.length > 0 && mountedRef.current) {
                    // AUTO-LOAD MOST RECENT DRAFT STRATEGY
                    console.log('\u2728 STRATEGY: Auto-load most recent draft');
                    const mostRecentDraft = drafts[0]; // getAllDrafts returns sorted by lastSaved desc

                    console.log('\ud83c\udfaf Auto-loading most recent draft', {
                        draftId: mostRecentDraft.draftId,
                        dealName: mostRecentDraft.dealName,
                        lastSaved: new Date(mostRecentDraft.lastSaved).toLocaleString(),
                        filesCount: mostRecentDraft.files.length,
                    });

                    // Set the discovered draft ID in the persistence hook
                    setDiscoveredDraftId(mostRecentDraft.draftId);
                    setCurrentDraftId(mostRecentDraft.draftId);

                    // Load the draft content - with mount check
                    try {
                        if (mountedRef.current) {
                            loadFilesFromDraft(mostRecentDraft);
                            setDraftFormData({
                                name: mostRecentDraft.dealName,
                                description: mostRecentDraft.description,
                                website: mostRecentDraft.website,
                                fundingTarget: mostRecentDraft.fundingTarget,
                            });
                            if (mostRecentDraft.activeTab) {
                                setActiveTab(mostRecentDraft.activeTab);
                            }
                            console.log('\ud83c\udf89 Most recent draft auto-loaded successfully!');
                        }
                    } catch (loadError) {
                        console.error(
                            '\ud83d\udca5 Error loading most recent draft content:',
                            loadError,
                        );
                    }
                } else {
                    console.log(
                        '\ud83d\udcdd No existing drafts found - user will start with clean state',
                    );
                    console.log(
                        '\ud83d\udca1 A new draft ID will be generated when user saves for the first time',
                    );
                }
            } catch (error) {
                console.error('\ud83d\udca5 Error in draft discovery phase:', error);
                if (mountedRef.current) {
                    setAvailableDrafts([]);
                }
            } finally {
                discoveryInProgressRef.current = false;
            }
        };

        discoverAndLoadDrafts();
        
        // Cleanup function
        return () => {
            mountedRef.current = false;
        };
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, draftId]); // CRITICAL: Only depend on mode and provided draftId

    // Periodic conflict checking with AbortController
    useEffect(() => {
        if (mode !== 'draft-deal') return;

        const abortController = new AbortController();

        const periodicCheck = () => {
            if (!abortController.signal.aborted) {
                handleConflictCheck();
            }
        };

        const interval = setInterval(periodicCheck, 30000); // Check every 30 seconds

        return () => {
            abortController.abort();
            clearInterval(interval);
        };
    }, [mode, handleConflictCheck]);

    // Show toast when draft is saved
    useEffect(() => {
        if (justSaved && lastSaved) {
            showSubmitAreaSuccessToast('Draft saved', {
                description: `Saved at ${lastSaved.toLocaleTimeString()}`,
                duration: 2000,
            });
        }
    }, [justSaved, lastSaved]);

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

            // Don't auto-switch tabs - let user manually navigate
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

                // Initialize upload state
                setUploadState({
                    isUploading: true,
                    currentFile: 0,
                    totalFiles: formData.files.length,
                    currentFileName: '',
                    overallProgress: 0,
                    fileProgress: 0,
                    errors: [],
                    isCompleted: false,
                });

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

                // Step 2: Upload files sequentially with progress tracking
                const uploadErrors: string[] = [];

                for (let i = 0; i < formData.files.length; i++) {
                    const fileData = formData.files[i];
                    const uploadFile = files.find((f) => f.id === fileData.id);

                    if (!uploadFile) {
                        uploadErrors.push(`File ${fileData.name} not found`);
                        continue;
                    }

                    // Update progress state
                    setUploadState((prev) => ({
                        ...prev,
                        currentFile: i + 1,
                        currentFileName: uploadFile.name,
                        fileProgress: 0,
                        overallProgress: (i / formData.files.length) * 100,
                    }));

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
                                setUploadState((prev) => ({
                                    ...prev,
                                    fileProgress: progress,
                                }));
                            },
                        );

                        // File completed successfully
                        setUploadState((prev) => ({
                            ...prev,
                            fileProgress: 100,
                            overallProgress: ((i + 1) / formData.files.length) * 100,
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

                // Check if any uploads failed
                if (uploadErrors.length > 0) {
                    setUploadState((prev) => ({
                        ...prev,
                        isUploading: false,
                        isCompleted: true,
                        errors: uploadErrors,
                    }));
                    return; // Stop here, don't finalize
                }

                // Step 3: Finalize the draft deal only after all uploads succeed
                const finalDeal = await finalizeDraftDeal(draftDeal.uuid);

                // Clean up draft storage after successful submission
                if (mode === 'draft-deal' && currentDraftId) {
                    deleteDraft(currentDraftId);
                    // Also update the available drafts list to remove the submitted draft
                    setAvailableDrafts((prev) => prev.filter((d) => d.draftId !== currentDraftId));
                }

                // Success feedback is provided through the modal/overlay
                // Toast removed to avoid duplicate notifications

                // Show success state briefly
                setUploadState((prev) => ({
                    ...prev,
                    isUploading: false,
                    isCompleted: true,
                    overallProgress: 100,
                }));

                // Wait a moment to show success, then redirect
                setTimeout(() => {
                    if (onDraftSubmit) {
                        onDraftSubmit(finalDeal.uuid);
                    }
                }, 1500);
            } catch (error) {
                console.error('Error submitting draft:', error);

                // Use secure error sanitization
                const sanitizedError = sanitizeError(error, 'Draft submission');
                const userFriendlyMessage = getUserFriendlyMessage(
                    sanitizedError,
                    'Draft submission',
                );

                setSubmitError(userFriendlyMessage);
                setUploadState((prev) => ({
                    ...prev,
                    isUploading: false,
                    isCompleted: true,
                    errors: [userFriendlyMessage],
                }));
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
            deleteDraft,
            onDraftSubmit,
            mode,
        ],
    );

    const handleSaveDraft = useCallback(
        async (formData: any) => {
            if (mode !== 'draft-deal') return;

            try {
                // Save to localStorage with File blob data
                const draftState = createDraftState(formData);
                const filesWithBlobs = convertToFileWithBlob(files);
                await saveDraft(draftState, filesWithBlobs);
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
                const sanitizedError = sanitizeError(error, 'Draft save');
                const userFriendlyMessage = getUserFriendlyMessage(sanitizedError, 'Draft save');
                // Could set an error state here if needed for user feedback
                showSubmitAreaErrorToast('Failed to save draft', {
                    description: userFriendlyMessage,
                    duration: 4000,
                });
            }
        },
        [
            mode,
            createDraftState,
            saveDraft,
            currentDraftId,
            updateDraftDeal,
            convertToFileWithBlob,
            files,
        ],
    );

    const handleSelectDraft = useCallback(
        (selectedDraftId: string) => {
            console.log('🎯 MANUAL DRAFT SELECTION STARTED', {
                selectedDraftId,
                availableDraftsCount: availableDrafts.length,
                availableDraftIds: availableDrafts.map((d) => d.draftId),
            });

            const draft = availableDrafts.find((d) => d.draftId === selectedDraftId);

            if (!draft) {
                console.error('❌ Selected draft not found in available drafts', {
                    requestedId: selectedDraftId,
                    availableIds: availableDrafts.map((d) => d.draftId),
                });
                setShowDraftSelection(false);
                return;
            }

            console.log('✅ Selected draft found, starting load process', {
                draft: {
                    draftId: draft.draftId,
                    dealName: draft.dealName,
                    filesCount: draft.files.length,
                    activeTab: draft.activeTab,
                    hasDescription: !!draft.description,
                    hasWebsite: !!draft.website,
                    hasFundingTarget: !!draft.fundingTarget,
                },
            });

            try {
                // Step 1: Update draft IDs in persistence system
                console.log('🆔 Updating draft ID in persistence system');
                setDiscoveredDraftId(draft.draftId);
                setCurrentDraftId(draft.draftId);

                // Step 2: Load files from draft
                console.log('📁 Starting file loading from selected draft...');
                loadFilesFromDraft(draft);
                console.log('✅ File loading initiated');

                // Step 3: Set form data
                const formData = {
                    name: draft.dealName,
                    description: draft.description,
                    website: draft.website,
                    fundingTarget: draft.fundingTarget,
                };

                console.log('📝 Setting form data for selected draft', formData);
                setDraftFormData(formData);

                // Step 4: Restore active tab
                if (draft.activeTab) {
                    console.log('🔄 Restoring active tab', draft.activeTab);
                    setActiveTab(draft.activeTab);
                }

                console.log('🎉 Manual draft selection completed successfully');
            } catch (error) {
                console.error('💥 Error during manual draft selection', error);
            }

            setShowDraftSelection(false);
        },
        [availableDrafts, loadFilesFromDraft, setDiscoveredDraftId],
    );

    const handleDeleteDraft = useCallback(
        (draftId: string) => {
            deleteDraft(draftId);
            setAvailableDrafts((prev) => prev.filter((d) => d.draftId !== draftId));

            // If no drafts left, close the dialog
            if (availableDrafts.length <= 1) {
                setShowDraftSelection(false);
            }
        },
        [availableDrafts, deleteDraft],
    );

    const handleCreateNewDraft = useCallback(() => {
        console.log('🆕 Creating new draft - resetting state');
        setShowDraftSelection(false);
        // Reset to empty state for new draft
        setFiles([]);
        setDraftFormData(null);
        setCurrentDraftId(null);
        // Clear the discovered draft ID so a new one will be generated when saving
        setDiscoveredDraftId('');
        console.log('✅ New draft state prepared');
    }, [setDiscoveredDraftId]);

    const handleOpenDraftSelection = useCallback(async () => {
        try {
            const drafts = await getAllDrafts();
            if (Array.isArray(drafts)) {
                setAvailableDrafts(drafts);
                setShowDraftSelection(true);
            } else {
                console.warn('⚠️ getAllDrafts returned non-array:', drafts);
                setAvailableDrafts([]);
                setShowDraftSelection(true);
            }
        } catch (error) {
            console.error('💥 Error getting drafts for selection:', error);
            setAvailableDrafts([]);
            setShowDraftSelection(true);
        }
    }, [getAllDrafts]);

    // Handle tab changes - save form data when leaving metadata tab
    const handleTabChange = useCallback(
        (newTab: string) => {
            // If leaving metadata tab, save current form data to prevent loss
            if (activeTab === 'metadata' && newTab !== 'metadata' && formRef.current) {
                try {
                    const currentData = formRef.current.getValues();
                    if (currentData && currentData.name) {
                        // Only save if there's actual data
                        handleAutoSave(currentData);
                    }
                } catch (error) {
                    console.error('Error saving form data on tab change:', error);
                    const sanitizedError = sanitizeError(error, 'Auto-save on tab change');
                    // Don't show toast for tab change auto-save failures as they're not critical
                    // and could be annoying to users
                }
            }
            setActiveTab(newTab);
        },
        [activeTab, handleAutoSave],
    );

    // Handle conflict resolution
    const handleResolveConflict = useCallback(
        async (action: 'keep_local' | 'use_remote') => {
            if (action === 'use_remote' && currentDraftId) {
                try {
                    const draft = await loadDraft(currentDraftId);
                    if (draft) {
                        loadFilesFromDraft(draft);
                        setDraftFormData({
                            name: draft.dealName,
                            description: draft.description,
                            website: draft.website,
                            fundingTarget: draft.fundingTarget,
                        });
                        // Restore active tab
                        if (draft.activeTab) {
                            setActiveTab(draft.activeTab);
                        }
                    }
                } catch (error) {
                    console.error('💥 Error loading draft in conflict resolution:', error);
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
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 px-0 h-14">
                            <TabsTrigger
                                value="upload"
                                className="cursor-pointer h-12 px-6 font-medium text-sm data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm border-0 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                            >
                                Upload Files
                            </TabsTrigger>
                            <TabsTrigger
                                value="metadata"
                                disabled={files.length === 0}
                                className="cursor-pointer h-12 px-6 font-medium text-sm data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm border-0 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 disabled:cursor-not-allowed"
                            >
                                Configure Details ({files.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="upload" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Upload className="h-5 w-5" />
                                            Upload Files for New Deal
                                        </CardTitle>
                                        <Button
                                            variant="default"
                                            size="default"
                                            onClick={handleOpenDraftSelection}
                                            disabled={availableDrafts.length === 0}
                                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                                        >
                                            <FolderOpen className="h-4 w-4" />
                                            {availableDrafts.length === 0
                                                ? 'No saved drafts'
                                                : 'Manage Drafts'}
                                        </Button>
                                    </div>
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
                            {/* DEBUG: Log what we're about to pass to FileMetadataForm */}
                            {(() => {
                                console.log('🎨 RENDERING FileMetadataForm with props', {
                                    filesCount: files.length,
                                    filesIds: files.map((f) => f.id),
                                    hasInitialData: !!draftFormData,
                                    initialData: draftFormData,
                                    timestamp: new Date().toISOString(),
                                });
                                return null;
                            })()}
                            <FileMetadataForm
                                files={files}
                                onSubmit={handleDraftSubmit}
                                onSaveDraft={handleSaveDraft}
                                onCancel={onCancel || (() => {})}
                                onFormChange={handleAutoSave}
                                isSubmitting={isDraftLoading}
                                isDraftSaving={isDraftLoading}
                                initialData={draftFormData}
                                formRef={formRef}
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
                    {/* Auto-save status - now using toast */}
                    {isAutoSaving && (
                        <Alert>
                            <Clock className="h-4 w-4" />
                            <AlertDescription>
                                <span className="animate-pulse">Auto-saving draft...</span>
                            </AlertDescription>
                        </Alert>
                    )}
                    {persistenceError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>Error: {persistenceError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Draft selection dialog */}
                    <DraftSelectionDialog
                        drafts={availableDrafts}
                        open={showDraftSelection}
                        onSelect={handleSelectDraft}
                        onDelete={handleDeleteDraft}
                        onCreateNew={handleCreateNewDraft}
                        onClose={() => setShowDraftSelection(false)}
                    />

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

            {/* Upload progress overlay */}
            <UploadProgressOverlay uploadState={uploadState} onClose={handleCloseUploadOverlay} />
        </div>
    );
}
