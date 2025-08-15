import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { BookOpen, Sparkles, Database } from 'lucide-react';
import FileManager from '@/components/file-manager/FileManager';

function LibraryNewPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <BookOpen className="h-8 w-8 text-blue-600" />
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Enhanced Library
                                </h1>
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full ml-2">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Enhanced
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="text-sm text-gray-500">
                                Advanced file management with AI features
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-center space-x-8 text-sm text-gray-700">
                        <div className="flex items-center">
                            <Sparkles className="h-4 w-4 text-blue-600 mr-2" />
                            TLDR Summaries
                        </div>
                        <div className="flex items-center">
                            <Database className="h-4 w-4 text-green-600 mr-2" />
                            Domain Classification
                        </div>
                        <div className="flex items-center">
                            <BookOpen className="h-4 w-4 text-purple-600 mr-2" />
                            Enhanced Search & Filtering
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-6">
                <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-2">
                        Knowledge Base Management
                    </h2>
                    <p className="text-gray-600">
                        Manage your document library with advanced features including AI-generated summaries, 
                        domain categorization, and enhanced search capabilities.
                    </p>
                </div>

                <FileManager 
                    mode="library" 
                    showUpload={true}
                    allowSubmission={false}
                />
            </div>

            {/* Toast notifications */}
            <Toaster 
                position="top-right"
                richColors
                toastOptions={{
                    duration: 4000,
                }}
            />
        </div>
    );
}

// Mount function
function mount() {
    const el = document.getElementById('library-new-root');
    if (!el) {
        console.warn('library-new-root element not found');
        return;
    }
    
    const root = createRoot(el);
    root.render(<LibraryNewPage />);
}

// Initialize function
export function initialize() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
}