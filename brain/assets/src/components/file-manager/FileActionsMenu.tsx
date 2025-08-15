import React, { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    MoreHorizontal,
    Download,
    Edit,
    Trash2,
    RotateCcw,
    Copy,
    Eye,
    ExternalLink,
    AlertTriangle,
    FileText,
    Tag,
    Settings,
} from 'lucide-react';
import type { FileTableData } from './FileTable';

export interface FileActionsMenuProps {
    file: FileTableData;
    mode: 'deal' | 'library';
    onAction: (action: FileAction, fileId: string) => Promise<void>;
    disabled?: boolean;
}

export type FileAction = 'download' | 'view' | 'edit' | 'copy' | 'reprocess' | 'delete';

export type ReprocessType = 'retry' | 'reprocess';

export default function FileActionsMenu({
    file,
    mode,
    onAction,
    disabled = false,
}: FileActionsMenuProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [reprocessDialogOpen, setReprocessDialogOpen] = useState(false);
    const [isPerformingAction, setIsPerformingAction] = useState(false);

    const handleAction = async (action: FileAction) => {
        if (action === 'delete') {
            setDeleteDialogOpen(true);
            return;
        }

        if (action === 'reprocess' && file.processing_status === 'completed') {
            setReprocessDialogOpen(true);
            return;
        }

        setIsPerformingAction(true);
        try {
            await onAction(action, file.uuid);
        } catch (error) {
            console.error(`Error performing action ${action}:`, error);
        } finally {
            setIsPerformingAction(false);
        }
    };

    const handleDeleteConfirm = async () => {
        setIsPerformingAction(true);
        try {
            await onAction('delete', file.uuid);
            setDeleteDialogOpen(false);
        } catch (error) {
            console.error('Error deleting file:', error);
        } finally {
            setIsPerformingAction(false);
        }
    };

    const handleReprocessConfirm = async () => {
        setIsPerformingAction(true);
        try {
            await onAction('reprocess', file.uuid);
            setReprocessDialogOpen(false);
        } catch (error) {
            console.error('Error reprocessing file:', error);
        } finally {
            setIsPerformingAction(false);
        }
    };

    const canDownload = file.download_url || file.processing_status === 'completed';
    const canView = file.processing_status === 'completed';
    const canReprocess = ['failed', 'cancelled', 'completed'].includes(file.processing_status);
    const isProcessing = ['pending', 'processing'].includes(file.processing_status);
    const reprocessType: ReprocessType = ['failed', 'cancelled'].includes(file.processing_status) ? 'retry' : 'reprocess';
    const reprocessText = reprocessType === 'retry' ? 'Retry Processing' : 'Reprocess File';

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={disabled || isPerformingAction}
                    >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    {/* View/Download Actions */}
                    {canView && (
                        <DropdownMenuItem
                            onClick={() => handleAction('view')}
                            disabled={isPerformingAction}
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            View file
                        </DropdownMenuItem>
                    )}

                    {canDownload && (
                        <DropdownMenuItem
                            onClick={() => handleAction('download')}
                            disabled={isPerformingAction}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </DropdownMenuItem>
                    )}

                    {file.download_url && (
                        <DropdownMenuItem
                            onClick={() => window.open(file.download_url, '_blank')}
                            disabled={isPerformingAction}
                        >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open in new tab
                        </DropdownMenuItem>
                    )}

                    {(canView || canDownload) && <DropdownMenuSeparator />}

                    {/* Edit Actions */}
                    <DropdownMenuItem
                        onClick={() => handleAction('edit')}
                        disabled={isPerformingAction}
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit metadata
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => handleAction('copy')}
                        disabled={isPerformingAction}
                    >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy file ID
                    </DropdownMenuItem>

                    {/* Processing Actions */}
                    {(canReprocess || isProcessing) && <DropdownMenuSeparator />}

                    {canReprocess && (
                        <DropdownMenuItem
                            onClick={() => handleAction('reprocess')}
                            disabled={isPerformingAction}
                            className={reprocessType === 'reprocess' ? 'text-orange-600' : ''}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            {reprocessText}
                        </DropdownMenuItem>
                    )}

                    {isProcessing && (
                        <DropdownMenuItem disabled className="text-muted-foreground">
                            <Settings className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </DropdownMenuItem>
                    )}

                    {/* File Info Submenu */}
                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <FileText className="mr-2 h-4 w-4" />
                            File details
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-64">
                            <div className="px-2 py-1.5 text-sm font-medium">File Information</div>
                            <DropdownMenuSeparator />

                            <div className="px-2 py-1.5 space-y-2 text-xs">
                                <div>
                                    <span className="font-medium">Name:</span>
                                    <div className="text-muted-foreground break-all">
                                        {file.name}
                                    </div>
                                </div>

                                <div>
                                    <span className="font-medium">Type:</span>
                                    <div className="text-muted-foreground">{file.file_type}</div>
                                </div>

                                <div>
                                    <span className="font-medium">Size:</span>
                                    <div className="text-muted-foreground">
                                        {(file.file_size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                </div>

                                {file.category && (
                                    <div>
                                        <span className="font-medium">Category:</span>
                                        <div className="mt-1">
                                            <Badge variant="outline" className="text-xs capitalize">
                                                {file.category.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </div>
                                )}

                                {file.domain && (
                                    <div>
                                        <span className="font-medium">Domain:</span>
                                        <div className="mt-1">
                                            <Badge variant="secondary" className="text-xs">
                                                {file.domain === 'ai_ml' ? 'AI/ML' : 
                                                 file.domain === 'life_sciences' ? 'Life Sciences' : 
                                                 file.domain === 'dual_use' ? 'Dual Use' : 
                                                 file.domain === 'sustainability' ? 'Sustainability' : 
                                                 file.domain}
                                            </Badge>
                                        </div>
                                    </div>
                                )}

                                {file.document_type && (
                                    <div>
                                        <span className="font-medium">Document Type:</span>
                                        <div className="text-muted-foreground">
                                            {file.document_type}
                                        </div>
                                    </div>
                                )}

                                {file.tags && file.tags.length > 0 && (
                                    <div>
                                        <span className="font-medium">Tags:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {file.tags.slice(0, 3).map((tag, index) => (
                                                <Badge
                                                    key={index}
                                                    variant="secondary"
                                                    className="text-xs"
                                                >
                                                    {tag}
                                                </Badge>
                                            ))}
                                            {file.tags.length > 3 && (
                                                <Badge variant="secondary" className="text-xs">
                                                    +{file.tags.length - 3}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {file.proprietary && (
                                    <div>
                                        <Badge
                                            variant="outline"
                                            className="text-xs text-orange-600 shadow-sm"
                                        >
                                            Proprietary
                                        </Badge>
                                    </div>
                                )}

                                <div>
                                    <span className="font-medium">Status:</span>
                                    <div className="mt-1">
                                        <Badge
                                            variant={
                                                file.processing_status === 'completed'
                                                    ? 'default'
                                                    : file.processing_status === 'processing'
                                                      ? 'default'
                                                      : file.processing_status === 'failed'
                                                        ? 'destructive'
                                                        : 'secondary'
                                            }
                                            className={
                                                file.processing_status === 'completed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : undefined
                                            }
                                        >
                                            {file.processing_status.charAt(0).toUpperCase() +
                                                file.processing_status.slice(1)}
                                        </Badge>
                                    </div>
                                </div>

                                <div>
                                    <span className="font-medium">Added:</span>
                                    <div className="text-muted-foreground">
                                        {new Date(file.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                {file.published_at && (
                                    <div>
                                        <span className="font-medium">Published:</span>
                                        <div className="text-muted-foreground">
                                            {new Date(file.published_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                )}

                                {file.tldr && (
                                    <div>
                                        <span className="font-medium">Summary:</span>
                                        <div className="text-muted-foreground text-xs mt-1 max-h-20 overflow-y-auto">
                                            {file.tldr}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {/* Delete Action */}
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                        onClick={() => handleAction('delete')}
                        disabled={isPerformingAction}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete file
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Delete File
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>
                                    Are you sure you want to delete <strong>{file.name}</strong>?
                                    This action cannot be undone.
                                </p>

                                <div className="bg-muted rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-4 w-4" />
                                        <span className="font-medium text-sm">File Details</span>
                                    </div>
                                    <div className="space-y-1 text-sm text-muted-foreground">
                                        <div>Type: {file.file_type}</div>
                                        <div>
                                            Size: {(file.file_size / 1024 / 1024).toFixed(2)} MB
                                        </div>
                                        <div className="flex items-center gap-2">
                                            Status:
                                            <Badge
                                                variant={
                                                    file.processing_status === 'completed'
                                                        ? 'default'
                                                        : file.processing_status === 'processing'
                                                          ? 'default'
                                                          : file.processing_status === 'failed'
                                                            ? 'destructive'
                                                            : 'secondary'
                                                }
                                                className={
                                                    file.processing_status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : undefined
                                                }
                                            >
                                                {file.processing_status.charAt(0).toUpperCase() +
                                                    file.processing_status.slice(1)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {file.processing_status === 'completed' && (
                                    <div className="bg-red-50 shadow-sm rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-red-800">
                                            <AlertTriangle className="h-4 w-4" />
                                            <span className="font-medium">Data Loss Warning</span>
                                        </div>
                                        <p className="text-sm text-red-700 mt-1">
                                            This file has been processed. All extracted data and
                                            analysis will be permanently lost.
                                        </p>
                                    </div>
                                )}

                                {file.processing_status === 'processing' && (
                                    <div className="bg-yellow-50 shadow-sm rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-yellow-800">
                                            <AlertTriangle className="h-4 w-4" />
                                            <span className="font-medium">Processing Warning</span>
                                        </div>
                                        <p className="text-sm text-yellow-700 mt-1">
                                            This file is currently being processed. Deleting it will
                                            stop the processing.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPerformingAction}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isPerformingAction}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isPerformingAction ? (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2 animate-pulse" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete File
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reprocess Confirmation Dialog */}
            <AlertDialog open={reprocessDialogOpen} onOpenChange={setReprocessDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
                            <RotateCcw className="h-5 w-5" />
                            Reprocess File
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>
                                    Are you sure you want to reprocess <strong>{file.name}</strong>?
                                </p>

                                <div className="bg-muted rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-4 w-4" />
                                        <span className="font-medium text-sm">File Details</span>
                                    </div>
                                    <div className="space-y-1 text-sm text-muted-foreground">
                                        <div>Type: {file.file_type}</div>
                                        <div>
                                            Size: {(file.file_size / 1024 / 1024).toFixed(2)} MB
                                        </div>
                                        <div className="flex items-center gap-2">
                                            Status:
                                            <Badge
                                                variant={
                                                    file.processing_status === 'completed'
                                                        ? 'default'
                                                        : file.processing_status === 'processing'
                                                          ? 'default'
                                                          : file.processing_status === 'failed'
                                                            ? 'destructive'
                                                            : 'secondary'
                                                }
                                                className={
                                                    file.processing_status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : undefined
                                                }
                                            >
                                                {file.processing_status.charAt(0).toUpperCase() +
                                                    file.processing_status.slice(1)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {file.processing_status === 'completed' && (
                                    <div className="bg-orange-50 shadow-sm rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-orange-800">
                                            <AlertTriangle className="h-4 w-4" />
                                            <span className="font-medium">Data Loss Warning</span>
                                        </div>
                                        <p className="text-sm text-orange-700 mt-1">
                                            This file has been successfully processed. Reprocessing will
                                            permanently delete all existing extracted data, analysis results,
                                            and AI-generated content. This action cannot be undone.
                                        </p>
                                    </div>
                                )}

                                {(['failed', 'cancelled'].includes(file.processing_status)) && (
                                    <div className="bg-blue-50 shadow-sm rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-blue-800">
                                            <RotateCcw className="h-4 w-4" />
                                            <span className="font-medium">Retry Processing</span>
                                        </div>
                                        <p className="text-sm text-blue-700 mt-1">
                                            This will retry processing the file. Previous attempts have failed
                                            or were cancelled.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPerformingAction}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReprocessConfirm}
                            disabled={isPerformingAction}
                            className={
                                file.processing_status === 'completed'
                                    ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-600'
                                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-600'
                            }
                        >
                            {isPerformingAction ? (
                                <>
                                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    {reprocessText}
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
