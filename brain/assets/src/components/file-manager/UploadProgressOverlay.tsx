import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Upload,
    CheckCircle2,
    AlertCircle,
    X,
    FileUp,
    Loader2
} from 'lucide-react';

export interface UploadState {
    isUploading: boolean;
    currentFile: number;
    totalFiles: number;
    currentFileName: string;
    overallProgress: number;
    fileProgress: number;
    errors: string[];
    isCompleted: boolean;
}

interface UploadProgressOverlayProps {
    uploadState: UploadState;
    onCancel?: () => void;
    allowCancel?: boolean;
    onClose?: () => void;
}

export default function UploadProgressOverlay({
    uploadState,
    onCancel,
    allowCancel = false,
    onClose,
}: UploadProgressOverlayProps) {
    const {
        isUploading,
        currentFile,
        totalFiles,
        currentFileName,
        overallProgress,
        fileProgress,
        errors,
        isCompleted,
    } = uploadState;

    if (!isUploading && !isCompleted) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <Card className="w-full max-w-lg mx-4 shadow-2xl relative">
                {/* Close button - only show when there are errors and onClose is provided */}
                {isCompleted && errors.length > 0 && onClose && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="absolute top-4 right-4 h-8 w-8 p-0 rounded-full hover:bg-red-50 hover:text-red-600 transition-all duration-200 z-10 focus:ring-2 focus:ring-red-200 focus:ring-offset-1"
                        aria-label="Close error dialog"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
                <CardContent className="p-8">
                    <div className="text-center space-y-6">
                        {/* Header */}
                        <div className="space-y-2">
                            {isCompleted ? (
                                errors.length > 0 ? (
                                    <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
                                        <AlertCircle className="w-8 h-8 text-red-600" />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full">
                                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                                    </div>
                                )
                            ) : (
                                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-blue-100 rounded-full">
                                    <Upload className="w-8 h-8 text-blue-600 animate-pulse" />
                                </div>
                            )}
                            
                            <h2 className="text-xl font-semibold">
                                {isCompleted 
                                    ? errors.length > 0 
                                        ? 'Upload Failed' 
                                        : 'Upload Complete!'
                                    : 'Uploading Files'
                                }
                            </h2>
                            
                            {!isCompleted && (
                                <p className="text-sm text-muted-foreground">
                                    Please don't close this page while files are uploading
                                </p>
                            )}
                        </div>

                        {/* Progress Section */}
                        {!isCompleted && (
                            <div className="space-y-4">
                                {/* Current File */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Current file:</span>
                                        <span className="font-medium">{currentFile} of {totalFiles}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <FileUp className="w-4 h-4 text-blue-600" />
                                        <span className="truncate font-medium">{currentFileName}</span>
                                    </div>
                                    <Progress value={fileProgress} className="h-2" />
                                </div>

                                {/* Overall Progress */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Overall progress:</span>
                                        <span className="font-medium">{Math.round(overallProgress)}%</span>
                                    </div>
                                    <Progress value={overallProgress} className="h-3" />
                                </div>
                            </div>
                        )}

                        {/* Errors */}
                        {errors.length > 0 && (
                            <div className="text-left space-y-3">
                                <h3 className="text-sm font-medium text-red-600 mb-2">Upload Errors:</h3>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                                    {errors.map((error, index) => (
                                        <p key={index} className="text-sm text-red-700">
                                            • {error}
                                        </p>
                                    ))}
                                </div>
                                {onClose && (
                                    <div className="flex justify-center">
                                        <Button 
                                            variant="outline" 
                                            onClick={onClose}
                                            className="w-full"
                                        >
                                            Close
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Status Message */}
                        {isCompleted && errors.length === 0 && (
                            <div className="space-y-2">
                                <p className="text-green-600 font-medium">
                                    All files uploaded successfully!
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Redirecting to deal details...
                                </p>
                                <div className="flex items-center justify-center">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        {!isCompleted && allowCancel && onCancel && (
                            <Button 
                                variant="outline" 
                                onClick={onCancel}
                                className="w-full"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancel Upload
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}