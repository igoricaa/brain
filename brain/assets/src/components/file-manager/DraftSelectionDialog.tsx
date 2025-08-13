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
    Calendar,
    FolderOpen
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
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5" />
                        Select a Draft
                    </DialogTitle>
                    <DialogDescription>
                        You have {drafts.length} saved draft{drafts.length !== 1 ? 's' : ''}. Select one to continue editing or create a new deal.
                    </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="max-h-[400px] pr-4">
                    <div className="space-y-3">
                        {drafts.map((draft) => (
                            <Card 
                                key={draft.draftId} 
                                className="cursor-pointer hover:shadow-md transition-all hover:border-blue-300"
                                onClick={() => onSelect(draft.draftId)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-base truncate">
                                                {draft.dealName || 'Untitled Deal'}
                                            </h4>
                                            {draft.description && (
                                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                    {draft.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <FileText className="h-3.5 w-3.5" />
                                                    <span>{draft.files.length} file{draft.files.length !== 1 ? 's' : ''}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    <span>
                                                        {formatDistanceToNow(new Date(draft.lastSaved), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                {draft.fundingTarget && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {draft.fundingTarget}
                                                    </Badge>
                                                )}
                                            </div>
                                            {draft.activeTab && (
                                                <div className="mt-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        Last viewed: {draft.activeTab === 'upload' ? 'Upload Files' : 'Configure Details'}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => handleDelete(draft.draftId, e)}
                                            className="hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
                
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button 
                        variant="outline" 
                        onClick={onCreateNew}
                        className="w-full sm:w-auto"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Deal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}