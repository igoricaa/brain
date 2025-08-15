import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Upload,
    X,
    FileText,
    AlertCircle,
    CheckCircle,
    Loader2,
    File,
    Image,
    FileSpreadsheet,
    Presentation,
    Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DuplicateResolutionDialog, { type ExistingFileInfo } from './DuplicateResolutionDialog';

export interface FileUploadProps {
    onFilesAdd: (files: File[]) => void;
    onFileRemove: (fileId: string) => void;
    files: UploadFile[];
    accept?: string;
    maxFiles?: number;
    maxSize?: number; // in bytes
    disabled?: boolean;
}

export interface UploadFile {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    progress: number;
    error?: string;
    // Optional metadata for draft persistence
    category?: string;
    domain?: 'ai_ml' | 'life_sciences' | 'dual_use' | 'sustainability';
    documentType?: string;
    proprietary?: boolean;
    tldr?: string;
    tags?: string[];
    published_at?: string;
    lastModified?: number;
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (type.includes('image')) return <Image className="h-4 w-4 text-blue-500" />;
    if (type.includes('document') || type.includes('word'))
        return <FileText className="h-4 w-4 text-blue-600" />;
    if (type.includes('spreadsheet') || type.includes('excel'))
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    if (type.includes('presentation') || type.includes('powerpoint'))
        return <Presentation className="h-4 w-4 text-orange-500" />;
    return <File className="h-4 w-4 text-gray-500" />;
};

/**
 * Enhanced file upload component with comprehensive duplicate resolution.
 * 
 * Features:
 * - Drag and drop file upload
 * - File validation (size, type, count limits)
 * - Intelligent duplicate detection and resolution
 * - Visual progress indicators
 * - Batch duplicate handling
 * - Accessibility compliant
 * 
 * @param onFilesAdd - Callback when valid files are added
 * @param onFileRemove - Callback when a file is removed  
 * @param files - Current list of uploaded files
 * @param accept - Accepted file types (default: documents and images)
 * @param maxFiles - Maximum number of files allowed (default: 10)
 * @param maxSize - Maximum file size in bytes (default: 50MB)
 * @param disabled - Whether the upload is disabled
 */
