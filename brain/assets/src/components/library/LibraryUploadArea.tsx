import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileText, X, AlertCircle, CheckCircle, Cloud, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { useFileManagement } from '@/hooks/useFileManagement';

interface LibraryCategory {
    uuid: string;
    name: string;
    code: string;
}

interface LibrarySource {
    uuid: string;
    name: string;
    code: string;
}

interface DocumentType {
    uuid: string;
    name: string;
    code: string;
}

interface UploadFile {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    error?: string;
    metadata: {
        category?: string;
        source?: string;
        document_type?: string;
        tags: string[];
        tldr?: string;
        is_public: boolean;
    };
}

interface LibraryUploadAreaProps {
    categories: LibraryCategory[];
    sources: LibrarySource[];
    documentTypes: DocumentType[];
    onUploadComplete?: () => void;
    maxFiles?: number;
    maxFileSize?: number; // in MB
    acceptedTypes?: string[];
}

const ACCEPTED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
];

const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export default function LibraryUploadArea({
    categories,
    sources,
    documentTypes,
    onUploadComplete,
    maxFiles = 50,
    maxFileSize = 15, // 15MB default
    acceptedTypes = ACCEPTED_FILE_TYPES,
}: LibraryUploadAreaProps) {
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [globalMetadata, setGlobalMetadata] = useState({
        category: '',
        source: '',
        document_type: '',
        tags: [] as string[],
        is_public: false,
    });
    const [tagInput, setTagInput] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadLibraryFile } = useFileManagement();

    // Handle file selection
    const handleFileSelect = useCallback(
        (selectedFiles: FileList | File[]) => {
            const fileArray = Array.from(selectedFiles);
            const validFiles: UploadFile[] = [];
            const errors: string[] = [];

            for (const file of fileArray) {
                // Check file size
                if (file.size > maxFileSize * 1024 * 1024) {
                    errors.push(`${file.name}: File size exceeds ${maxFileSize}MB limit`);
                    continue;
                }

                // Check file type
                if (!acceptedTypes.includes(file.type)) {
                    errors.push(`${file.name}: File type not supported`);
                    continue;
                }

                // Check total file count
                if (files.length + validFiles.length >= maxFiles) {
                    errors.push(`Maximum ${maxFiles} files allowed`);
                    break;
                }

                const uploadFile: UploadFile = {
                    id: `${Date.now()}_${Math.random()}`,
                    file,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    progress: 0,
                    status: 'pending',
                    metadata: {
                        category: globalMetadata.category,
                        source: globalMetadata.source,
                        document_type: globalMetadata.document_type,
                        tags: [...globalMetadata.tags],
                        is_public: globalMetadata.is_public,
                    },
                };

                validFiles.push(uploadFile);
            }

            if (errors.length > 0) {
                toast.error('File validation errors', {
                    description: errors.join('\n'),
                });
            }

            if (validFiles.length > 0) {
                setFiles((prev) => [...prev, ...validFiles]);
            }
        },
        [files.length, maxFiles, maxFileSize, acceptedTypes, globalMetadata],
    );

    // Handle drag and drop
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            const droppedFiles = e.dataTransfer.files;
            handleFileSelect(droppedFiles);
        },
        [handleFileSelect],
    );

    // Handle file input click
    const handleFileInputClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files) {
                handleFileSelect(e.target.files);
            }
        },
        [handleFileSelect],
    );

    // Remove file
    const handleRemoveFile = useCallback((fileId: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
    }, []);

    // Update file metadata
    const handleFileMetadataChange = useCallback((fileId: string, field: string, value: any) => {
        setFiles((prev) =>
            prev.map((file) =>
                file.id === fileId
                    ? { ...file, metadata: { ...file.metadata, [field]: value } }
                    : file,
            ),
        );
    }, []);

    // Handle global metadata changes
    const handleGlobalMetadataChange = useCallback((field: string, value: any) => {
        setGlobalMetadata((prev) => ({ ...prev, [field]: value }));

        // Apply to all files
        setFiles((prev) =>
            prev.map((file) => ({
                ...file,
                metadata: { ...file.metadata, [field]: value },
            })),
        );
    }, []);

    // Add tag
    const handleAddTag = useCallback(
        (tag: string) => {
            if (tag.trim() && !globalMetadata.tags.includes(tag.trim())) {
                const newTags = [...globalMetadata.tags, tag.trim()];
                handleGlobalMetadataChange('tags', newTags);
            }
            setTagInput('');
        },
        [globalMetadata.tags, handleGlobalMetadataChange],
    );

    // Remove tag
    const handleRemoveTag = useCallback(
        (tagToRemove: string) => {
            const newTags = globalMetadata.tags.filter((tag) => tag !== tagToRemove);
            handleGlobalMetadataChange('tags', newTags);
        },
        [globalMetadata.tags, handleGlobalMetadataChange],
    );

    // Upload files
    const handleUpload = useCallback(async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        const uploadPromises = files.map(async (file) => {
            try {
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === file.id ? { ...f, status: 'uploading' as const } : f,
                    ),
                );

                const uploadData = {
                    file: file.file,
                    category: file.metadata.category || 'other',
                    document_type: file.metadata.document_type,
                    tags: file.metadata.tags,
                    tldr: file.metadata.tldr,
                    is_public: file.metadata.is_public,
                    source: file.metadata.source,
                };

                await uploadLibraryFile(uploadData, (progress) => {
                    setFiles((prev) =>
                        prev.map((f) => (f.id === file.id ? { ...f, progress } : f)),
                    );
                });

                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === file.id
                            ? { ...f, status: 'completed' as const, progress: 100 }
                            : f,
                    ),
                );
            } catch (error) {
                console.error('Upload error:', error);
                const errorMessage = error instanceof Error ? error.message : 'Upload failed';

                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === file.id
                            ? { ...f, status: 'failed' as const, error: errorMessage }
                            : f,
                    ),
                );
            }
        });

        await Promise.all(uploadPromises);
        setIsUploading(false);

        const completedFiles = files.filter((f) => f.status !== 'failed').length;
        const failedFiles = files.filter((f) => f.status === 'failed').length;

        if (completedFiles > 0) {
            toast.success(`Successfully uploaded ${completedFiles} file(s)`);

            // Clear completed files after a delay
            setTimeout(() => {
                setFiles((prev) => prev.filter((f) => f.status === 'failed'));
            }, 2000);

            if (onUploadComplete) {
                onUploadComplete();
            }
        }

        if (failedFiles > 0) {
            toast.error(`Failed to upload ${failedFiles} file(s)`);
        }
    }, [files, uploadLibraryFile, onUploadComplete]);

    const pendingFiles = files.filter((f) => f.status === 'pending');
    const uploadingFiles = files.filter((f) => f.status === 'uploading');
    const completedFiles = files.filter((f) => f.status === 'completed');
    const failedFiles = files.filter((f) => f.status === 'failed');

    return (
        <div className="space-y-6">
            {/* Upload Area */}
            <Card>
                <CardContent className="p-6">
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                            isDragOver
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="space-y-4">
                            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Cloud className="h-6 w-6 text-gray-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium">
                                    Upload files to Knowledge Base
                                </h3>
                                <p className="text-gray-500 mt-1">
                                    Drag and drop files here, or click to browse
                                </p>
                                <p className="text-sm text-gray-400 mt-2">
                                    Supports PDF, DOC, DOCX, TXT, MD, and images up to {maxFileSize}
                                    MB
                                </p>
                            </div>
                            <Button onClick={handleFileInputClick} disabled={isUploading}>
                                <Upload className="h-4 w-4 mr-2" />
                                Browse Files
                            </Button>
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={acceptedTypes.join(',')}
                        onChange={handleFileInputChange}
                        className="hidden"
                    />
                </CardContent>
            </Card>

            {/* Global Metadata */}
            {files.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">File Metadata</CardTitle>
                        <p className="text-sm text-gray-500">
                            Set default metadata for all files. You can customize individual files
                            below.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={globalMetadata.category}
                                    onValueChange={(value) =>
                                        handleGlobalMetadataChange('category', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem key={category.uuid} value={category.uuid}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="source">Source</Label>
                                <Select
                                    value={globalMetadata.source}
                                    onValueChange={(value) =>
                                        handleGlobalMetadataChange('source', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sources.map((source) => (
                                            <SelectItem key={source.uuid} value={source.uuid}>
                                                {source.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="document_type">Document Type</Label>
                                <Select
                                    value={globalMetadata.document_type}
                                    onValueChange={(value) =>
                                        handleGlobalMetadataChange('document_type', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {documentTypes.map((type) => (
                                            <SelectItem key={type.uuid} value={type.uuid}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="tags">Tags</Label>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        placeholder="Add tags..."
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddTag(tagInput);
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleAddTag(tagInput)}
                                        disabled={!tagInput.trim()}
                                    >
                                        Add
                                    </Button>
                                </div>
                                {globalMetadata.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {globalMetadata.tags.map((tag, index) => (
                                            <Badge key={index} variant="secondary">
                                                <Tag className="h-3 w-3 mr-1" />
                                                {tag}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-4 w-4 p-0 ml-1"
                                                    onClick={() => handleRemoveTag(tag)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_public"
                                checked={globalMetadata.is_public}
                                onCheckedChange={(checked) =>
                                    handleGlobalMetadataChange('is_public', checked)
                                }
                            />
                            <Label htmlFor="is_public">Make files publicly accessible</Label>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* File List */}
            {files.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Files ({files.length})</CardTitle>
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleUpload}
                                    disabled={isUploading || pendingFiles.length === 0}
                                    className="min-w-[120px]"
                                >
                                    {isUploading ? (
                                        <>
                                            <Upload className="h-4 w-4 mr-2 animate-pulse" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload {pendingFiles.length} Files
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setFiles([])}
                                    disabled={isUploading}
                                >
                                    Clear All
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formatFileSize(file.size)}
                                                </p>
                                            </div>
                                        </div>

                                        {file.status === 'uploading' && (
                                            <div className="mt-2">
                                                <Progress value={file.progress} className="h-2" />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {file.progress}% uploaded
                                                </p>
                                            </div>
                                        )}

                                        {file.error && (
                                            <Alert variant="destructive" className="mt-2">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription className="text-xs">
                                                    {file.error}
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 ml-4">
                                        {file.status === 'completed' && (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        )}
                                        {file.status === 'failed' && (
                                            <AlertCircle className="h-5 w-5 text-red-500" />
                                        )}
                                        {file.status !== 'uploading' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveFile(file.id)}
                                                disabled={isUploading}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Upload Summary */}
                        {(uploadingFiles.length > 0 ||
                            completedFiles.length > 0 ||
                            failedFiles.length > 0) && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <div className="text-sm text-gray-600">
                                    Upload Progress: {completedFiles.length} completed,{' '}
                                    {uploadingFiles.length} uploading, {failedFiles.length} failed
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
