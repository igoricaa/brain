import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PeopleList } from '@/components/people/PeopleList';

const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function FoundersPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q') || '';
    const initialPage = parseInt(urlParams.get('page') || '1', 10) || 1;

    return (
        <QueryClientProvider client={queryClient}>
            <div className="container mx-auto py-6">
                <PeopleList
                    variant="founders"
                    initialQuery={initialQuery}
                    initialPage={initialPage}
                    pageSize={30}
                />
            </div>
        </QueryClientProvider>
    );
}

function mountFoundersPage() {
    const rootElement = document.getElementById('founders-root');
    if (!rootElement) {
        console.error('Founders root element not found');
        return;
    }
    const root = createRoot(rootElement);
    root.render(
        <StrictMode>
            <FoundersPage />
        </StrictMode>,
    );
}

export function initialize() {
    mountFoundersPage();
}

if (!window.__SINGLE_ENTRY_MODE__) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountFoundersPage);
    } else {
        mountFoundersPage();
    }
}
