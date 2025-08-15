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
import {
    RotateCcw,
    AlertTriangle,
    FileText,
    CheckCircle,
} from 'lucide-react';
import type { FileTableData } from './FileTable';

interface BulkReprocessConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedFiles: FileTableData[];
    onConfirm: () => Promise<void>;
    isProcessing?: boolean;
}

export default function BulkReprocessConfirmDialog({
    open,
    onOpenChange,
    selectedFiles,
    onConfirm,
    isProcessing = false,
}: BulkReprocessConfirmDialogProps) {
    const completedFiles = selectedFiles.filter(f => f.processing_status === 'completed');
    const failedCancelledFiles = selectedFiles.filter(f => 
        ['failed', 'cancelled'].includes(f.processing_status)
    );
    const otherFiles = selectedFiles.filter(f => 
        !['completed', 'failed', 'cancelled'].includes(f.processing_status)
    );

    const handleConfirm = async () => {
        try {
            await onConfirm();
            onOpenChange(false);
        } catch (error) {
            console.error('Error in bulk reprocess:', error);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
                        <RotateCcw className="h-5 w-5" />
                        Bulk Reprocess Files
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-4">
                            <p>
                                You are about to reprocess <strong>{selectedFiles.length}</strong> file
                                {selectedFiles.length === 1 ? '' : 's'}. Please review the impact below:
                            </p>

                            {/* File breakdown */}
                            <div className="bg-muted rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-4 w-4" />
                                    <span className="font-medium text-sm">File Breakdown</span>
                                </div>
                                
                                {failedCancelledFiles.length > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Failed/Cancelled files (retry):</span>
                                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                            {failedCancelledFiles.length}
                                        </Badge>
                                    </div>
                                )}

                                {completedFiles.length > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Completed files (reprocess):</span>
                                        <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                            {completedFiles.length}
                                        </Badge>
                                    </div>
                                )}

                                {otherFiles.length > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Other files:</span>
                                        <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                            {otherFiles.length}
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            {/* Warning for completed files */}
                            {completedFiles.length > 0 && (
                                <div className="bg-orange-50 shadow-sm rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-orange-800">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="font-medium">Data Loss Warning</span>
                                    </div>
                                    <p className="text-sm text-orange-700 mt-1">
                                        <strong>{completedFiles.length}</strong> completed file
                                        {completedFiles.length === 1 ? '' : 's'} will lose all extracted data,
                                        analysis results, and AI-generated content. This action cannot be undone.
                                    </p>
                                    
                                    {completedFiles.length <= 3 && (
                                        <ul className="text-xs text-orange-600 mt-2 space-y-1">
                                            {completedFiles.map((file, index) => (
                                                <li key={index} className="flex items-center gap-1">
                                                    <CheckCircle className="h-3 w-3" />
                                                    {file.name}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* Info for failed/cancelled files */}
                            {failedCancelledFiles.length > 0 && (
                                <div className="bg-blue-50 shadow-sm rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-blue-800">
                                        <RotateCcw className="h-4 w-4" />
                                        <span className="font-medium">Retry Processing</span>
                                    </div>
                                    <p className="text-sm text-blue-700 mt-1">
                                        <strong>{failedCancelledFiles.length}</strong> file
                                        {failedCancelledFiles.length === 1 ? '' : 's'} will be retried.
                                        Previous processing attempts failed or were cancelled.
                                    </p>
                                </div>
                            )}

                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-sm text-gray-600">
                                    <strong>Note:</strong> Processing time varies based on file size and complexity.
                                    You can monitor progress in the file status column.
                                </p>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className={
                            completedFiles.length > 0
                                ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-600'
                                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-600'
                        }
                    >
                        {isProcessing ? (
                            <>
                                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                {completedFiles.length > 0 ? 'Reprocess All Files' : 'Retry All Files'}
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}