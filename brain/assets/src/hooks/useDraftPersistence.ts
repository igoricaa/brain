import { useState, useCallback, useEffect, useRef } from 'react';
import {
    fileToBase64Streaming,
    base64ToFileStreaming,
    enhancedStorageSet,
    enhancedStorageGet,
    enhancedStorageRemove,
    getAllKeysFromIndexedDB,
    formatFileSize,
    validateFileIntegrity,
    type FileOperationError,
    type FileStorageInfo,
} from '@/utils/fileOperations';
import {
    validateSchema,
    safeJSONParse,
    sanitizeString,
    sanitizeArray,
    sanitizeNumber,
    createTimestampValidator,
    createUUIDValidator,
    validateFileMetadata,
    checkDataCorruption,
    type ValidationError,
    type Schema,
} from '@/utils/schemaValidation';
import { sanitizeError, createErrorHandler, type SanitizedError } from '@/utils/errorSanitization';

export interface DraftState {
    draftId: string;
    dealName: string;
    description?: string;
    website?: string;
    fundingTarget?: string;
    activeTab?: string;
    files: {
        id: string;
        name: string;
        size: number;
        type: string;
        lastModified: number;
        category?: string;
        documentType?: string;
        proprietary?: boolean;
        tldr?: string;
        tags?: string[];
        // Blob storage for File reconstruction
        blobData?: string; // Base64 encoded ArrayBuffer
        hasBlob?: boolean;
    }[];
    lastSaved: number;
    version: number;
}

export interface DraftPersistenceOptions {
    autoSaveInterval?: number; // milliseconds
    maxDrafts?: number;
    expirationDays?: number;
}

export interface FileWithBlob {
    id: string;
    name: string;
    size: number;
    type: string;
    lastModified: number;
    category?: string;
    documentType?: string;
    proprietary?: boolean;
    tldr?: string;
    tags?: string[];
    file?: File;
    blobData?: string;
    hasBlob?: boolean;
}

const DEFAULT_OPTIONS: Required<DraftPersistenceOptions> = {
    autoSaveInterval: 30000, // 30 seconds
    maxDrafts: 10,
    expirationDays: 7,
};

const STORAGE_KEY_PREFIX = 'brain_draft_deal_';
const STORAGE_INDEX_KEY = 'brain_draft_deals_index';

// Schema definitions for runtime validation
const DRAFT_FILE_SCHEMA: Schema = {
    id: { type: 'string', required: true, validator: createUUIDValidator() },
    name: { type: 'string', required: true, sanitizer: sanitizeString },
    size: { type: 'number', required: true, validator: (v) => typeof v === 'number' && v >= 0 },
    type: { type: 'string', required: true, sanitizer: sanitizeString },
    lastModified: { type: 'number', required: true, validator: createTimestampValidator() },
    category: { type: 'string', required: false, sanitizer: sanitizeString },
    documentType: { type: 'string', required: false, sanitizer: sanitizeString },
    proprietary: { type: 'boolean', required: false },
    tldr: { type: 'string', required: false, sanitizer: sanitizeString },
    tags: {
        type: 'array',
        required: false,
        sanitizer: (v) => sanitizeArray(v, (item) => typeof item === 'string'),
    },
    blobData: { type: 'string', required: false },
    hasBlob: { type: 'boolean', required: false },
};

const DRAFT_STATE_SCHEMA: Schema = {
    draftId: { type: 'string', required: true, validator: createUUIDValidator() },
    dealName: { type: 'string', required: true, sanitizer: sanitizeString },
    description: { type: 'string', required: false, sanitizer: sanitizeString },
    website: { type: 'string', required: false, sanitizer: sanitizeString },
    fundingTarget: { type: 'string', required: false, sanitizer: sanitizeString },
    activeTab: { type: 'string', required: false, sanitizer: sanitizeString },
    files: {
        type: 'array',
        required: true,
        sanitizer: (v) => sanitizeArray(v, validateFileMetadata),
    },
    lastSaved: { type: 'number', required: true, validator: createTimestampValidator() },
    version: { type: 'number', required: true, validator: (v) => typeof v === 'number' && v >= 0 },
};

// Error handler
const errorHandler = createErrorHandler('DraftPersistence');

