import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
    useQueryStates,
    parseAsString,
    parseAsInteger,
    parseAsArrayOf,
    parseAsStringEnum,
} from 'nuqs';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Upload,
    Search,
    Filter,
    Database,
    FileText,
    RefreshCw,
    AlertCircle,
    Download,
    Grid3X3,
    List,
    MoreHorizontal,
    Tags,
    FolderOpen,
    BookOpen,
    Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import FileManager from '@/components/file-manager/FileManager';
import LibraryFileTable from '@/components/library/LibraryFileTable';
import LibraryUploadArea from '@/components/library/LibraryUploadArea';
import FileMetadataModal from '@/components/library/FileMetadataModal';
import { useFileManagement, LibraryFile, FileFilters } from '@/hooks/useFileManagement';
import { http } from '@/lib/http';
import { sanitizeError, getUserFriendlyMessage } from '@/utils/errorSanitization';

// Library-specific types
interface LibraryCategory {
    uuid: string;
    name: string;
    code: string;
    description?: string;
    file_count?: number;
}

interface LibrarySource {
    uuid: string;
    name: string;
    code: string;
    description?: string;
    website?: string;
}

interface DocumentType {
    uuid: string;
    name: string;
    code: string;
    description?: string;
}

interface LibraryStats {
    total_files: number;
    total_size: number;
    files_by_category: { category: string; count: number }[];
    files_by_type: { type: string; count: number }[];
    processing_status: { status: string; count: number }[];
    recent_uploads: number;
}

// URL state management
const useLibraryUrlState = () => {
    return useQueryStates({
        view: parseAsStringEnum(['table', 'grid']).withDefault('table'),
        search: parseAsString.withDefault(''),
        categories: parseAsArrayOf(parseAsString).withDefault([]),
        sources: parseAsArrayOf(parseAsString).withDefault([]),
        document_types: parseAsArrayOf(parseAsString).withDefault([]),
        processing_status: parseAsArrayOf(parseAsString).withDefault([]),
        page: parseAsInteger.withDefault(1),
        page_size: parseAsInteger.withDefault(20),
        ordering: parseAsString.withDefault('-created_at'),
    });
};

