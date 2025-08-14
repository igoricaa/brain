import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { http, normalizeDrfErrors } from '@/lib/http';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Upload,
    X,
    Download,
    Trash2,
    Edit,
    MoreVertical,
    FileText,
    FileImage,
    File as FileIcon,
    AlertCircle,
    CheckCircle,
    Clock,
    RefreshCcw,
} from 'lucide-react';

// Types and Interfaces
interface DealFile {
    uuid: string;
    file_name: string;
    file?: string;
    src_url?: string;
    mime_type?: string;
    file_size?: number;
    processing_status: 'pending' | 'processing' | 'completed' | 'error';
    created_at: string;
    updated_at: string;
    categories?: string[];
    tags?: string[];
    description?: string;
}

interface DealDeck extends DealFile {
    title?: string;
    subtitle?: string;
    raw_text?: string;
}

interface DealPaper extends DealFile {
    title?: string;
    authors?: string;
    abstract?: string;
    citation_count?: number;
}

interface FileUploadProgress {
    fileId: string;
    fileName: string;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
    error?: string;
}

interface FileManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    dealUuid: string;
    dealName: string;
    lastAssessmentDate?: string;
}

// File type detection utility
const getFileIcon = (mimeType?: string, fileName?: string) => {
    if (!mimeType && !fileName) return <FileIcon className="h-4 w-4" />;

    const type = mimeType || '';
    const name = fileName || '';

    if (type.includes('image') || /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(name)) {
        return <FileImage className="h-4 w-4" />;
    }

    if (type.includes('pdf') || type.includes('text') || /\.(pdf|doc|docx|txt|md)$/i.test(name)) {
        return <FileText className="h-4 w-4" />;
    }

    return <FileIcon className="h-4 w-4" />;
};

// Status badge component
const StatusBadge = ({ status }: { status: DealFile['processing_status'] }) => {
    const statusConfig = {
        pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
        processing: { icon: RefreshCcw, color: 'bg-blue-100 text-blue-800', label: 'Processing' },
        completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Completed' },
        error: { icon: AlertCircle, color: 'bg-red-100 text-red-800', label: 'Error' },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <Badge variant="secondary" className={`${config.color} gap-1`}>
            <Icon className="h-3 w-3" />
            {config.label}
        </Badge>
    );
};

// New file indicator
const NewFileIndicator = ({
    fileDate,
    lastAssessmentDate,
}: {
    fileDate: string;
    lastAssessmentDate?: string;
}) => {
    if (!lastAssessmentDate) return null;

    const fileCreated = new Date(fileDate);
    const lastAssessment = new Date(lastAssessmentDate);

    if (fileCreated > lastAssessment) {
        return (
            <Badge variant="destructive" className="ml-2 text-xs">
                New
            </Badge>
        );
    }

    return null;
};

// Format file size
const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// Format date
const formatDate = (dateString: string): string => {
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateString;
    }
};

