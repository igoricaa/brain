import { StrictMode, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import FileManager from '@/components/file-manager/FileManager';
import { Toaster } from '@/components/ui/sonner';

function DealUploadApp() {
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

    return (
        <>
            <div className="mx-auto w-full max-w-7xl py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Upload New Deal</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Upload multiple files to create a new deal. Files will be staged until you
                        submit for underwriting.
                    </p>
                </div>

                <FileManager
                    mode="draft-deal"
                    onDraftSubmit={handleDraftSubmit}
                    onCancel={handleCancel}
                    allowSubmission={true}
                    showUpload={true}
                />
            </div>
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
