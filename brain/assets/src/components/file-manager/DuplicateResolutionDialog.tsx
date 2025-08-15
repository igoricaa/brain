import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    FileText,
    Image,
    FileSpreadsheet,
    Presentation,
    File,
    AlertTriangle,
    Copy,
    Replace,
    X,
    Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UploadFile } from './FileUpload';

// Extend UploadFile to include more metadata for existing files
export interface ExistingFileInfo {
    id: string;
    name: string;
    size: number;
    type: string;
    uploadDate: string;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    // Optional metadata from FileTableData
    category?: string;
    domain?: 'ai_ml' | 'life_sciences' | 'dual_use' | 'sustainability';
    processing_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
}

export type DuplicateResolution = 'replace' | 'keep-both' | 'cancel';

// Export for potential reuse in other components
export type { ExistingFileInfo, DuplicateResolutionDialogProps };

export interface DuplicateResolutionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    newFile: UploadFile;
    existingFile: ExistingFileInfo;
    onReplace: () => void;
    onKeepBoth: (newName: string) => void;
    onCancel: () => void;
    isProcessing?: boolean;
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (type.includes('image')) return <Image className="h-5 w-5 text-blue-500" />;
    if (type.includes('document') || type.includes('word'))
        return <FileText className="h-5 w-5 text-blue-600" />;
    if (type.includes('spreadsheet') || type.includes('excel'))
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    if (type.includes('presentation') || type.includes('powerpoint'))
        return <Presentation className="h-5 w-5 text-orange-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'uploading':
        case 'processing':
            return <Badge variant="secondary">Processing</Badge>;
        case 'completed':
            return (
                <Badge variant="default" className="bg-green-100 text-green-800">
                    Completed
                </Badge>
            );
        case 'error':
        case 'failed':
            return <Badge variant="destructive">Error</Badge>;
        case 'cancelled':
            return <Badge variant="outline">Cancelled</Badge>;
        default:
            return (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>
            );
    }
};

const generateUniqueFileName = (originalName: string): string => {
    const lastDotIndex = originalName.lastIndexOf('.');
    
    if (lastDotIndex === -1) {
        // No extension found
        return `${originalName} (2)`;
    }
    
    const nameWithoutExt = originalName.slice(0, lastDotIndex);
    const extension = originalName.slice(lastDotIndex);
    
    // Handle very long file names by truncating if necessary
    const maxNameLength = 200; // Reasonable limit for file names
    let newNameWithoutExt = nameWithoutExt;
    
    if (nameWithoutExt.length > maxNameLength - 10) { // Leave room for " (2)" and extension
        newNameWithoutExt = nameWithoutExt.slice(0, maxNameLength - 10) + '...';
    }
    
    return `${newNameWithoutExt} (2)${extension}`;
};

/**
 * Dialog component for resolving file upload duplicates.
 * Provides three resolution options: replace existing, keep both with new name, or cancel.
 * 
 * @param isOpen - Whether the dialog is currently open
 * @param onClose - Callback when dialog should be closed
 * @param newFile - The new file being uploaded
 * @param existingFile - Information about the existing duplicate file
 * @param onReplace - Callback when user chooses to replace existing file
 * @param onKeepBoth - Callback when user chooses to keep both files with new name
 * @param onCancel - Callback when user cancels the upload
 * @param isProcessing - Whether a resolution is currently being processed
 */
