import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import FileManager from '@/components/file-manager/FileManager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, ArrowRight } from 'lucide-react';

function DealUploadApp() {
    const [isRedirecting, setIsRedirecting] = useState(false);

    const handleDraftSubmit = useCallback((dealUuid: string) => {
        setIsRedirecting(true);
        // Add a small delay to ensure database transaction is committed
        // before redirecting to deal detail page
        setTimeout(() => {
            // Add cache-busting parameter to ensure fresh data loads
            const timestamp = Date.now();
            const href = `/deals/${dealUuid}/?t=${timestamp}`;
            window.location.href = href;
        }, 1500); // 1.5 second delay to ensure backend finalization is complete
    }, []);

    const handleCancel = useCallback(() => {
        // Redirect back to deals list
        window.location.href = '/deals/fresh/';
    }, []);

    if (isRedirecting) {
        return (
            <div className="mx-auto w-full max-w-7xl py-6">
                <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="flex items-center gap-2">
                        <span>Deal created successfully! Redirecting to deal details...</span>
                        <ArrowRight className="h-4 w-4 animate-bounce" />
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Upload New Deal</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Upload multiple files to create a new deal. Files will be staged until you submit for underwriting.
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
