import React, { useCallback, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    documentType?: string;
    proprietary?: boolean;
    tldr?: string;
    tags?: string[];
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
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('document') || type.includes('word')) return '📝';
    if (type.includes('spreadsheet') || type.includes('excel')) return '📊';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📈';
    return '📎';
};

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

    const validateFiles = useCallback(
        (fileList: FileList): { valid: File[]; errors: string[] } => {
            const validFiles: File[] = [];
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
                const isDuplicate = files.some((f) => f.name === file.name && f.size === file.size);
                if (isDuplicate) {
                    errors.push(`File "${file.name}" is already added`);
                    return;
                }

                validFiles.push(file);
            });

            return { valid: validFiles, errors };
        },
        [files, maxFiles, maxSize],
    );

    const handleFileSelect = useCallback(
        (fileList: FileList | null) => {
            if (!fileList || disabled) return;

            const { valid, errors } = validateFiles(fileList);
            setErrors(errors);

            if (valid.length > 0) {
                onFilesAdd(valid);
            }
        },
        [validateFiles, onFilesAdd, disabled],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);

            handleFileSelect(e.dataTransfer.files);
        },
        [handleFileSelect],
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) {
                setDragOver(true);
            }
        },
        [disabled],
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    }, []);

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            handleFileSelect(e.target.files);
            // Reset input value to allow selecting the same file again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
        [handleFileSelect],
    );

    const handleBrowseClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const getStatusIcon = (status: UploadFile['status']) => {
        switch (status) {
            case 'uploading':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <FileText className="h-4 w-4 text-muted-foreground" />;
        }
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
                return <Badge variant="outline">Pending</Badge>;
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
                <Card>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-200">
                            {files.map((file) => (
                                <div key={file.id} className="p-4 flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                        {getStatusIcon(file.status)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm">
                                                {getFileIcon(file.type)}
                                            </span>
                                            <span className="font-medium text-sm truncate">
                                                {file.name}
                                            </span>
                                            {getStatusBadge(file.status)}
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
                                        disabled={file.status === 'uploading'}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary */}
            {files.length > 0 && (
                <div className="text-sm text-muted-foreground">
                    {files.length} of {maxFiles} files selected
                </div>
            )}
        </div>
    );
}