export default function FileUpload({
    onFilesAdd,
    onFileRemove,
    files,
    accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt',
    maxFiles = 10,
    maxSize = 50 * 1024 * 1024, // 50MB
    disabled = false,
}: FileUploadProps) {
    const [dragOver, setDragOver] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Duplicate resolution state
    const [duplicateQueue, setDuplicateQueue] = useState<{newFile: File, existingFile: UploadFile}[]>([]);
    const [currentDuplicate, setCurrentDuplicate] = useState<{newFile: File, existingFile: UploadFile} | null>(null);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [isResolvingDuplicate, setIsResolvingDuplicate] = useState(false);

    const validateFiles = (fileList: FileList): { valid: File[]; duplicates: {newFile: File, existingFile: UploadFile}[]; errors: string[] } => {
        const validFiles: File[] = [];
        const duplicates: {newFile: File, existingFile: UploadFile}[] = [];
        const errors: string[] = [];
        const currentFileCount = files.length;

        Array.from(fileList).forEach((file) => {
            // Check file count limit
            if (currentFileCount + validFiles.length >= maxFiles) {
                errors.push(`Maximum ${maxFiles} files allowed`);
                return;
            }

            // Check file size
            if (file.size > maxSize) {
                errors.push(
                    `File "${file.name}" is too large (max ${formatFileSize(maxSize)})`,
                );
                return;
            }

            // Check for duplicates
            const existingFile = files.find((f) => f.name === file.name && f.size === file.size);
            if (existingFile) {
                duplicates.push({ newFile: file, existingFile });
                return;
            }

            validFiles.push(file);
        });

        return { valid: validFiles, duplicates, errors: [...new Set(errors)] };
    };

    const handleFileSelect = (fileList: FileList | null) => {
        if (!fileList || disabled) return;

        const { valid, duplicates, errors } = validateFiles(fileList);
        setErrors(errors);

        // Add valid files immediately
        if (valid.length > 0) {
            onFilesAdd(valid);
        }

        // Handle duplicates
        if (duplicates.length > 0) {
            setDuplicateQueue(duplicates);
            showNextDuplicate(duplicates);
        }
    };

    const showNextDuplicate = (queue: {newFile: File, existingFile: UploadFile}[]) => {
        if (queue.length > 0) {
            setCurrentDuplicate(queue[0]);
            setShowDuplicateDialog(true);
        }
    };

    const handleDuplicateReplace = async () => {
        if (!currentDuplicate) return;
        
        setIsResolvingDuplicate(true);
        try {
            // Remove the existing file
            onFileRemove(currentDuplicate.existingFile.id);
            
            // Add the new file
            onFilesAdd([currentDuplicate.newFile]);
            
            // Process next duplicate
            const remainingQueue = duplicateQueue.slice(1);
            setDuplicateQueue(remainingQueue);
            setCurrentDuplicate(null);
            setShowDuplicateDialog(false);
            
            // Clear any previous errors
            setErrors([]);
            
            if (remainingQueue.length > 0) {
                setTimeout(() => showNextDuplicate(remainingQueue), 500);
            }
        } catch (error) {
            console.error('Error replacing duplicate file:', error);
            setErrors(['Failed to replace file. Please try again.']);
        } finally {
            setIsResolvingDuplicate(false);
        }
    };

    const handleDuplicateKeepBoth = async (newName: string) => {
        if (!currentDuplicate) return;
        
        // Validate the new name
        if (!newName.trim()) {
            setErrors(['Please enter a valid file name']);
            return;
        }
        
        if (newName === currentDuplicate.newFile.name) {
            setErrors(['Please choose a different name from the original file']);
            return;
        }
        
        // Check if the new name conflicts with existing files
        const nameConflict = files.some(f => f.name === newName.trim());
        if (nameConflict) {
            setErrors([`A file named "${newName.trim()}" already exists. Please choose a different name.`]);
            return;
        }
        
        setIsResolvingDuplicate(true);
        try {
            // Create a new file with the modified name
            const renamedFile = new File(
                [currentDuplicate.newFile], 
                newName.trim(), 
                { type: currentDuplicate.newFile.type }
            );
            
            // Add the renamed file
            onFilesAdd([renamedFile]);
            
            // Process next duplicate
            const remainingQueue = duplicateQueue.slice(1);
            setDuplicateQueue(remainingQueue);
            setCurrentDuplicate(null);
            setShowDuplicateDialog(false);
            
            // Clear any previous errors
            setErrors([]);
            
            if (remainingQueue.length > 0) {
                setTimeout(() => showNextDuplicate(remainingQueue), 500);
            }
        } catch (error) {
            console.error('Error processing duplicate file:', error);
            setErrors(['Failed to process file. Please try again.']);
        } finally {
            setIsResolvingDuplicate(false);
        }
    };

    const handleDuplicateCancel = () => {
        if (!currentDuplicate) return;
        
        // Process next duplicate
        const remainingQueue = duplicateQueue.slice(1);
        setDuplicateQueue(remainingQueue);
        setCurrentDuplicate(null);
        setShowDuplicateDialog(false);
        
        if (remainingQueue.length > 0) {
            setTimeout(() => showNextDuplicate(remainingQueue), 500);
        }
    };

    const createExistingFileInfo = (uploadFile: UploadFile): ExistingFileInfo => {
        return {
            id: uploadFile.id,
            name: uploadFile.name,
            size: uploadFile.size,
            type: uploadFile.type,
            uploadDate: new Date().toISOString(), // Current time as placeholder
            status: uploadFile.status,
            category: uploadFile.category,
            domain: uploadFile.domain,
            processing_status: 'pending', // Default since UploadFile doesn't have this
        };
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        handleFileSelect(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files);
        // Reset input value to allow selecting the same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    const getStatusBadge = (status: UploadFile['status']) => {
        switch (status) {
            case 'uploading':
                return <Badge variant="secondary">Uploading</Badge>;
            case 'completed':
                return (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                        Completed
                    </Badge>
                );
            case 'error':
                return <Badge variant="destructive">Error</Badge>;
            default:
                return (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>
                );
        }
    };

    return (
        <div className="space-y-4">
            {/* Drag and drop area */}
            <Card
                className={cn(
                    'border-2 border-dashed transition-all duration-200 cursor-pointer',
                    dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50',
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={!disabled ? handleBrowseClick : undefined}
            >
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <Upload
                        className={cn(
                            'h-12 w-12 mb-4',
                            dragOver ? 'text-primary' : 'text-muted-foreground',
                        )}
                    />
                    <h3 className="text-lg font-semibold mb-2">
                        {dragOver ? 'Drop files here' : 'Upload Files'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Drag and drop files here, or click to browse
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p>Accepted formats: PDF, DOC, XLS, PPT, Images</p>
                        <p>Max file size: {formatFileSize(maxSize)}</p>
                        <p>Max files: {maxFiles}</p>
                    </div>
                    <Button
                        variant="outline"
                        className="mt-4"
                        type="button"
                        disabled={disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleBrowseClick();
                        }}
                    >
                        Browse Files
                    </Button>
                </CardContent>
            </Card>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={accept}
                onChange={handleFileInputChange}
                className="hidden"
                disabled={disabled}
            />

            {/* Error messages */}
            {errors.length > 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                            {errors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {/* File list */}
            {files.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-200">
                            {files.map((file) => {
                                const isDuplicatePending = duplicateQueue.some(d => d.existingFile.id === file.id);
                                return (
                                    <div key={file.id} className={cn(
                                        "p-4 flex items-center gap-3",
                                        isDuplicatePending && "bg-amber-50 border-l-4 border-amber-400"
                                    )}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {getFileIcon(file.type)}
                                                <span className="font-medium text-sm truncate">
                                                    {file.name}
                                                </span>
                                                {isDuplicatePending ? (
                                                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                                        Duplicate Pending
                                                    </Badge>
                                                ) : (
                                                    getStatusBadge(file.status)
                                                )}
                                            </div>

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span>{formatFileSize(file.size)}</span>
                                            <span>{file.type}</span>
                                        </div>

                                        {/* Progress bar for uploading files */}
                                        {file.status === 'uploading' && (
                                            <div className="mt-2">
                                                <Progress value={file.progress} className="h-1" />
                                                <span className="text-xs text-muted-foreground">
                                                    {file.progress}% uploaded
                                                </span>
                                            </div>
                                        )}

                                        {/* Error message */}
                                        {file.status === 'error' && file.error && (
                                            <div className="mt-1 text-xs text-red-600">
                                                {file.error}
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onFileRemove(file.id)}
                                        className="flex-shrink-0"
                                        disabled={file.status === 'uploading' || isDuplicatePending}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary */}
            {files.length > 0 && (
                <div className="text-sm text-muted-foreground">
                    {files.length} of {maxFiles} files selected
                    {duplicateQueue.length > 0 && (
                        <span className="ml-2 text-amber-600">({duplicateQueue.length} duplicate{duplicateQueue.length === 1 ? '' : 's'} pending resolution)</span>
                    )}
                </div>
            )}

            {/* Duplicate Resolution Dialog */}
            {currentDuplicate && (
                <DuplicateResolutionDialog
                    isOpen={showDuplicateDialog}
                    onClose={() => setShowDuplicateDialog(false)}
                    newFile={{
                        id: `temp-${Date.now()}`,
                        file: currentDuplicate.newFile,
                        name: currentDuplicate.newFile.name,
                        size: currentDuplicate.newFile.size,
                        type: currentDuplicate.newFile.type,
                        status: 'pending',
                        progress: 0,
                    }}
                    existingFile={createExistingFileInfo(currentDuplicate.existingFile)}
                    onReplace={handleDuplicateReplace}
                    onKeepBoth={handleDuplicateKeepBoth}
                    onCancel={handleDuplicateCancel}
                    isProcessing={isResolvingDuplicate}
                />
            )}
        </div>
    );
}