// Library filters component
function LibraryFilters({
    categories,
    sources,
    documentTypes,
    filters,
    onFiltersChange,
    isLoading,
}: {
    categories: LibraryCategory[];
    sources: LibrarySource[];
    documentTypes: DocumentType[];
    filters: any;
    onFiltersChange: (filters: any) => void;
    isLoading: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    const activeFilterCount = [
        filters.categories?.length || 0,
        filters.sources?.length || 0,
        filters.document_types?.length || 0,
        filters.processing_status?.length || 0,
    ].reduce((sum, count) => sum + count, 0);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Filter className="h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? 'Hide' : 'Show'}
                    </Button>
                </div>
            </CardHeader>
            {isExpanded && (
                <CardContent className="space-y-4">
                    {/* Categories Filter */}
                    <div>
                        <h4 className="text-sm font-medium mb-2">Categories</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {categories.map((category) => (
                                <label key={category.uuid} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={
                                            filters.categories?.includes(category.uuid) || false
                                        }
                                        onChange={(e) => {
                                            const newCategories = e.target.checked
                                                ? [...(filters.categories || []), category.uuid]
                                                : (filters.categories || []).filter(
                                                      (id: string) => id !== category.uuid,
                                                  );
                                            onFiltersChange({ categories: newCategories });
                                        }}
                                        className="rounded"
                                    />
                                    <span className="text-sm">{category.name}</span>
                                    {category.file_count !== undefined && (
                                        <Badge variant="outline" className="text-xs">
                                            {category.file_count}
                                        </Badge>
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Sources Filter */}
                    <div>
                        <h4 className="text-sm font-medium mb-2">Sources</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {sources.map((source) => (
                                <label key={source.uuid} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={filters.sources?.includes(source.uuid) || false}
                                        onChange={(e) => {
                                            const newSources = e.target.checked
                                                ? [...(filters.sources || []), source.uuid]
                                                : (filters.sources || []).filter(
                                                      (id: string) => id !== source.uuid,
                                                  );
                                            onFiltersChange({ sources: newSources });
                                        }}
                                        className="rounded"
                                    />
                                    <span className="text-sm">{source.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Document Types Filter */}
                    <div>
                        <h4 className="text-sm font-medium mb-2">Document Types</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {documentTypes.map((type) => (
                                <label key={type.uuid} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={
                                            filters.document_types?.includes(type.uuid) || false
                                        }
                                        onChange={(e) => {
                                            const newTypes = e.target.checked
                                                ? [...(filters.document_types || []), type.uuid]
                                                : (filters.document_types || []).filter(
                                                      (id: string) => id !== type.uuid,
                                                  );
                                            onFiltersChange({ document_types: newTypes });
                                        }}
                                        className="rounded"
                                    />
                                    <span className="text-sm">{type.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Processing Status Filter */}
                    <div>
                        <h4 className="text-sm font-medium mb-2">Processing Status</h4>
                        <div className="space-y-1">
                            {['pending', 'processing', 'completed', 'failed'].map((status) => (
                                <label key={status} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={
                                            filters.processing_status?.includes(status) || false
                                        }
                                        onChange={(e) => {
                                            const newStatuses = e.target.checked
                                                ? [...(filters.processing_status || []), status]
                                                : (filters.processing_status || []).filter(
                                                      (s: string) => s !== status,
                                                  );
                                            onFiltersChange({ processing_status: newStatuses });
                                        }}
                                        className="rounded"
                                    />
                                    <span className="text-sm capitalize">{status}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Clear Filters */}
                    {activeFilterCount > 0 && (
                        <>
                            <Separator />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    onFiltersChange({
                                        categories: [],
                                        sources: [],
                                        document_types: [],
                                        processing_status: [],
                                    })
                                }
                                className="w-full"
                            >
                                Clear All Filters
                            </Button>
                        </>
                    )}
                </CardContent>
            )}
        </Card>
    );
}

// Library stats component
function LibraryStats({ stats }: { stats: LibraryStats | null }) {
    if (!stats) return null;

    const formatFileSize = (bytes: number) => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Files</p>
                            <p className="text-2xl font-bold">
                                {stats.total_files.toLocaleString()}
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Size</p>
                            <p className="text-2xl font-bold">{formatFileSize(stats.total_size)}</p>
                        </div>
                        <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Database className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Categories</p>
                            <p className="text-2xl font-bold">{stats.files_by_category.length}</p>
                        </div>
                        <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <FolderOpen className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Recent Uploads</p>
                            <p className="text-2xl font-bold">{stats.recent_uploads}</p>
                            <p className="text-xs text-gray-400">Last 7 days</p>
                        </div>
                        <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Upload className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Main library page component
function LibraryPage() {
    const [urlState, setUrlState] = useLibraryUrlState();
    const [files, setFiles] = useState<LibraryFile[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [categories, setCategories] = useState<LibraryCategory[]>([]);
    const [sources, setSources] = useState<LibrarySource[]>([]);
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [stats, setStats] = useState<LibraryStats | null>(null);
    const [activeTab, setActiveTab] = useState('browse');

    // File selection and modal state
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [currentFile, setCurrentFile] = useState<LibraryFile | null>(null);
    const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);

    const {
        getLibraryFiles,
        updateLibraryFile,
        deleteLibraryFile,
        reprocessLibraryFile,
        downloadFile,
        isLoading: fileLoading,
        error,
        clearError,
    } = useFileManagement();

    const handleFileView = (file: LibraryFile) => {
        setCurrentFile(file);
        setIsMetadataModalOpen(true);
    };

    const handleMetadataModalClose = () => {
        setIsMetadataModalOpen(false);
        setCurrentFile(null);
    };

    // Load metadata (categories, sources, document types)
    const loadMetadata = async () => {
        try {
            const [categoriesResp, sourcesResp, docTypesResp] = await Promise.all([
                http.get<{ results: LibraryCategory[] }>('/library/categories/'),
                http.get<{ results: LibrarySource[] }>('/library/sources/'),
                http.get<{ results: DocumentType[] }>('/library/document-types/'),
            ]);

            setCategories(categoriesResp.data.results || []);
            setSources(sourcesResp.data.results || []);
            setDocumentTypes(docTypesResp.data.results || []);
        } catch (error) {
            console.error('Failed to load metadata:', error);
            toast.error('Failed to load library metadata');
        }
    };

    // Load library stats
    const loadStats = async () => {
        try {
            const response = await http.get<LibraryStats>('/library/stats/');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    // Load files based on current filters
    const loadFiles = async () => {
        setIsLoading(true);
        clearError();

        try {
            const filters: FileFilters = {
                search: urlState.search || undefined,
                category: urlState.categories.length > 0 ? urlState.categories : undefined,
                page: urlState.page,
                page_size: urlState.page_size,
                ordering: urlState.ordering,
            };

            // Add source and document type filters if supported by API
            if (urlState.sources.length > 0) {
                (filters as any).source = urlState.sources;
            }
            if (urlState.document_types.length > 0) {
                (filters as any).document_type = urlState.document_types;
            }
            if (urlState.processing_status.length > 0) {
                filters.processing_status = urlState.processing_status;
            }

            const response = await getLibraryFiles(filters);
            setFiles(response.results);
            setTotalCount(response.count);
        } catch (error) {
            console.error('Failed to load files:', error);
            const sanitizedError = sanitizeError(error, 'Library loading');
            const userFriendlyMessage = getUserFriendlyMessage(sanitizedError, 'Library loading');
            toast.error('Failed to load library files', {
                description: userFriendlyMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // File operation handlers (defined after loadFiles)
    const handleFileUpdate = async (fileId: string, data: any) => {
        try {
            await updateLibraryFile(fileId, data);
            loadFiles(); // Refresh the file list
            toast.success('File updated successfully');
        } catch (error) {
            console.error('Error updating file:', error);
            toast.error('Failed to update file');
        }
    };

    const handleFileDelete = async (fileId: string) => {
        try {
            await deleteLibraryFile(fileId);
            loadFiles(); // Refresh the file list
            setSelectedFiles((prev) => prev.filter((id) => id !== fileId));
            toast.success('File deleted successfully');
        } catch (error) {
            console.error('Error deleting file:', error);
            toast.error('Failed to delete file');
        }
    };

    const handleFileReprocess = async (fileId: string) => {
        try {
            await reprocessLibraryFile(fileId);
            loadFiles(); // Refresh the file list
            toast.success('File reprocessing started');
        } catch (error) {
            console.error('Error reprocessing file:', error);
            toast.error('Failed to reprocess file');
        }
    };

    const handleFileDownload = async (fileId: string) => {
        try {
            await downloadFile(fileId, 'library');
        } catch (error) {
            console.error('Error downloading file:', error);
            toast.error('Failed to download file');
        }
    };

    const handleUploadComplete = () => {
        loadFiles();
        loadStats();
    };

    // Load data on mount and when URL state changes
    useEffect(() => {
        loadMetadata();
        loadStats();
    }, [loadMetadata, loadStats]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    // Handle filter changes
    const handleFiltersChange = (newFilters: any) => {
        setUrlState({
            ...newFilters,
            page: 1, // Reset to first page when filters change
        });
    };

    // Handle search
    const handleSearch = (searchTerm: string) => {
        setUrlState({
            search: searchTerm || null,
            page: 1,
        });
    };

    // Handle view change
    const handleViewChange = (view: 'table' | 'grid') => {
        setUrlState({ view });
    };

    // Handle pagination
    const handlePageChange = (page: number) => {
        setUrlState({ page });
    };

    // Refresh all data
    const handleRefresh = () => {
        loadFiles();
        loadStats();
    };

    const currentFilters = {
        categories: urlState.categories,
        sources: urlState.sources,
        document_types: urlState.document_types,
        processing_status: urlState.processing_status,
    };

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
                                    Knowledge Graph
                                </h1>
                            </div>
                            <Badge variant="secondary" className="ml-4">
                                {totalCount.toLocaleString()} files
                            </Badge>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={isLoading}
                            >
                                <RefreshCw
                                    className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
                                />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                <LibraryStats stats={stats} />

                {/* Error Display */}
                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <div className="flex justify-between items-start">
                                <span>{error}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearError}
                                    className="h-6 w-6 p-0"
                                >
                                    x
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="browse" className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Browse
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Upload
                        </TabsTrigger>
                        <TabsTrigger value="manage" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Manage
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="browse" className="space-y-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Sidebar with filters */}
                            <div className="w-full lg:w-80 space-y-4">
                                <LibraryFilters
                                    categories={categories}
                                    sources={sources}
                                    documentTypes={documentTypes}
                                    filters={currentFilters}
                                    onFiltersChange={handleFiltersChange}
                                    isLoading={isLoading}
                                />
                            </div>

                            {/* Main content area */}
                            <div className="flex-1 space-y-4">
                                {/* Search and view controls */}
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 max-w-md">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search files..."
                                                        value={urlState.search}
                                                        onChange={(e) =>
                                                            handleSearch(e.target.value)
                                                        }
                                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    variant={
                                                        urlState.view === 'table'
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    size="sm"
                                                    onClick={() => handleViewChange('table')}
                                                >
                                                    <List className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant={
                                                        urlState.view === 'grid'
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    size="sm"
                                                    onClick={() => handleViewChange('grid')}
                                                >
                                                    <Grid3X3 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* File display */}
                                <Card>
                                    <CardContent className="p-0">
                                        <LibraryFileTable
                                            files={files}
                                            selectedFiles={selectedFiles}
                                            onSelectionChange={setSelectedFiles}
                                            onFileUpdate={handleFileUpdate}
                                            onFileDelete={handleFileDelete}
                                            onFileDownload={handleFileDownload}
                                            onFileReprocess={handleFileReprocess}
                                            onFileView={handleFileView}
                                            isLoading={isLoading}
                                            sortBy={urlState.ordering.replace('-', '')}
                                            sortDirection={
                                                urlState.ordering.startsWith('-') ? 'desc' : 'asc'
                                            }
                                            onSort={(column) => {
                                                const currentOrdering = urlState.ordering;
                                                const newOrdering =
                                                    currentOrdering === column
                                                        ? `-${column}`
                                                        : column;
                                                setUrlState({ ordering: newOrdering });
                                            }}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-6">
                        <LibraryUploadArea
                            categories={categories}
                            sources={sources}
                            documentTypes={documentTypes}
                            onUploadComplete={handleUploadComplete}
                            maxFiles={100}
                            maxFileSize={15}
                        />
                    </TabsContent>

                    <TabsContent value="manage" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FolderOpen className="h-5 w-5" />
                                        Categories
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Manage file categories and organization.
                                    </p>
                                    <div className="space-y-2">
                                        {categories.map((category) => (
                                            <div
                                                key={category.uuid}
                                                className="flex items-center justify-between p-2 border rounded"
                                            >
                                                <span className="font-medium">{category.name}</span>
                                                <Badge variant="secondary">
                                                    {category.file_count || 0} files
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Database className="h-5 w-5" />
                                        Sources
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Manage file sources and provenance.
                                    </p>
                                    <div className="space-y-2">
                                        {sources.map((source) => (
                                            <div
                                                key={source.uuid}
                                                className="flex items-center justify-between p-2 border rounded"
                                            >
                                                <span className="font-medium">{source.name}</span>
                                                {source.website && (
                                                    <a
                                                        href={source.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* File Metadata Modal */}
            <FileMetadataModal
                file={currentFile}
                isOpen={isMetadataModalOpen}
                onClose={handleMetadataModalClose}
                onSave={handleFileUpdate}
                categories={categories}
                sources={sources}
                documentTypes={documentTypes}
                isLoading={isLoading}
            />
        </div>
    );
}

// Mount function
function mount() {
    const el = document.getElementById('library-root');
    if (!el) return;
    const root = createRoot(el);
    root.render(
        <NuqsAdapter>
            <LibraryPage />
        </NuqsAdapter>
    );
}

// Initialize function
export function initialize() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
}
