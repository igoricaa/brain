import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import FileManager from '@/components/file-manager/FileManager';
import ManageDraftsDialog from '@/components/deals/ManageDraftsDialog';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

function DealUploadApp() {
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
    const [isManageDraftsOpen, setIsManageDraftsOpen] = useState(false);

    const handleDraftSubmit = useCallback((dealUuid: string) => {
        // Add cache-busting parameter to ensure fresh data loads
        const timestamp = Date.now();
        const href = `/deals/${dealUuid}/?t=${timestamp}`;
        window.location.href = href;
    }, []);

    const handleCancel = useCallback(() => {
        // Redirect back to deals list
        window.location.href = '/deals/fresh/';
    }, []);

    const handleSelectDraft = useCallback((draftUuid: string) => {
        setCurrentDraftId(draftUuid);
        setIsManageDraftsOpen(false);
    }, []);

    const handleCreateNew = useCallback(() => {
        setCurrentDraftId(null);
        setIsManageDraftsOpen(false);
    }, []);

    return (
        <>
            <div className="mx-auto w-full max-w-7xl py-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Upload New Deal</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Upload multiple files to create a new deal. Files will be staged until
                            you submit for underwriting.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsManageDraftsOpen(true)}
                            className="h-10 px-4"
                        >
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Manage Drafts
                        </Button>
                        <Button onClick={handleCreateNew} className="h-10 px-4">
                            <Plus className="h-4 w-4 mr-2" />
                            New Draft
                        </Button>
                    </div>
                </div>

                <FileManager
                    mode="draft-deal"
                    dealId={currentDraftId}
                    onDraftSubmit={handleDraftSubmit}
                    onCancel={handleCancel}
                    allowSubmission={true}
                    showUpload={true}
                />
            </div>

            <ManageDraftsDialog
                isOpen={isManageDraftsOpen}
                onClose={() => setIsManageDraftsOpen(false)}
                onSelectDraft={handleSelectDraft}
                onCreateNew={handleCreateNew}
            />

            <Toaster />
        </>
    );
}

function mount() {
    const el = document.getElementById('deal-upload-root');
    if (!el) return;
    const root = createRoot(el);
    root.render(
        <StrictMode>
            <DealUploadApp />
        </StrictMode>,
    );
}

export function initialize() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
}
