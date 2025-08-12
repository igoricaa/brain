import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PeopleList } from '@/components/people/PeopleList';

const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function AdvisorsPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q') || '';
    const initialPage = parseInt(urlParams.get('page') || '1', 10) || 1;

    return (
        <QueryClientProvider client={queryClient}>
            <div className="container mx-auto py-6">
                <PeopleList
                    variant="advisors"
                    initialQuery={initialQuery}
                    initialPage={initialPage}
                    pageSize={30}
                />
            </div>
        </QueryClientProvider>
    );
}

function mountAdvisorsPage() {
    const rootElement = document.getElementById('advisors-root');
    if (!rootElement) {
        console.error('Advisors root element not found');
        return;
    }
    const root = createRoot(rootElement);
    root.render(
        <StrictMode>
            <AdvisorsPage />
        </StrictMode>,
    );
}

export function initialize() {
    mountAdvisorsPage();
}

if (!window.__SINGLE_ENTRY_MODE__) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountAdvisorsPage);
    } else {
        mountAdvisorsPage();
    }
}