// Convert files with File objects to storage format
const convertFilesForStorage = async (files: FileWithBlob[]): Promise<DraftState['files']> => {
    const storageFiles: DraftState['files'] = [];
    const errors: string[] = [];

    for (const fileData of files) {
        try {
            // Validate file data structure
            const validatedFile = validateSchema(fileData, DRAFT_FILE_SCHEMA, false);

            const storageFile: DraftState['files'][0] = {
                id: validatedFile.id,
                name: validatedFile.name,
                size: validatedFile.size,
                type: validatedFile.type,
                lastModified: validatedFile.lastModified,
                category: validatedFile.category,
                documentType: validatedFile.documentType,
                proprietary: validatedFile.proprietary || false,
                tldr: validatedFile.tldr,
                tags: validatedFile.tags || [],
            };

            // Convert File to base64 if present using memory-safe streaming
            if (fileData.file instanceof File) {
                try {
                    console.log(
                        `Converting file ${fileData.name} (${formatFileSize(fileData.file.size)}) to Base64...`,
                    );
                    storageFile.blobData = await fileToBase64Streaming(fileData.file);
                    storageFile.hasBlob = true;
                    console.log(`Successfully converted ${fileData.name}`);
                } catch (error) {
                    const sanitizedError = errorHandler(error);
                    console.warn(
                        `Failed to serialize file ${fileData.name}:`,
                        sanitizedError.message,
                    );
                    errors.push(`${fileData.name}: ${sanitizedError.message}`);
                    storageFile.hasBlob = false;
                }
            } else if (fileData.blobData) {
                // Preserve existing blob data
                storageFile.blobData = fileData.blobData;
                storageFile.hasBlob = true;
            } else {
                storageFile.hasBlob = false;
            }

            storageFiles.push(storageFile);
        } catch (error) {
            const sanitizedError = errorHandler(error);
            console.warn(`Failed to process file ${fileData.name}:`, sanitizedError.message);
            errors.push(`${fileData.name}: ${sanitizedError.message}`);
        }
    }

    // Log conversion summary
    const successCount = storageFiles.filter((f) => f.hasBlob).length;
    const totalCount = storageFiles.length;
    console.log(`File conversion complete: ${successCount}/${totalCount} files with blob data`);

    if (errors.length > 0) {
        console.warn('File conversion errors:', errors);
    }

    return storageFiles;
};

// Convert storage format back to files with File objects - ENHANCED DEBUGGING
const convertFilesFromStorage = (storageFiles: DraftState['files']): FileWithBlob[] => {
    console.log('\ud83d\udd04 CONVERT FILES FROM STORAGE - START', {
        inputFilesCount: storageFiles.length,
        inputFiles: storageFiles.map((f) => ({
            id: f.id,
            name: f.name,
            size: f.size,
            type: f.type,
            hasBlob: f.hasBlob,
            blobDataLength: f.blobData?.length || 0,
        })),
    });

    const results: FileWithBlob[] = [];
    const errors: string[] = [];

    for (const [index, storageFile] of storageFiles.entries()) {
        console.log(`\ud83d\udd04 Processing file ${index + 1}/${storageFiles.length}:`, {
            id: storageFile.id,
            name: storageFile.name,
            hasBlob: storageFile.hasBlob,
            blobDataLength: storageFile.blobData?.length || 0,
        });

        try {
            // Validate stored file data
            console.log(`  \ud83d\udd0d Validating file schema...`);
            const validatedFile = validateSchema(storageFile, DRAFT_FILE_SCHEMA, false);
            console.log(`  \u2705 Schema validation passed`);

            const fileData: FileWithBlob = {
                id: validatedFile.id,
                name: validatedFile.name,
                size: validatedFile.size,
                type: validatedFile.type,
                lastModified: validatedFile.lastModified,
                category: validatedFile.category,
                documentType: validatedFile.documentType,
                proprietary: validatedFile.proprietary || false,
                tldr: validatedFile.tldr,
                tags: validatedFile.tags || [],
            };

            // Reconstruct File object from blob data using memory-safe conversion
            if (validatedFile.hasBlob && validatedFile.blobData) {
                console.log(`  \ud83d\udd04 File has blob data, attempting reconstruction...`);
                try {
                    console.log(
                        `  \u27a1\ufe0f Reconstructing file ${validatedFile.name} from Base64 (${validatedFile.blobData.length} chars)...`,
                    );

                    // Check if base64ToFileStreaming exists
                    if (typeof base64ToFileStreaming !== 'function') {
                        throw new Error('base64ToFileStreaming function not available');
                    }

                    const reconstructedFile = base64ToFileStreaming(
                        validatedFile.blobData,
                        validatedFile.name,
                        validatedFile.type,
                        validatedFile.lastModified,
                    );

                    console.log(`  \u2705 File reconstruction successful`, {
                        fileName: reconstructedFile.name,
                        fileSize: reconstructedFile.size,
                        fileType: reconstructedFile.type,
                        isValidFile: reconstructedFile instanceof File,
                    });

                    fileData.file = reconstructedFile;
                    fileData.hasBlob = true;
                    fileData.blobData = validatedFile.blobData;
                } catch (error) {
                    const sanitizedError = errorHandler(error);
                    console.error(`  \u274c Failed to reconstruct file ${validatedFile.name}:`, {
                        error: sanitizedError.message,
                        blobDataLength: validatedFile.blobData.length,
                        errorType: sanitizedError.type,
                    });
                    errors.push(`${validatedFile.name}: ${sanitizedError.message}`);
                    fileData.hasBlob = false;
                }
            } else {
                console.log(`  \u2139\ufe0f File has no blob data to reconstruct`, {
                    hasBlob: validatedFile.hasBlob,
                    hasBlobData: !!validatedFile.blobData,
                });
                fileData.hasBlob = false;
            }

            results.push(fileData);
            console.log(`  \u2705 File ${index + 1} processed successfully`);
        } catch (error) {
            const sanitizedError = errorHandler(error);
            console.error(`  \u274c Failed to process stored file ${index + 1}:`, {
                error: sanitizedError.message,
                fileName: storageFile.name || 'unknown',
                fileId: storageFile.id || 'unknown',
            });
            errors.push(`Invalid file data: ${sanitizedError.message}`);
            // Skip corrupted files
        }
    }

    // Log reconstruction summary
    const successCount = results.filter((f) => f.hasBlob).length;
    const totalCount = results.length;

    console.log('\ud83d\udcca CONVERT FILES FROM STORAGE - SUMMARY', {
        inputFiles: storageFiles.length,
        outputFiles: totalCount,
        filesWithBlobs: successCount,
        filesWithoutBlobs: totalCount - successCount,
        errorCount: errors.length,
        successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
    });

    console.log(
        `\u2705 File reconstruction complete: ${successCount}/${totalCount} files with blob data`,
    );

    if (errors.length > 0) {
        console.warn('\u26a0\ufe0f File reconstruction errors:', errors);
    }

    return results;
};

