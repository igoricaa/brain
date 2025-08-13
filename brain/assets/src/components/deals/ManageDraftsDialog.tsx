import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Trash2, FileText, Clock, Building2, FolderOpen, RefreshCw } from 'lucide-react';
import { useDraftDeals, type DraftDeal } from '@/hooks/useDraftDeals';
import { useFileManagement } from '@/hooks/useFileManagement';
import { toast } from 'sonner';

interface ManageDraftsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectDraft: (draftUuid: string) => void;
}

export default function ManageDraftsDialog({
    isOpen,
    onClose,
    onSelectDraft,
}: ManageDraftsDialogProps) {
    const [drafts, setDrafts] = useState<DraftDeal[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [fileCounts, setFileCounts] = useState<Record<string, number>>({});

    const { getDraftDeals, deleteDraftDeal, isLoading } = useDraftDeals();
    const { getDealFiles } = useFileManagement();

    // Load drafts when dialog opens
    const loadDrafts = useCallback(async () => {
        if (!isOpen) return;

        try {
            setLoading(true);
            const draftsData = await getDraftDeals();
            setDrafts(draftsData);

            // Fetch file counts for each draft in parallel
            const fileCountPromises = draftsData.map(async (draft) => {
                try {
                    const response = await getDealFiles(draft.uuid);
                    return { draftUuid: draft.uuid, count: response.results.length };
                } catch (error) {
                    console.error(`Failed to load file count for draft ${draft.uuid}:`, error);
                    return { draftUuid: draft.uuid, count: 0 };
                }
            });

            const fileCountResults = await Promise.all(fileCountPromises);
            const fileCountMap = fileCountResults.reduce(
                (acc, result) => {
                    acc[result.draftUuid] = result.count;
                    return acc;
                },
                {} as Record<string, number>,
            );

            setFileCounts(fileCountMap);
        } catch (error) {
            console.error('Failed to load drafts:', error);
            toast.error('Failed to load drafts');
        } finally {
            setLoading(false);
        }
    }, [isOpen, getDraftDeals, getDealFiles]);

    useEffect(() => {
        loadDrafts();
    }, [loadDrafts]);

    const handleDeleteDraft = useCallback(
        async (draftUuid: string) => {
            try {
                await deleteDraftDeal(draftUuid);
                setDrafts((prev) => prev.filter((draft) => draft.uuid !== draftUuid));
                toast.success('Draft deleted successfully');
            } catch (error) {
                console.error('Failed to delete draft:', error);
                toast.error('Failed to delete draft');
            } finally {
                setDeleteConfirm(null);
            }
        },
        [deleteDraftDeal],
    );

    const confirmDelete = useCallback((draftUuid: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteConfirm(draftUuid);
    }, []);

    const handleSelectDraft = useCallback(
        (draftUuid: string) => {
            onSelectDraft(draftUuid);
            onClose();
        },
        [onSelectDraft, onClose],
    );

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-3xl max-h-[90vh] py-8 bg-slate-50">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
                                    <FolderOpen className="h-5 w-5 text-blue-600" />
                                </div>
                                Manage Draft Deals
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={loadDrafts}
                                disabled={loading}
                                className="cursor-pointer"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </DialogTitle>
                        <DialogDescription className="text-base">
                            You have {drafts.length} saved draft{drafts.length !== 1 ? 's' : ''}.
                            Select one to continue editing.
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[50vh] pr-4">
                        <div className="space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {loading ? (
                                <div className="text-center py-8">
                                    <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-gray-400" />
                                    <p className="text-gray-500">Loading drafts...</p>
                                </div>
                            ) : drafts.length === 0 ? (
                                <div className="text-center py-8">
                                    <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        No drafts found
                                    </h3>
                                    <p className="text-gray-500 mb-4">
                                        Create your first draft deal to get started.
                                    </p>
                                    <Button onClick={() => onClose()} variant="outline">
                                        Back
                                    </Button>
                                </div>
                            ) : (
                                drafts.map((draft) => (
                                    <Card
                                        key={draft.uuid}
                                        className="shadow-sm cursor-pointer hover:shadow-md transition-all duration-200"
                                        onClick={() => handleSelectDraft(draft.uuid)}
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start gap-6">
                                                <div className="flex-1 min-w-0 space-y-3">
                                                    {/* Header with deal name */}
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 flex-shrink-0">
                                                                <Building2 className="h-4 w-4 text-blue-600" />
                                                            </div>
                                                            <h4 className="font-semibold text-lg text-gray-900 truncate">
                                                                {draft.name || 'Untitled Deal'}
                                                            </h4>
                                                        </div>
                                                        <Badge
                                                            variant="secondary"
                                                            className="whitespace-nowrap"
                                                        >
                                                            Draft
                                                        </Badge>
                                                    </div>

                                                    {/* Description if available */}
                                                    {draft.description && (
                                                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                                                            {draft.description}
                                                        </p>
                                                    )}

                                                    {/* Metrics */}
                                                    <div className="flex items-center gap-6 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="h-4 w-4 text-gray-400" />
                                                            <span className="text-gray-600">
                                                                Created{' '}
                                                                {formatDistanceToNow(
                                                                    new Date(draft.created_at),
                                                                    { addSuffix: true },
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-400">•</span>
                                                            <FileText className="h-4 w-4 text-gray-400" />
                                                            <span className="text-gray-600">
                                                                {fileCounts[draft.uuid] ?? 0} file
                                                                {(fileCounts[draft.uuid] ?? 0) !== 1
                                                                    ? 's'
                                                                    : ''}
                                                            </span>
                                                        </div>
                                                        {draft.website && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-400">
                                                                    •
                                                                </span>
                                                                <a
                                                                    href={draft.website}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                    className="text-blue-600 hover:text-blue-800 truncate max-w-32"
                                                                >
                                                                    {
                                                                        new URL(draft.website)
                                                                            .hostname
                                                                    }
                                                                </a>
                                                            </div>
                                                        )}
                                                        {draft.funding_target && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-400">
                                                                    •
                                                                </span>
                                                                <span className="text-gray-600">
                                                                    Target: {draft.funding_target}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Delete button */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => confirmDelete(draft.uuid, e)}
                                                    className="hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0 cursor-pointer"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </ScrollArea>

                    <DialogFooter className="border-t border-gray-300 pt-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
                            <p className="text-sm text-gray-500">
                                Select a draft to continue editing
                            </p>
                            <Button
                                onClick={() => onClose()}
                                variant="outline"
                                className="h-11 px-8"
                            >
                                Back
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation dialog */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Draft Deal</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this draft? This action cannot be undone
                            and all uploaded files will be removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirm && handleDeleteDraft(deleteConfirm)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete Draft
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