export default function DuplicateResolutionDialog({
    isOpen,
    onClose,
    newFile,
    existingFile,
    onReplace,
    onKeepBoth,
    onCancel,
    isProcessing = false,
}: DuplicateResolutionDialogProps) {
    const [customName, setCustomName] = useState(() => generateUniqueFileName(newFile.name));
    const [selectedResolution, setSelectedResolution] = useState<DuplicateResolution | null>(null);

    const handleReplace = () => {
        setSelectedResolution('replace');
        onReplace();
    };

    const handleKeepBoth = () => {
        setSelectedResolution('keep-both');
        onKeepBoth(customName);
    };

    const handleCancel = () => {
        setSelectedResolution('cancel');
        onCancel();
        onClose();
    };

    const handleClose = () => {
        if (!isProcessing) {
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent 
                className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                aria-describedby="duplicate-dialog-description"
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                        Duplicate File Detected
                    </DialogTitle>
                    <DialogDescription id="duplicate-dialog-description">
                        A file with the same name and size already exists. Choose how to handle this duplicate.
                    </DialogDescription>
                </DialogHeader>

                {/* File Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-y-auto">
                    {/* New File */}
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    {getFileIcon(newFile.type)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-blue-800">New File</h3>
                                    <p className="text-sm text-blue-600">About to be uploaded</p>
                                </div>
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                    New
                                </Badge>
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        File Name
                                    </Label>
                                    <p className="text-sm font-medium break-all">{newFile.name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-xs font-medium text-muted-foreground">
                                            Size
                                        </Label>
                                        <p className="text-sm">{formatFileSize(newFile.size)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs font-medium text-muted-foreground">
                                            Type
                                        </Label>
                                        <p className="text-sm">{newFile.type}</p>
                                    </div>
                                </div>
                                {newFile.file.lastModified && (
                                    <div>
                                        <Label className="text-xs font-medium text-muted-foreground">
                                            Last Modified
                                        </Label>
                                        <p className="text-sm">
                                            {formatDate(new Date(newFile.file.lastModified).toISOString())}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Existing File */}
                    <Card className="border-gray-200 bg-gray-50/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                    {getFileIcon(existingFile.type)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-800">Existing File</h3>
                                    <p className="text-sm text-gray-600">Already in your library</p>
                                </div>
                                {getStatusBadge(existingFile.processing_status || existingFile.status)}
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        File Name
                                    </Label>
                                    <p className="text-sm font-medium break-all">{existingFile.name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-xs font-medium text-muted-foreground">
                                            Size
                                        </Label>
                                        <p className="text-sm">{formatFileSize(existingFile.size)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs font-medium text-muted-foreground">
                                            Type
                                        </Label>
                                        <p className="text-sm">{existingFile.type}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        Upload Date
                                    </Label>
                                    <p className="text-sm">{formatDate(existingFile.uploadDate)}</p>
                                </div>
                                {existingFile.category && (
                                    <div>
                                        <Label className="text-xs font-medium text-muted-foreground">
                                            Category
                                        </Label>
                                        <Badge variant="outline" className="text-xs capitalize">
                                            {existingFile.category.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                )}
                                {existingFile.domain && (
                                    <div>
                                        <Label className="text-xs font-medium text-muted-foreground">
                                            Domain
                                        </Label>
                                        <Badge variant="outline" className="text-xs capitalize">
                                            {existingFile.domain.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Resolution Options */}
                <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-lg">Choose Resolution</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Replace Option */}
                        <Card 
                            className="cursor-pointer border-2 hover:border-red-300 transition-colors focus-within:ring-2 focus-within:ring-red-500"
                            role="button"
                            tabIndex={0}
                            onClick={handleReplace}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleReplace();
                                }
                            }}
                            aria-label="Replace existing file with new file"
                        >
                            <CardContent className="p-4 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="p-3 bg-red-100 rounded-full">
                                        <Replace className="h-6 w-6 text-red-600" aria-hidden="true" />
                                    </div>
                                    <h4 className="font-semibold">Replace Existing</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Remove the old file and upload the new one
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Keep Both Option */}
                        <Card className="border-2 hover:border-green-300 transition-colors focus-within:ring-2 focus-within:ring-green-500">
                            <CardContent className="p-4 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="p-3 bg-green-100 rounded-full">
                                        <Copy className="h-6 w-6 text-green-600" aria-hidden="true" />
                                    </div>
                                    <h4 className="font-semibold">Keep Both Files</h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Upload with a different name
                                    </p>
                                    <div className="w-full space-y-2">
                                        <Label htmlFor="custom-file-name" className="text-xs">
                                            New file name:
                                        </Label>
                                        <Input
                                            id="custom-file-name"
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                            className="text-sm"
                                            placeholder="Enter new file name"
                                            aria-describedby="custom-name-help"
                                        />
                                        <div id="custom-name-help" className="sr-only">
                                            Enter a new name for the file to avoid conflicts
                                        </div>
                                        <Button
                                            onClick={handleKeepBoth}
                                            disabled={!customName.trim() || customName === newFile.name || isProcessing}
                                            className="w-full"
                                            size="sm"
                                            aria-describedby="keep-both-help"
                                        >
                                            Keep Both
                                        </Button>
                                        <div id="keep-both-help" className="sr-only">
                                            Upload the new file with the custom name while keeping the existing file
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cancel Option */}
                        <Card 
                            className="cursor-pointer border-2 hover:border-gray-300 transition-colors focus-within:ring-2 focus-within:ring-gray-500"
                            role="button"
                            tabIndex={0}
                            onClick={handleCancel}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleCancel();
                                }
                            }}
                            aria-label="Cancel file upload"
                        >
                            <CardContent className="p-4 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="p-3 bg-gray-100 rounded-full">
                                        <X className="h-6 w-6 text-gray-600" aria-hidden="true" />
                                    </div>
                                    <h4 className="font-semibold">Cancel Upload</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Don't upload this file
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Warning about replacing processed files */}
                    {existingFile.processing_status === 'completed' && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Note:</strong> The existing file has been processed and contains extracted data. 
                                Replacing it will permanently delete all analysis and metadata.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button 
                        variant="outline" 
                        onClick={handleCancel}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="destructive"
                            onClick={handleReplace}
                            disabled={isProcessing}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isProcessing && selectedResolution === 'replace' ? (
                                <>Replacing...</>
                            ) : (
                                <>
                                    <Replace className="h-4 w-4 mr-2" />
                                    Replace
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={handleKeepBoth}
                            disabled={!customName.trim() || customName === newFile.name || isProcessing}
                        >
                            {isProcessing && selectedResolution === 'keep-both' ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Keep Both
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}