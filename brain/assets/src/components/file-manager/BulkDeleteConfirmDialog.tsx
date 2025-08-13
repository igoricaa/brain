import React from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, FileText, Trash2 } from 'lucide-react';
import type { FileTableData } from './FileTable';

export interface BulkDeleteConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedFiles: FileTableData[];
    mode: 'deal' | 'library';
    onConfirm: () => Promise<void>;
    isDeleting?: boolean;
}

export default function BulkDeleteConfirmDialog({
    open,
    onOpenChange,
    selectedFiles,
    mode,
    onConfirm,
    isDeleting = false,
}: BulkDeleteConfirmDialogProps) {
    const handleConfirm = async () => {
        try {
            await onConfirm();
            onOpenChange(false);
        } catch (error) {
            console.error('Error deleting files:', error);
            // Error is handled by the parent component
        }
    };

    // Group files by processing status for better visibility
    const filesByStatus = React.useMemo(() => {
        const groups: Record<string, FileTableData[]> = {};
        selectedFiles.forEach((file) => {
            const status = file.processing_status;
            if (!groups[status]) {
                groups[status] = [];
            }
            groups[status].push(file);
        });
        return groups;
    }, [selectedFiles]);

    const hasProcessingFiles = selectedFiles.some(
        (file) => file.processing_status === 'processing' || file.processing_status === 'pending',
    );

    const hasCompletedFiles = selectedFiles.some((file) => file.processing_status === 'completed');

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Delete {selectedFiles.length} File{selectedFiles.length === 1 ? '' : 's'}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p>
                                Are you sure you want to delete these {selectedFiles.length} file
                                {selectedFiles.length === 1 ? '' : 's'}? This action cannot be
                                undone.
                            </p>

                            {mode === 'deal' && (
                                <p className="text-sm">
                                    <strong>Note:</strong> These files will be permanently removed
                                    from this deal.
                                </p>
                            )}

                            {mode === 'library' && (
                                <p className="text-sm">
                                    <strong>Note:</strong> These files will be permanently removed
                                    from the knowledge base.
                                </p>
                            )}

                            {hasProcessingFiles && (
                                <div className="bg-yellow-50 shadow-sm rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-yellow-800">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="font-medium">Warning</span>
                                    </div>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Some files are currently being processed. Deleting them will
                                        stop the processing.
                                    </p>
                                </div>
                            )}

                            {hasCompletedFiles && (
                                <div className="bg-red-50 shadow-sm rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-red-800">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="font-medium">Data Loss Warning</span>
                                    </div>
                                    <p className="text-sm text-red-700 mt-1">
                                        Some files have been successfully processed. All extracted
                                        data and analysis will be permanently lost.
                                    </p>
                                </div>
                            )}
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-4">
                        {/* Files grouped by status */}
                        {Object.entries(filesByStatus).map(([status, files]) => (
                            <div key={status} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant={
                                            status === 'completed'
                                                ? 'default'
                                                : status === 'processing'
                                                  ? 'default'
                                                  : status === 'failed'
                                                    ? 'destructive'
                                                    : 'secondary'
                                        }
                                        className={
                                            status === 'completed'
                                                ? 'bg-green-100 text-green-800'
                                                : undefined
                                        }
                                    >
                                        {status === 'pending'
                                            ? 'Pending'
                                            : status === 'processing'
                                              ? 'Processing'
                                              : status === 'completed'
                                                ? 'Completed'
                                                : status === 'failed'
                                                  ? 'Failed'
                                                  : status === 'cancelled'
                                                    ? 'Cancelled'
                                                    : status}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        {files.length} file{files.length === 1 ? '' : 's'}
                                    </span>
                                </div>

                                <div className="bg-muted rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                                    {files.slice(0, 10).map((file) => (
                                        <div
                                            key={file.uuid}
                                            className="flex items-center gap-2 text-sm"
                                        >
                                            <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                            <span className="truncate" title={file.name}>
                                                {file.name}
                                            </span>
                                            {file.category && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs capitalize ml-auto flex-shrink-0"
                                                >
                                                    {file.category.replace('_', ' ')}
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                    {files.length > 10 && (
                                        <div className="text-xs text-muted-foreground text-center pt-2 shadow-sm">
                                            + {files.length - 10} more files
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Summary */}
                        <div className="bg-red-50 shadow-sm rounded-lg p-3">
                            <h4 className="font-medium text-red-800 mb-2">Deletion Summary</h4>
                            <ul className="text-sm text-red-700 space-y-1">
                                <li>
                                    • {selectedFiles.length} file
                                    {selectedFiles.length === 1 ? '' : 's'} will be permanently
                                    deleted
                                </li>
                                {hasCompletedFiles && (
                                    <li>
                                        • All processed data and extracted information will be lost
                                    </li>
                                )}
                                {hasProcessingFiles && (
                                    <li>• Any ongoing processing will be stopped</li>
                                )}
                                <li>• This action cannot be undone</li>
                            </ul>
                        </div>
                    </div>
                </ScrollArea>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    >
                        {isDeleting ? (
                            <>
                                <Trash2 className="h-4 w-4 mr-2 animate-pulse" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete {selectedFiles.length} File
                                {selectedFiles.length === 1 ? '' : 's'}
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
