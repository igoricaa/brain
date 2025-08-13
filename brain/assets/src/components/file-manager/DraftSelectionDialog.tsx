import React from 'react';
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
    Plus,
    Trash2,
    FileText,
    Clock,
    Building2,
    FolderOpen,
    Target,
    Eye,
    Zap,
} from 'lucide-react';
import { DraftState } from '@/hooks/useDraftPersistence';

interface DraftSelectionDialogProps {
    drafts: DraftState[];
    open: boolean;
    onSelect: (draftId: string) => void;
    onDelete: (draftId: string) => void;
    onCreateNew: () => void;
    onClose: () => void;
}

// Helper function to get visual emphasis for draft based on activity
const getDraftActivityLevel = (draft: DraftState) => {
    const hoursOld = (Date.now() - new Date(draft.lastSaved).getTime()) / (1000 * 60 * 60);
    if (hoursOld < 1) return { level: 'recent', color: 'bg-green-50 border-green-200' };
    if (hoursOld < 24) return { level: 'active', color: 'bg-blue-50 border-blue-200' };
    if (hoursOld < 72) return { level: 'moderate', color: 'bg-yellow-50 border-yellow-200' };
    return { level: 'old', color: 'bg-gray-50 border-gray-200' };
};

// Helper function to get completion percentage for visual progress
const getDraftCompleteness = (draft: DraftState) => {
    let completionScore = 0;
    const totalFields = 5; // dealName, description, files, fundingTarget, activeTab

    if (draft.dealName) completionScore += 1;
    if (draft.description) completionScore += 1;
    if (draft.files.length > 0) completionScore += 1;
    if (draft.fundingTarget) completionScore += 1;
    if (draft.activeTab) completionScore += 1;

    const percentage = (completionScore / totalFields) * 100;
    if (percentage >= 80)
        return { label: 'Nearly Complete', color: 'text-green-600', bg: 'bg-green-100' };
    if (percentage >= 60)
        return { label: 'Good Progress', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (percentage >= 40)
        return { label: 'Getting Started', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { label: 'Just Started', color: 'text-gray-600', bg: 'bg-gray-100' };
};

export default function DraftSelectionDialog({
    drafts,
    open,
    onSelect,
    onDelete,
    onCreateNew,
    onClose,
}: DraftSelectionDialogProps) {
    const handleDelete = (draftId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(draftId);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh]">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
                            <FolderOpen className="h-5 w-5 text-blue-600" />
                        </div>
                        Select a Draft Deal
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        You have {drafts.length} saved draft{drafts.length !== 1 ? 's' : ''}. Select
                        one to continue editing or create a new deal from scratch.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[50vh] pr-4">
                    <div className="space-y-4">
                        {drafts.map((draft) => {
                            const activity = getDraftActivityLevel(draft);
                            const completeness = getDraftCompleteness(draft);

                            return (
                                <Card
                                    key={draft.draftId}
                                    className={`shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 border ${activity.color}`}
                                    onClick={() => onSelect(draft.draftId)}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start gap-6">
                                            <div className="flex-1 min-w-0 space-y-3">
                                                {/* Header with deal name and completion indicator */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0">
                                                            <Building2 className="h-4 w-4 text-gray-600" />
                                                        </div>
                                                        <h4 className="font-semibold text-lg text-gray-900 truncate">
                                                            {draft.dealName || 'Untitled Deal'}
                                                        </h4>
                                                    </div>
                                                    <div
                                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${completeness.bg} ${completeness.color} whitespace-nowrap`}
                                                    >
                                                        <Zap className="h-3 w-3" />
                                                        {completeness.label}
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                {draft.description && (
                                                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                                                        {draft.description}
                                                    </p>
                                                )}

                                                {/* Metrics grid */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center justify-center w-6 h-6 rounded bg-blue-100">
                                                            <FileText className="h-3 w-3 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500">
                                                                Files
                                                            </p>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {draft.files.length}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center justify-center w-6 h-6 rounded bg-green-100">
                                                            <Clock className="h-3 w-3 text-green-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500">
                                                                Modified
                                                            </p>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {formatDistanceToNow(
                                                                    new Date(draft.lastSaved),
                                                                    { addSuffix: true },
                                                                ).replace(' ago', '')}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {draft.fundingTarget && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center justify-center w-6 h-6 rounded bg-purple-100">
                                                                <Target className="h-3 w-3 text-purple-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500">
                                                                    Target
                                                                </p>
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    {draft.fundingTarget}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {draft.activeTab && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center justify-center w-6 h-6 rounded bg-orange-100">
                                                                <Eye className="h-3 w-3 text-orange-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500">
                                                                    Last Tab
                                                                </p>
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    {draft.activeTab === 'upload'
                                                                        ? 'Upload'
                                                                        : 'Details'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Delete button */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => handleDelete(draft.draftId, e)}
                                                className="hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </ScrollArea>

                <DialogFooter className="border-t pt-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
                        <p className="text-sm text-gray-500">
                            Select a draft to continue or start fresh with a new deal
                        </p>
                        <Button onClick={onCreateNew} className="h-11 px-8">
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Deal
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
