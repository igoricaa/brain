import { Button } from '@/components/ui/button';
import { 
    Send, 
    RotateCcw, 
    FileEdit, 
    Archive, 
    Trash2, 
    History, 
    ExternalLink,
    Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Deal {
    uuid: string;
    name?: string | null;
    sent_to_affinity?: boolean | null;
    created_at?: string;
    // Add any other deal properties needed
}

interface ActionsBarProps {
    deal: Deal;
    onEditFiles: () => void;
    onSendToAffinity?: () => void;
    onReassess?: () => void;
    onViewHistory?: () => void;
    onArchive?: () => void;
    onDelete?: () => void;
    isProcessing?: boolean;
    newFilesCount?: number;
}

function ActionButton({
    children,
    onClick,
    disabled = false,
    title,
    variant = 'default' as const,
    size = 'default' as const,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    size?: 'default' | 'sm' | 'lg';
}) {
    return (
        <Button
            variant={variant}
            size={size}
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={disabled ? 'cursor-not-allowed' : ''}
        >
            {children}
        </Button>
    );
}

export function ActionsBar({
    deal,
    onEditFiles,
    onSendToAffinity,
    onReassess,
    onViewHistory,
    onArchive,
    onDelete,
    isProcessing = false,
    newFilesCount = 0,
}: ActionsBarProps) {
    const handleSendToAffinity = () => {
        if (onSendToAffinity) {
            onSendToAffinity();
        } else {
            // Default behavior - could make API call here
            console.log('Send to Affinity clicked');
        }
    };

    const handleReassess = () => {
        if (onReassess) {
            onReassess();
        } else {
            // Default behavior - trigger reassessment
            console.log('Reassess clicked');
        }
    };

    const handleViewHistory = () => {
        if (onViewHistory) {
            onViewHistory();
        } else {
            // Default behavior - navigate to history view
            console.log('View History clicked');
        }
    };

    const handleArchive = () => {
        if (onArchive) {
            onArchive();
        } else {
            // Default behavior - show archive confirmation
            console.log('Archive clicked');
        }
    };

    const handleDelete = () => {
        if (onDelete && window.confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
            onDelete();
        } else if (!onDelete) {
            // Default behavior - show delete confirmation
            console.log('Delete clicked');
        }
    };

    return (
        <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Primary Actions */}
                    <div className="flex items-center gap-3">
                        <ActionButton
                            variant={deal.sent_to_affinity ? 'outline' : 'default'}
                            onClick={handleSendToAffinity}
                            disabled={isProcessing}
                            title={
                                deal.sent_to_affinity 
                                    ? 'Already sent to Affinity' 
                                    : 'Send this deal to Affinity for tracking'
                            }
                        >
                            <Send className="h-4 w-4 mr-2" />
                            {deal.sent_to_affinity ? 'Sent to Affinity' : 'Send to Affinity'}
                            {deal.sent_to_affinity && (
                                <Badge variant="secondary" className="ml-2">
                                    ✓
                                </Badge>
                            )}
                        </ActionButton>

                        <ActionButton
                            variant="outline"
                            onClick={handleReassess}
                            disabled={isProcessing}
                            title="Run AI assessment again with latest data"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reassess
                            {isProcessing && (
                                <Clock className="h-4 w-4 ml-2 animate-spin" />
                            )}
                        </ActionButton>

                        <ActionButton
                            variant="outline"
                            onClick={onEditFiles}
                            title={
                                newFilesCount > 0 
                                    ? `Manage files (${newFilesCount} new since last assessment)` 
                                    : 'Manage deal files and documents'
                            }
                        >
                            <FileEdit className="h-4 w-4 mr-2" />
                            Edit Files
                            {newFilesCount > 0 && (
                                <Badge variant="destructive" className="ml-2">
                                    {newFilesCount} new
                                </Badge>
                            )}
                        </ActionButton>
                    </div>

                    {/* Deal Info */}
                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                        <span>{deal.name || 'Unnamed Deal'}</span>
                        {deal.created_at && (
                            <>
                                <span>•</span>
                                <span>Created {new Date(deal.created_at).toLocaleDateString()}</span>
                            </>
                        )}
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex items-center gap-2">
                        <ActionButton
                            variant="ghost"
                            size="sm"
                            onClick={handleViewHistory}
                            title="View assessment history and changes"
                        >
                            <History className="h-4 w-4 mr-1" />
                            History
                        </ActionButton>

                        <ActionButton
                            variant="ghost"
                            size="sm"
                            onClick={handleArchive}
                            title="Archive this deal (can be restored later)"
                        >
                            <Archive className="h-4 w-4 mr-1" />
                            Archive
                        </ActionButton>

                        <ActionButton
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            title="Permanently delete this deal"
                        >
                            <Trash2 className="h-4 w-4 mr-1 text-red-600" />
                            <span className="text-red-600">Delete</span>
                        </ActionButton>
                    </div>
                </div>
            </div>
        </div>
    );
}