export const useDraftPersistence = (draftId?: string, options: DraftPersistenceOptions = {}) => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [justSaved, setJustSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
    const lastDraftState = useRef<DraftState | null>(null);
    const saveAbortController = useRef<AbortController | null>(null);
    const savePromise = useRef<Promise<void> | null>(null);
    const retryCount = useRef<number>(0);
    const maxRetries = 3;
    const baseRetryDelay = 1000; // 1 second

    // CRITICAL FIX: Lazy draft ID management - only create when needed
    const [lazyDraftId, setLazyDraftId] = useState<string | null>(null);

    const currentDraftId = draftId || lazyDraftId;

    // Function to generate a new draft ID when needed
    const generateDraftId = useCallback(() => {
        const newId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🆔 Generated new lazy draft ID: ${newId}`);
        setLazyDraftId(newId);
        return newId;
    }, []);

    // Function to set a discovered draft ID
    const setDiscoveredDraftId = useCallback((discoveredId: string) => {
        console.log(`🔍 Setting discovered draft ID: ${discoveredId}`);
        setLazyDraftId(discoveredId);
    }, []);

    // Log the current draft ID being used
    console.log(`🎯 useDraftPersistence using draft ID: ${currentDraftId}`, {
        providedDraftId: draftId,
        lazyDraftId: lazyDraftId,
        finalCurrentId: currentDraftId,
    });

    // CRITICAL FIX: Add operation lock to prevent race conditions
    const operationLockRef = useRef<Promise<void> | null>(null);

    const withOperationLock = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
        // Wait for any ongoing operation to complete
        if (operationLockRef.current) {
            console.log(`🔒 Waiting for previous operation to complete...`);
            try {
                await operationLockRef.current;
            } catch {
                // Ignore errors from previous operations
            }
        }

        // Execute the operation with lock
        const promise = operation();
        operationLockRef.current = promise.then(
            () => {},
            () => {},
        ); // Convert to void promise

        try {
            return await promise;
        } finally {
            // Small delay to prevent rapid successive operations
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
    }, []);

    // Storage utilities
    const getDraftKey = useCallback((id: string) => `${STORAGE_KEY_PREFIX}${id}`, []);

    const getDraftIndex = useCallback((): string[] => {
        try {
            console.log(`🔍 GET DRAFT INDEX - Reading from localStorage key: ${STORAGE_INDEX_KEY}`);
            const rawIndex = localStorage.getItem(STORAGE_INDEX_KEY);
            console.log(`📄 Raw localStorage value:`, { rawIndex, length: rawIndex?.length || 0 });

            if (rawIndex) {
                const parsedIndex = JSON.parse(rawIndex);
                console.log(`📋 Parsed draft index:`, {
                    parsedIndex,
                    type: Array.isArray(parsedIndex) ? 'array' : typeof parsedIndex,
                    length: Array.isArray(parsedIndex) ? parsedIndex.length : 'not array',
                });
                return Array.isArray(parsedIndex) ? parsedIndex : [];
            } else {
                console.log(`📄 No existing draft index found - returning empty array`);
                return [];
            }
        } catch (error) {
            console.error(`❌ Error reading draft index from localStorage:`, error);
            return [];
        }
    }, []);

    const updateDraftIndex = useCallback((draftIds: string[]) => {
        try {
            console.log(`📝 UPDATE DRAFT INDEX - Saving to localStorage:`, {
                key: STORAGE_INDEX_KEY,
                draftIds,
                idsCount: draftIds.length,
                timestamp: new Date().toISOString(),
            });

            const serializedIndex = JSON.stringify(draftIds);
            localStorage.setItem(STORAGE_INDEX_KEY, serializedIndex);

            // Immediate verification
            const verification = localStorage.getItem(STORAGE_INDEX_KEY);
            const verificationSuccess = verification === serializedIndex;

            console.log(`🔍 Update verification:`, {
                expectedValue: serializedIndex,
                actualValue: verification,
                verificationSuccess,
                valuesMatch: verification === serializedIndex,
            });

            if (!verificationSuccess) {
                console.error(`❌ CRITICAL: localStorage index update failed verification!`);
                throw new Error('Draft index update verification failed');
            }

            console.log(`✅ Draft index successfully updated and verified`);
        } catch (error) {
            console.error('❌ Failed to update draft index:', error);
            throw error; // Propagate error to caller so they can handle it
        }
    }, []);

    const addToDraftIndex = useCallback(
        (draftId: string) => {
            console.log(`📝 ADD TO DRAFT INDEX - START`, {
                draftId,
                timestamp: new Date().toISOString(),
            });

            try {
                // CRITICAL FIX: Always load existing index first
                const currentIndex = getDraftIndex();
                console.log(`📋 Current localStorage index before update:`, {
                    indexArray: currentIndex,
                    indexLength: currentIndex.length,
                    containsTargetId: currentIndex.includes(draftId),
                });

                // Only proceed if draft ID is not already in index
                if (!currentIndex.includes(draftId)) {
                    // MERGE: Add new draft ID at the beginning, maintain order
                    const newIndex = [draftId, ...currentIndex].slice(0, opts.maxDrafts);
                    console.log(`📝 Updating index with new draft ID:`, {
                        oldIndex: currentIndex,
                        newIndex,
                        addedId: draftId,
                        indexSizeChange: `${currentIndex.length} -> ${newIndex.length}`,
                    });

                    // Save the updated index
                    updateDraftIndex(newIndex);

                    // IMMEDIATE VERIFICATION: Check that the update succeeded
                    const verifyIndex = getDraftIndex();
                    console.log(`🔍 Verification check after index update:`, {
                        verifyIndex,
                        containsTargetId: verifyIndex.includes(draftId),
                        indexMatches: JSON.stringify(verifyIndex) === JSON.stringify(newIndex),
                    });

                    if (!verifyIndex.includes(draftId)) {
                        console.error(
                            `❌ CRITICAL: Draft ID ${draftId} was not properly added to localStorage index!`,
                        );
                        console.error(`Expected index:`, newIndex);
                        console.error(`Actual index:`, verifyIndex);

                        // RETRY ONCE: Force the update again
                        console.log(`🔄 RETRY: Forcing localStorage index update...`);
                        try {
                            localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(newIndex));
                            const retryVerify = getDraftIndex();
                            console.log(`🔍 Retry verification:`, {
                                retryIndex: retryVerify,
                                retryContainsTargetId: retryVerify.includes(draftId),
                            });

                            if (!retryVerify.includes(draftId)) {
                                throw new Error(
                                    `Failed to add draft ${draftId} to localStorage index after retry`,
                                );
                            }
                            console.log(`✅ Retry successful - draft ID added to index`);
                        } catch (retryError) {
                            console.error(`❌ Retry failed:`, retryError);
                            throw new Error(
                                `Critical failure: Cannot update localStorage index for draft ${draftId}`,
                            );
                        }
                    } else {
                        console.log(`✅ Draft ID successfully added to localStorage index`);
                    }
                } else {
                    console.log(
                        `ℹ️ Draft ID ${draftId} already exists in index - no update needed`,
                    );
                }

                console.log(`✅ ADD TO DRAFT INDEX - SUCCESS`);
            } catch (error) {
                console.error(`❌ ADD TO DRAFT INDEX - ERROR:`, error);
                throw error;
            }
        },
        [getDraftIndex, updateDraftIndex, opts.maxDrafts],
    );

    const removeFromDraftIndex = useCallback(
        (draftId: string) => {
            const index = getDraftIndex();
            const newIndex = index.filter((id) => id !== draftId);
            updateDraftIndex(newIndex);
        },
        [getDraftIndex, updateDraftIndex],
    );

    // Save draft to localStorage with File blob conversion
    const saveDraft = useCallback(
        async (
            state: Omit<DraftState, 'draftId' | 'lastSaved' | 'version'>,
            filesWithBlobs?: FileWithBlob[],
        ): Promise<void> => {
            try {
                setError(null);

                // Validate input state
                const validatedState = validateSchema(
                    state,
                    {
                        dealName: { type: 'string', required: true, sanitizer: sanitizeString },
                        description: { type: 'string', required: false, sanitizer: sanitizeString },
                        website: { type: 'string', required: false, sanitizer: sanitizeString },
                        fundingTarget: {
                            type: 'string',
                            required: false,
                            sanitizer: sanitizeString,
                        },
                        activeTab: { type: 'string', required: false, sanitizer: sanitizeString },
                        files: { type: 'array', required: true },
                    },
                    false,
                );

                const previousVersion = lastDraftState.current?.version || 0;

                // Convert files with File objects to storage format
                let processedFiles = validatedState.files;
                if (filesWithBlobs && filesWithBlobs.length > 0) {
                    try {
                        processedFiles = await convertFilesForStorage(filesWithBlobs);
                    } catch (error) {
                        const sanitizedError = errorHandler(error);
                        console.warn('Error converting files for storage:', sanitizedError.message);
                        // Fall back to original files without blob data
                        processedFiles = validatedState.files;
                    }
                }

                // CRITICAL FIX: Ensure we have a draft ID before saving
                let effectiveDraftId = currentDraftId;
                if (!effectiveDraftId) {
                    effectiveDraftId = generateDraftId();
                    console.log(`🆔 Generated new draft ID for save: ${effectiveDraftId}`);
                }

                const draftState: DraftState = {
                    ...validatedState,
                    files: processedFiles,
                    draftId: effectiveDraftId,
                    lastSaved: Date.now(),
                    version: previousVersion + 1,
                };

                const key = getDraftKey(effectiveDraftId);
                const serializedData = JSON.stringify(draftState);

                // Use enhanced storage with compression and fallbacks
                console.log(`🔄 Saving draft with key: ${key}`);
                const storageInfo = await enhancedStorageSet(key, serializedData);

                // CRITICAL FIX: Ensure localStorage index is ALWAYS updated AFTER successful storage
                console.log(
                    `📝 Storage completed via ${storageInfo.storageMethod}, updating localStorage index...`,
                );

                try {
                    // Add to index with comprehensive verification
                    addToDraftIndex(effectiveDraftId);

                    // IMMEDIATE VERIFICATION: Check that the draft can actually be retrieved
                    console.log(`🔍 Verifying draft can be retrieved...`);
                    const verificationResult = await enhancedStorageGet(key);
                    if (!verificationResult) {
                        console.error(
                            `❌ CRITICAL: Draft was saved but cannot be retrieved! Key: ${key}`,
                        );
                        throw new Error('Draft save verification failed - data not retrievable');
                    }
                    console.log(`✅ Draft verification successful - data can be retrieved`);

                    // FINAL VERIFICATION: Ensure draft ID is in localStorage index
                    const finalIndex = getDraftIndex();
                    console.log(`📋 Final localStorage index verification:`, {
                        finalIndex,
                        containsCurrentDraftId: finalIndex.includes(effectiveDraftId),
                        indexLength: finalIndex.length,
                    });

                    if (!finalIndex.includes(effectiveDraftId)) {
                        throw new Error(
                            `CRITICAL FAILURE: Draft ${effectiveDraftId} was saved but is missing from localStorage index`,
                        );
                    }

                    console.log(`✅ Draft save completed and verified for key: ${key}`);
                } catch (indexError) {
                    console.error(`❌ Index update failed during save:`, indexError);
                    // Clean up the storage entry if index update failed
                    try {
                        await enhancedStorageRemove(key);
                        console.log(`🧹 Cleaned up storage entry after index failure`);
                    } catch (cleanupError) {
                        console.error(`❌ Failed to cleanup storage entry:`, cleanupError);
                    }
                    throw indexError;
                }

                lastDraftState.current = draftState;
                setLastSaved(new Date());
                setJustSaved(true);

                // Reset justSaved flag after a delay to hide the alert
                setTimeout(() => {
                    setJustSaved(false);
                }, 3000);

                console.log(
                    `Draft saved successfully via ${storageInfo.storageMethod}: ${formatFileSize(storageInfo.originalSize)} → ${formatFileSize(storageInfo.base64Size)} (${Math.round((1 - storageInfo.compressionRatio) * 100)}% compression)`,
                );
            } catch (error) {
                const sanitizedError = errorHandler(error);
                setError(sanitizedError.message);
                throw error;
            }
        },
        [
            generateDraftId,
            getDraftKey,
            addToDraftIndex,
            getDraftIndex,
            updateDraftIndex,
            opts.maxDrafts,
        ],
    );

    // Auto-save functionality with concurrency protection and retry logic
    const autoSave = useCallback(
        async (
            state: Omit<DraftState, 'draftId' | 'lastSaved' | 'version'>,
            filesWithBlobs?: FileWithBlob[],
        ) => {
            // Don't auto-save if state hasn't changed
            if (lastDraftState.current) {
                const currentStateString = JSON.stringify({
                    dealName: state.dealName,
                    description: state.description,
                    website: state.website,
                    fundingTarget: state.fundingTarget,
                    files: state.files.map((f) => ({
                        id: f.id,
                        name: f.name,
                        size: f.size,
                        hasBlob: f.hasBlob,
                    })),
                });
                const lastStateString = JSON.stringify({
                    dealName: lastDraftState.current.dealName,
                    description: lastDraftState.current.description,
                    website: lastDraftState.current.website,
                    fundingTarget: lastDraftState.current.fundingTarget,
                    files: lastDraftState.current.files.map((f) => ({
                        id: f.id,
                        name: f.name,
                        size: f.size,
                        hasBlob: f.hasBlob,
                    })),
                });

                if (currentStateString === lastStateString) {
                    return;
                }
            }

            // Cancel any ongoing save operation
            if (saveAbortController.current) {
                saveAbortController.current.abort();
                console.log('Cancelled previous auto-save operation');
            }

            // Wait for previous save to complete if it exists
            if (savePromise.current) {
                try {
                    await savePromise.current;
                } catch {
                    // Ignore errors from cancelled operations
                }
            }

            // Create new abort controller for this operation
            saveAbortController.current = new AbortController();
            const currentController = saveAbortController.current;

            const performSaveWithRetry = async (attempt: number = 0): Promise<void> => {
                if (currentController.signal.aborted) {
                    throw new Error('Save operation was cancelled');
                }

                setIsAutoSaving(true);

                try {
                    await saveDraft(state, filesWithBlobs);
                    retryCount.current = 0; // Reset retry count on success
                    console.log('Auto-save completed successfully');
                } catch (error) {
                    if (currentController.signal.aborted) {
                        throw new Error('Save operation was cancelled');
                    }

                    const sanitizedError = errorHandler(error);

                    // Retry on transient errors
                    if (attempt < maxRetries && isRetriableError(sanitizedError)) {
                        const delay = baseRetryDelay * Math.pow(2, attempt); // Exponential backoff
                        console.warn(
                            `Auto-save failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`,
                            sanitizedError.message,
                        );

                        await new Promise((resolve) => setTimeout(resolve, delay));

                        if (!currentController.signal.aborted) {
                            return performSaveWithRetry(attempt + 1);
                        }
                    } else {
                        console.error('Auto-save failed permanently:', sanitizedError.message);
                        throw error;
                    }
                } finally {
                    setIsAutoSaving(false);
                }
            };

            // Store the save promise for concurrency control
            savePromise.current = performSaveWithRetry()
                .catch((error) => {
                    if (!currentController.signal.aborted) {
                        console.warn('Auto-save failed:', error);
                    }
                })
                .finally(() => {
                    if (saveAbortController.current === currentController) {
                        saveAbortController.current = null;
                        savePromise.current = null;
                    }
                });

            return savePromise.current;
        },
        [saveDraft],  // Keep only saveDraft dependency to prevent closure issues
    );

    // Check if error is retriable
    const isRetriableError = (error: SanitizedError): boolean => {
        return error.type === 'storage' || error.type === 'quota' || error.type === 'network';
    };

    // Schedule auto-save with debouncing
    const scheduleAutoSave = useCallback(
        (
            state: Omit<DraftState, 'draftId' | 'lastSaved' | 'version'>,
            filesWithBlobs?: FileWithBlob[],
        ) => {
            if (autoSaveTimer.current) {
                clearTimeout(autoSaveTimer.current);
            }

            autoSaveTimer.current = setTimeout(() => {
                autoSave(state, filesWithBlobs).catch((error) => {
                    console.warn('Scheduled auto-save failed:', error);
                });
            }, opts.autoSaveInterval);
        },
        [autoSave, opts.autoSaveInterval],
    );

    // Delete draft from all storage locations - MOVED BEFORE loadDraft to fix hoisting issue
    const deleteDraft = useCallback(
        async (id: string = currentDraftId) => {
            try {
                setError(null);
                const key = getDraftKey(id);

                // Remove from all possible storage locations
                await enhancedStorageRemove(key);
                removeFromDraftIndex(id);

                if (id === currentDraftId) {
                    lastDraftState.current = null;
                    setLastSaved(null);
                    setJustSaved(false);
                }
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : 'Failed to delete draft';
                setError(errorMessage);
            }
        },
        [getDraftKey, removeFromDraftIndex],  // Remove currentDraftId dependency
    );

    // Load draft from enhanced storage with validation and integrity checking
    const loadDraft = useCallback(
        async (id?: string): Promise<DraftState | null> => {
            // CRITICAL FIX: Don't use currentDraftId as default if it doesn't exist
            if (!id && !currentDraftId) {
                console.log(`📝 loadDraft: No draft ID provided and no current draft ID`);
                return null;
            }
            const effectiveId = id || currentDraftId!;
            try {
                setError(null);
                const key = getDraftKey(effectiveId);

                // Use enhanced storage retrieval
                const stored = await enhancedStorageGet(key);

                if (!stored) return null;

                // Validate file integrity if it looks like file data
                if (stored.includes('base64') || stored.includes('compressed')) {
                    const integrityCheck = await validateFileIntegrity(stored);
                    if (!integrityCheck.isValid) {
                        console.warn(
                            `Draft ${effectiveId} has corrupted file data:`,
                            integrityCheck.error,
                        );
                        await deleteDraft(effectiveId);
                        return null;
                    }
                }

                // Safe JSON parse with corruption checking
                const parsedData = safeJSONParse(stored);
                if (!parsedData) {
                    console.warn(`Failed to parse draft ${effectiveId}, removing corrupted data`);
                    await deleteDraft(effectiveId);
                    return null;
                }

                // Check for data corruption
                const corruptionIssues = checkDataCorruption(parsedData);
                if (corruptionIssues.length > 0) {
                    console.warn(
                        `Draft ${effectiveId} data corruption detected:`,
                        corruptionIssues,
                    );
                    await deleteDraft(effectiveId);
                    return null;
                }

                // Validate against schema
                const draft = validateSchema<DraftState>(parsedData, DRAFT_STATE_SCHEMA, false);

                // Check if draft has expired
                const ageInDays = (Date.now() - draft.lastSaved) / (1000 * 60 * 60 * 24);
                if (ageInDays > opts.expirationDays) {
                    console.log(
                        `Draft ${effectiveId} expired (${Math.round(ageInDays)} days old), removing`,
                    );
                    await deleteDraft(effectiveId);
                    return null;
                }

                lastDraftState.current = draft;
                setLastSaved(new Date(draft.lastSaved));
                // Don't set justSaved when loading - this is restored data, not a fresh save

                console.log(
                    `Draft loaded successfully from enhanced storage: ${draft.dealName} (${draft.files.length} files)`,
                );
                return draft;
            } catch (error) {
                const sanitizedError = errorHandler(error);
                console.warn(`Failed to load draft ${effectiveId}:`, sanitizedError.message);
                setError(sanitizedError.message);

                // Remove corrupted draft
                try {
                    await deleteDraft(effectiveId);
                } catch {
                    // Ignore deletion errors
                }

                return null;
            }
        },
        [getDraftKey, opts.expirationDays, deleteDraft],  // Remove currentDraftId dependency
    );

    // Get all saved drafts with validation and enhanced storage support
    const getAllDrafts = useCallback(async (): Promise<DraftState[]> => {
        // CRITICAL FIX: Check both localStorage index AND IndexedDB directly for drafts
        const localStorageIndex = getDraftIndex();
        console.log(`🔍 getAllDrafts: localStorage index contains:`, localStorageIndex);
        const allDraftIds = new Set<string>(localStorageIndex);

        // Get draft keys from IndexedDB that aren't in localStorage index
        console.log(`🔍 Scanning IndexedDB for draft keys with prefix: ${STORAGE_KEY_PREFIX}`);
        try {
            const indexedDBKeys = await getAllKeysFromIndexedDB(STORAGE_KEY_PREFIX);
            console.log(`📦 IndexedDB returned ${indexedDBKeys.length} keys:`, indexedDBKeys);

            for (const key of indexedDBKeys) {
                if (key.startsWith(STORAGE_KEY_PREFIX)) {
                    const draftId = key.substring(STORAGE_KEY_PREFIX.length);
                    console.log(`📝 Found draft ID from IndexedDB: ${draftId} (from key: ${key})`);
                    allDraftIds.add(draftId);
                } else {
                    console.log(`⚠️ IndexedDB key does not match prefix: ${key}`);
                }
            }
        } catch (error) {
            console.warn('❌ Failed to get IndexedDB draft keys:', error);
        }

        const drafts: DraftState[] = [];
        const corruptedDrafts: string[] = [];
        const missingFromIndex: string[] = [];

        console.log(
            `🔍 getAllDrafts: Found ${allDraftIds.size} total draft IDs (${localStorageIndex.length} from localStorage index, ${allDraftIds.size - localStorageIndex.length} additional from IndexedDB)`,
        );

        for (const draftId of allDraftIds) {
            try {
                setError(null);
                const key = getDraftKey(draftId);
                const stored = await enhancedStorageGet(key);

                if (!stored) {
                    corruptedDrafts.push(draftId);
                    continue;
                }

                // Safe JSON parse
                const parsedData = safeJSONParse(stored);
                if (!parsedData) {
                    console.warn(`Failed to parse draft ${draftId}`);
                    corruptedDrafts.push(draftId);
                    continue;
                }

                // Check for corruption
                const corruptionIssues = checkDataCorruption(parsedData);
                if (corruptionIssues.length > 0) {
                    console.warn(`Draft ${draftId} corrupted:`, corruptionIssues);
                    corruptedDrafts.push(draftId);
                    continue;
                }

                // Validate schema
                const draft = validateSchema<DraftState>(parsedData, DRAFT_STATE_SCHEMA, false);

                // Check if draft has expired
                const ageInDays = (Date.now() - draft.lastSaved) / (1000 * 60 * 60 * 24);
                if (ageInDays > opts.expirationDays) {
                    console.log(`Draft ${draftId} expired, removing`);
                    corruptedDrafts.push(draftId);
                    continue;
                }

                // Track drafts that were found in storage but missing from localStorage index
                if (!localStorageIndex.includes(draftId)) {
                    missingFromIndex.push(draftId);
                }

                drafts.push(draft);
            } catch (error) {
                const sanitizedError = errorHandler(error);
                console.warn('Failed to load draft:', draftId, sanitizedError.message);
                corruptedDrafts.push(draftId);
            }
        }

        // CRITICAL FIX: Update localStorage index with drafts that were missing from it
        if (missingFromIndex.length > 0) {
            console.log(
                `📝 Updating localStorage index with ${missingFromIndex.length} drafts that were missing:`,
                missingFromIndex,
            );
            const updatedIndex = [...new Set([...missingFromIndex, ...localStorageIndex])].slice(
                0,
                opts.maxDrafts,
            );
            updateDraftIndex(updatedIndex);
        }

        // Clean up corrupted drafts using enhanced removal
        for (const corruptedId of corruptedDrafts) {
            try {
                await enhancedStorageRemove(getDraftKey(corruptedId));
                removeFromDraftIndex(corruptedId);
            } catch (error) {
                console.warn(`Failed to clean up corrupted draft ${corruptedId}:`, error);
            }
        }

        if (corruptedDrafts.length > 0) {
            console.log(`Cleaned up ${corruptedDrafts.length} corrupted/expired drafts`);
        }

        console.log(`✅ getAllDrafts: Returning ${drafts.length} valid drafts`);

        // Sort by last saved time (newest first)
        return drafts.sort((a, b) => b.lastSaved - a.lastSaved);
    }, [
        getDraftIndex,
        getDraftKey,
        opts.expirationDays,
        opts.maxDrafts,
        removeFromDraftIndex,
        updateDraftIndex,
    ]);

    // Clear expired drafts
    const clearExpiredDrafts = useCallback(async () => {
        const index = getDraftIndex();
        const validDrafts: string[] = [];

        for (const draftId of index) {
            const draft = await loadDraft(draftId);
            if (draft) {
                validDrafts.push(draftId);
            }
        }

        updateDraftIndex(validDrafts);
    }, [getDraftIndex, loadDraft, updateDraftIndex]);

    // Clear all drafts from all storage locations
    const clearAllDrafts = useCallback(async () => {
        const index = getDraftIndex();

        for (const draftId of index) {
            const key = getDraftKey(draftId);
            await enhancedStorageRemove(key);
        }

        localStorage.removeItem(STORAGE_INDEX_KEY);
        lastDraftState.current = null;
        setLastSaved(null);
        setJustSaved(false);
    }, [getDraftIndex, getDraftKey]);

    // Check for conflicts (multiple tabs editing same draft)
    const checkForConflicts = useCallback(async (): Promise<{
        hasConflict: boolean;
        conflictVersion?: number;
    }> => {
        if (!lastDraftState.current) return { hasConflict: false };

        const storedDraft = await loadDraft(currentDraftId);
        if (!storedDraft) return { hasConflict: false };

        const hasConflict = storedDraft.version > lastDraftState.current.version;
        return {
            hasConflict,
            conflictVersion: hasConflict ? storedDraft.version : undefined,
        };
    }, [currentDraftId, loadDraft]);

    // Listen for storage changes (other tabs) - Note: IndexedDB changes aren't detectable via storage events
    useEffect(() => {
        const handleStorageChange = async (e: StorageEvent) => {
            if (e.key === getDraftKey(currentDraftId) && e.newValue) {
                try {
                    // Try to decompress if needed
                    const decompressedValue = await enhancedStorageGet(getDraftKey(currentDraftId));
                    if (decompressedValue) {
                        const newDraft: DraftState = JSON.parse(decompressedValue);
                        if (
                            lastDraftState.current &&
                            newDraft.version > lastDraftState.current.version
                        ) {
                            // Another tab updated the draft
                            lastDraftState.current = newDraft;
                            setLastSaved(new Date(newDraft.lastSaved));
                            // Don't set justSaved for changes from other tabs
                        }
                    }
                } catch (error) {
                    console.warn('Failed to process storage change:', error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [currentDraftId, getDraftKey]);

    // Clean up auto-save timer and abort controllers
    useEffect(() => {
        return () => {
            if (autoSaveTimer.current) {
                clearTimeout(autoSaveTimer.current);
            }

            // Cancel any ongoing save operations
            if (saveAbortController.current) {
                saveAbortController.current.abort();
            }
        };
    }, []);

    // Clean up expired drafts on mount
    useEffect(() => {
        clearExpiredDrafts().catch((error) => {
            console.warn('Failed to clear expired drafts on mount:', error);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        // Core functionality
        saveDraft,
        loadDraft,
        deleteDraft,
        scheduleAutoSave,

        // Draft ID management
        generateDraftId,
        setDiscoveredDraftId,

        // File conversion utilities
        convertFilesFromStorage,

        // Batch operations
        getAllDrafts,
        clearAllDrafts,
        clearExpiredDrafts,

        // Conflict resolution
        checkForConflicts,

        // State
        currentDraftId,
        isAutoSaving,
        lastSaved,
        justSaved,
        error,

        // Utilities
        clearError: () => setError(null),
    };
};