// File upload component
const FileUploader = ({
    dealUuid,
    onUploadSuccess,
    onUploadProgress,
}: {
    dealUuid: string;
    onUploadSuccess: () => void;
    onUploadProgress: (progress: FileUploadProgress[]) => void;
}) => {
    const [uploads, setUploads] = useState<FileUploadProgress[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const uploadMutation = useMutation({
        mutationFn: async (files: File[]) => {
            const promises = files.map(async (file) => {
                const fileId = crypto.randomUUID();
                const formData = new FormData();
                formData.append('file', file);
                formData.append('deal', dealUuid);

                // Initialize progress tracking
                setUploads((prev) => [
                    ...prev,
                    {
                        fileId,
                        fileName: file.name,
                        progress: 0,
                        status: 'uploading',
                    },
                ]);

                try {
                    const response = await http.post('/deals/files/', formData, {
                        headers: {
                            // Let the browser set the Content-Type with boundary for FormData
                            'Content-Type': undefined,
                        },
                    });

                    // Update success status
                    setUploads((prev) =>
                        prev.map((upload) =>
                            upload.fileId === fileId
                                ? { ...upload, progress: 100, status: 'completed' as const }
                                : upload,
                        ),
                    );

                    return response;
                } catch (error) {
                    // Update error status
                    setUploads((prev) =>
                        prev.map((upload) =>
                            upload.fileId === fileId
                                ? {
                                      ...upload,
                                      status: 'error' as const,
                                      error:
                                          error instanceof Error ? error.message : 'Upload failed',
                                  }
                                : upload,
                        ),
                    );
                    throw error;
                }
            });

            return Promise.allSettled(promises);
        },
        onSuccess: (results) => {
            const successful = results.filter((result) => result.status === 'fulfilled');
            if (successful.length > 0) {
                toast.success(`${successful.length} file(s) uploaded successfully`);
                onUploadSuccess();
            }

            const failed = results.filter((result) => result.status === 'rejected');
            if (failed.length > 0) {
                toast.error(`${failed.length} file(s) failed to upload`);
            }
        },
    });

    // Update parent with progress
    useEffect(() => {
        onUploadProgress(uploads);
    }, [uploads, onUploadProgress]);

    const handleFileSelect = useCallback(
        (files: FileList | null) => {
            if (!files || files.length === 0) return;

            const fileArray = Array.from(files);

            // Validate files
            const maxSize = 15 * 1024 * 1024; // 15MB
            const allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'text/markdown',
            ];

            const validFiles: File[] = [];
            const errors: string[] = [];

            fileArray.forEach((file) => {
                if (file.size > maxSize) {
                    errors.push(`${file.name}: File too large (max 15MB)`);
                    return;
                }

                if (!allowedTypes.includes(file.type)) {
                    errors.push(`${file.name}: File type not supported`);
                    return;
                }

                validFiles.push(file);
            });

            if (errors.length > 0) {
                toast.error(`Validation errors:\n${errors.join('\n')}`);
            }

            if (validFiles.length > 0) {
                uploadMutation.mutate(validFiles);
            }
        },
        [uploadMutation],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileSelect(e.dataTransfer.files);
        },
        [handleFileSelect],
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    return (
        <div className="space-y-4">
            <div
                className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploadMutation.isPending ? 'opacity-50 pointer-events-none' : ''}
        `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                role="button"
                tabIndex={0}
                aria-label="File upload area"
            >
                <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                <div className="space-y-2">
                    <p className="text-lg font-medium">Drop files here or click to select</p>
                    <p className="text-sm text-gray-500">
                        Supported: PDF, DOC, DOCX, TXT, MD (max 15MB each)
                    </p>
                    <Input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.txt,.md"
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload">
                        <Button variant="outline" className="cursor-pointer" asChild>
                            <span>Choose Files</span>
                        </Button>
                    </label>
                </div>
            </div>

            {uploads.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-medium">Upload Progress</h4>
                    {uploads.map((upload) => (
                        <div key={upload.fileId} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{upload.fileName}</span>
                                <StatusBadge status={upload.status as any} />
                            </div>
                            {upload.status === 'uploading' && (
                                <Progress value={upload.progress} className="h-2" />
                            )}
                            {upload.error && <p className="text-sm text-red-600">{upload.error}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// File actions menu
const FileActionsMenu = ({
    file,
    onDelete,
    onReprocess,
    onDownload,
}: {
    file: DealFile;
    onDelete: (fileId: string) => void;
    onReprocess: (fileId: string) => void;
    onDownload: (file: DealFile) => void;
}) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onDownload(file)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReprocess(file.uuid)}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Reprocess
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(file.uuid)} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

// File table component
const FileTable = ({
    files,
    title,
    lastAssessmentDate,
    onDelete,
    onReprocess,
    onDownload,
}: {
    files: DealFile[];
    title: string;
    lastAssessmentDate?: string;
    onDelete: (fileId: string) => void;
    onReprocess: (fileId: string) => void;
    onDownload: (file: DealFile) => void;
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredFiles = useMemo(() => {
        if (!searchTerm) return files;
        return files.filter((file) =>
            file.file_name.toLowerCase().includes(searchTerm.toLowerCase()),
        );
    }, [files, searchTerm]);

    if (files.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <FileIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No {title.toLowerCase()} found</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                    {title} ({files.length})
                </h3>
                <Input
                    placeholder={`Search ${title.toLowerCase()}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                />
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Upload Date</TableHead>
                            <TableHead className="w-[50px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredFiles.map((file) => (
                            <TableRow key={file.uuid}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {getFileIcon(file.mime_type, file.file_name)}
                                        <span className="font-medium">{file.file_name}</span>
                                        <NewFileIndicator
                                            fileDate={file.created_at}
                                            lastAssessmentDate={lastAssessmentDate}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell>{formatFileSize(file.file_size)}</TableCell>
                                <TableCell>
                                    <StatusBadge status={file.processing_status} />
                                </TableCell>
                                <TableCell>{formatDate(file.created_at)}</TableCell>
                                <TableCell>
                                    <FileActionsMenu
                                        file={file}
                                        onDelete={onDelete}
                                        onReprocess={onReprocess}
                                        onDownload={onDownload}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

// Main FileManagementModal component
export const FileManagementModal: React.FC<FileManagementModalProps> = ({
    isOpen,
    onClose,
    dealUuid,
    dealName,
    lastAssessmentDate,
}) => {
    const [activeTab, setActiveTab] = useState<'decks' | 'papers' | 'files'>('decks');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);

    const queryClient = useQueryClient();

    // Fetch files data
    const { data: decks = [], isLoading: decksLoading } = useQuery({
        queryKey: ['deal-decks', dealUuid],
        queryFn: async () => {
            const response = await http.get(`/deals/decks/?deal=${dealUuid}`);
            const data = response.data;
            return Array.isArray(data) ? data : data.results || [];
        },
        enabled: isOpen,
    });

    const { data: papers = [], isLoading: papersLoading } = useQuery({
        queryKey: ['deal-papers', dealUuid],
        queryFn: async () => {
            const response = await http.get(`/deals/papers/?deal=${dealUuid}`);
            const data = response.data;
            return Array.isArray(data) ? data : data.results || [];
        },
        enabled: isOpen,
    });

    const { data: files = [], isLoading: filesLoading } = useQuery({
        queryKey: ['deal-files', dealUuid],
        queryFn: async () => {
            const response = await http.get(`/deals/files/?deal=${dealUuid}`);
            const data = response.data;
            return Array.isArray(data) ? data : data.results || [];
        },
        enabled: isOpen,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async ({ fileId, type }: { fileId: string; type: string }) => {
            await http.delete(`/deals/${type}/${fileId}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deal-decks', dealUuid] });
            queryClient.invalidateQueries({ queryKey: ['deal-papers', dealUuid] });
            queryClient.invalidateQueries({ queryKey: ['deal-files', dealUuid] });
            toast.success('File deleted successfully');
        },
        onError: (error) => {
            const { formError } = normalizeDrfErrors(error);
            toast.error(formError || 'Failed to delete file');
        },
    });

    // Reprocess mutation
    const reprocessMutation = useMutation({
        mutationFn: async ({ fileId, type }: { fileId: string; type: string }) => {
            await http.post(`/deals/${type}/${fileId}/reprocess/`);
        },
        onSuccess: () => {
            toast.success('File reprocessing started');
        },
        onError: (error) => {
            const { formError } = normalizeDrfErrors(error);
            toast.error(formError || 'Failed to start reprocessing');
        },
    });

    const handleDelete = useCallback(
        (fileId: string) => {
            const fileType =
                activeTab === 'decks' ? 'decks' : activeTab === 'papers' ? 'papers' : 'files';
            deleteMutation.mutate({ fileId, type: fileType });
            setDeleteConfirm(null);
        },
        [deleteMutation, activeTab],
    );

    const handleReprocess = useCallback(
        (fileId: string) => {
            const fileType =
                activeTab === 'decks' ? 'decks' : activeTab === 'papers' ? 'papers' : 'files';
            reprocessMutation.mutate({ fileId, type: fileType });
        },
        [reprocessMutation, activeTab],
    );

    const handleDownload = useCallback((file: DealFile) => {
        const url = file.file || file.src_url;
        if (url) {
            window.open(url, '_blank');
        } else {
            toast.error('File URL not available');
        }
    }, []);

    const handleUploadSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['deal-decks', dealUuid] });
        queryClient.invalidateQueries({ queryKey: ['deal-papers', dealUuid] });
        queryClient.invalidateQueries({ queryKey: ['deal-files', dealUuid] });
    }, [queryClient, dealUuid]);

    const isLoading = decksLoading || papersLoading || filesLoading;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Manage Files - {dealName}</DialogTitle>
                        <DialogDescription>
                            Upload, organize, and manage files for this deal. Files marked "New"
                            were added since the last assessment.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden">
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab as any}
                            className="h-full flex flex-col"
                        >
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="decks">Decks ({decks.length})</TabsTrigger>
                                <TabsTrigger value="papers">Papers ({papers.length})</TabsTrigger>
                                <TabsTrigger value="files">
                                    Other Files ({files.length})
                                </TabsTrigger>
                                <TabsTrigger value="upload">Upload New</TabsTrigger>
                            </TabsList>

                            <div className="flex-1 overflow-y-auto mt-4">
                                <TabsContent value="decks" className="space-y-4 mt-0">
                                    {isLoading ? (
                                        <div className="text-center py-8">Loading decks...</div>
                                    ) : (
                                        <FileTable
                                            files={decks}
                                            title="Pitch Decks"
                                            lastAssessmentDate={lastAssessmentDate}
                                            onDelete={setDeleteConfirm}
                                            onReprocess={handleReprocess}
                                            onDownload={handleDownload}
                                        />
                                    )}
                                </TabsContent>

                                <TabsContent value="papers" className="space-y-4 mt-0">
                                    {isLoading ? (
                                        <div className="text-center py-8">Loading papers...</div>
                                    ) : (
                                        <FileTable
                                            files={papers}
                                            title="Research Papers"
                                            lastAssessmentDate={lastAssessmentDate}
                                            onDelete={setDeleteConfirm}
                                            onReprocess={handleReprocess}
                                            onDownload={handleDownload}
                                        />
                                    )}
                                </TabsContent>

                                <TabsContent value="files" className="space-y-4 mt-0">
                                    {isLoading ? (
                                        <div className="text-center py-8">Loading files...</div>
                                    ) : (
                                        <FileTable
                                            files={files}
                                            title="Other Files"
                                            lastAssessmentDate={lastAssessmentDate}
                                            onDelete={setDeleteConfirm}
                                            onReprocess={handleReprocess}
                                            onDownload={handleDownload}
                                        />
                                    )}
                                </TabsContent>

                                <TabsContent value="upload" className="mt-0">
                                    <FileUploader
                                        dealUuid={dealUuid}
                                        onUploadSuccess={handleUploadSuccess}
                                        onUploadProgress={setUploadProgress}
                                    />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation dialog */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this file? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
