import { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    FileText,
    Download,
    Edit,
    Trash2,
    MoreHorizontal,
    RefreshCw,
    Eye,
    Tag,
    ExternalLink,
    AlertCircle,
    CheckCircle,
    Clock,
    XCircle,
} from 'lucide-react';
import { LibraryFile } from '@/hooks/useFileManagement';
import { cn } from '@/lib/utils';

interface LibraryFileTableProps {
    files: LibraryFile[];
    selectedFiles: string[];
    onSelectionChange: (fileIds: string[]) => void;
    onFileUpdate: (fileId: string, data: any) => Promise<void>;
    onFileDelete: (fileId: string) => Promise<void>;
    onFileDownload: (fileId: string) => Promise<void>;
    onFileReprocess: (fileId: string) => Promise<void>;
    onFileView: (file: LibraryFile) => void;
    isLoading?: boolean;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (column: string) => void;
}

const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('text')) return '📃';
    return '📁';
};

const getProcessingStatusIcon = (status: string) => {
    switch (status) {
        case 'completed':
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'processing':
            return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
        case 'failed':
            return <XCircle className="h-4 w-4 text-red-500" />;
        case 'pending':
        default:
            return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
};

const getProcessingStatusBadge = (status: string) => {
    const variants = {
        completed: 'default' as const,
        processing: 'secondary' as const,
        failed: 'destructive' as const,
        pending: 'outline' as const,
    };

    return (
        <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
            <div className="flex items-center gap-1">
                {getProcessingStatusIcon(status)}
                {status}
            </div>
        </Badge>
    );
};

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

export default function LibraryFileTable({
    files,
    selectedFiles,
    onSelectionChange,
    onFileUpdate,
    onFileDelete,
    onFileDownload,
    onFileReprocess,
    onFileView,
    isLoading = false,
    sortBy,
    sortDirection = 'desc',
    onSort,
}: LibraryFileTableProps) {
    const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
    const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());

    // Handle individual file selection
    const handleFileSelect = useCallback(
        (fileId: string, selected: boolean) => {
            if (selected) {
                onSelectionChange([...selectedFiles, fileId]);
            } else {
                onSelectionChange(selectedFiles.filter((id) => id !== fileId));
            }
        },
        [selectedFiles, onSelectionChange],
    );

    // Handle select all
    const handleSelectAll = useCallback(
        (selected: boolean) => {
            if (selected) {
                onSelectionChange(files.map((file) => file.uuid));
            } else {
                onSelectionChange([]);
            }
        },
        [files, onSelectionChange],
    );

    // Handle file actions
    const handleFileAction = useCallback(
        async (action: string, fileId: string) => {
            try {
                switch (action) {
                    case 'download':
                        await onFileDownload(fileId);
                        break;
                    case 'delete':
                        setDeletingFiles((prev) => new Set(prev).add(fileId));
                        await onFileDelete(fileId);
                        setDeletingFiles((prev) => {
                            const next = new Set(prev);
                            next.delete(fileId);
                            return next;
                        });
                        break;
                    case 'reprocess':
                        setProcessingFiles((prev) => new Set(prev).add(fileId));
                        await onFileReprocess(fileId);
                        setProcessingFiles((prev) => {
                            const next = new Set(prev);
                            next.delete(fileId);
                            return next;
                        });
                        break;
                }
            } catch (error) {
                setDeletingFiles((prev) => {
                    const next = new Set(prev);
                    next.delete(fileId);
                    return next;
                });
                setProcessingFiles((prev) => {
                    const next = new Set(prev);
                    next.delete(fileId);
                    return next;
                });
            }
        },
        [onFileDownload, onFileDelete, onFileReprocess],
    );

    // Handle column sorting
    const handleSort = useCallback(
        (column: string) => {
            if (onSort) {
                onSort(column);
            }
        },
        [onSort],
    );

    // Check if all files are selected
    const allSelected = files.length > 0 && selectedFiles.length === files.length;
    const partiallySelected = selectedFiles.length > 0 && selectedFiles.length < files.length;

    const sortableHeaders = [
        { key: 'file_name', label: 'Name' },
        { key: 'created_at', label: 'Created' },
        { key: 'updated_at', label: 'Modified' },
    ];

    const getSortIcon = (column: string) => {
        if (sortBy !== column) return null;
        return sortDirection === 'asc' ? '↑' : '↓';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500">Loading files...</p>
                </div>
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                    <p className="text-gray-500">
                        Try adjusting your search criteria or upload some files to get started.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={handleSelectAll}
                                ref={(el) => {
                                    if (el) el.indeterminate = partiallySelected;
                                }}
                            />
                        </TableHead>
                        <TableHead className="w-12">Type</TableHead>
                        {sortableHeaders.map((header) => (
                            <TableHead
                                key={header.key}
                                className={cn(
                                    onSort && 'cursor-pointer hover:bg-gray-50',
                                    header.key === 'file_name' && 'min-w-[200px]',
                                )}
                                onClick={() => handleSort(header.key)}
                            >
                                <div className="flex items-center gap-1">
                                    {header.label}
                                    {getSortIcon(header.key)}
                                </div>
                            </TableHead>
                        ))}
                        <TableHead>Size</TableHead>
                        <TableHead>Categories</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {files.map((file) => (
                        <TableRow
                            key={file.uuid}
                            className={cn(
                                selectedFiles.includes(file.uuid) && 'bg-blue-50',
                                'hover:bg-gray-50',
                            )}
                        >
                            <TableCell>
                                <Checkbox
                                    checked={selectedFiles.includes(file.uuid)}
                                    onCheckedChange={(checked) =>
                                        handleFileSelect(file.uuid, checked as boolean)
                                    }
                                />
                            </TableCell>
                            <TableCell>
                                <span className="text-xl">{getFileIcon(file.mime_type || '')}</span>
                            </TableCell>
                            <TableCell>
                                <div className="space-y-1">
                                    <div className="font-medium text-gray-900 line-clamp-2">
                                        {file.file_name || 'Untitled'}
                                    </div>
                                    {file.tags && file.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {file.tags.slice(0, 3).map((tag, index) => (
                                                <Badge
                                                    key={index}
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    <Tag className="h-2 w-2 mr-1" />
                                                    {tag}
                                                </Badge>
                                            ))}
                                            {file.tags.length > 3 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{file.tags.length - 3}
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                                {formatDistanceToNow(new Date(file.created_at), {
                                    addSuffix: true,
                                })}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                                {formatDistanceToNow(new Date(file.updated_at), {
                                    addSuffix: true,
                                })}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                                {file.file_size ? formatFileSize(file.file_size) : 'Unknown'}
                            </TableCell>
                            <TableCell>
                                {file.categories && file.categories.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {file.categories.slice(0, 2).map((category) => (
                                            <Badge
                                                key={category.uuid}
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {category.name}
                                            </Badge>
                                        ))}
                                        {file.categories.length > 2 && (
                                            <Badge variant="secondary" className="text-xs">
                                                +{file.categories.length - 2}
                                            </Badge>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-gray-400 text-sm">Uncategorized</span>
                                )}
                            </TableCell>
                            <TableCell>
                                {file.source ? (
                                    <Badge variant="outline" className="text-xs">
                                        {file.source}
                                    </Badge>
                                ) : (
                                    <span className="text-gray-400 text-sm">No source</span>
                                )}
                            </TableCell>
                            <TableCell>
                                {getProcessingStatusBadge(file.processing_status || 'pending')}
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            disabled={
                                                deletingFiles.has(file.uuid) ||
                                                processingFiles.has(file.uuid)
                                            }
                                        >
                                            {deletingFiles.has(file.uuid) ||
                                            processingFiles.has(file.uuid) ? (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <MoreHorizontal className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onFileView(file)}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => handleFileAction('download', file.uuid)}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download
                                        </DropdownMenuItem>
                                        {file.src_url && (
                                            <DropdownMenuItem asChild>
                                                <a
                                                    href={file.src_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center"
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    Open Source
                                                </a>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => handleFileAction('reprocess', file.uuid)}
                                        >
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Reprocess
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                /* TODO: Open edit modal */
                                            }}
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit Metadata
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => handleFileAction('delete', file.uuid)}
                                            className="text-red-600 focus:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
