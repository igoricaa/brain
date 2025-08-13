# File Manager Components - Frontend Guide

## Overview

Frontend components implementing a comprehensive file management system with three operational modes, advanced table features, bulk operations, and sophisticated state management. Built with React 19, TypeScript, shadcn/ui, and TanStack Table.

## Component Architecture

### Core Components

#### FileManager (`FileManager.tsx`)
**Purpose**: Main orchestration component managing three distinct workflows

```typescript
interface FileManagerProps {
  mode: 'draft-deal' | 'existing-deal' | 'library';
  draftId?: string;
  dealId?: string;
  onDraftSubmit?: (draftId: string) => void;
  onCancel?: () => void;
  allowSubmission?: boolean;
  showUpload?: boolean;
}
```

**Key Features**:
- **Mode-based rendering**: Different UI flows for each operational mode
- **State coordination**: Manages file lists, loading states, and error handling
- **Tab management**: Upload and metadata configuration tabs for draft mode
- **Auto-save integration**: localStorage persistence with conflict detection
- **Event handling**: Coordinates between child components

**Architecture Pattern**:
```typescript
const FileManager = ({ mode, draftId, dealId, ...props }) => {
  // State management
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  
  // API hooks
  const { createDraftDeal, uploadDraftFile } = useDraftDeals();
  const { getDealFiles, uploadDealFile } = useFileManagement();
  const { saveDraft, loadDraft } = useDraftPersistence();
  
  // Mode-specific rendering
  const renderModeContent = () => {
    switch (mode) {
      case 'draft-deal': return <DraftDealInterface />;
      case 'existing-deal': return <ExistingDealInterface />;
      case 'library': return <LibraryInterface />;
    }
  };
  
  return <div>{renderModeContent()}</div>;
};
```

#### FileUpload (`FileUpload.tsx`)
**Purpose**: Drag-and-drop file upload interface with validation

```typescript
interface FileUploadProps {
  files: UploadFile[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  maxFiles?: number;
  maxSize?: number;
  allowedTypes?: string[];
  disabled?: boolean;
}
```

**Key Features**:
- **Drag-and-drop zone**: Large, accessible drop area
- **File validation**: Type, size, count, and duplicate checking
- **Progress tracking**: Visual upload progress indicators
- **Error handling**: Per-file error states with retry options
- **Accessibility**: Keyboard navigation and screen reader support

**Validation Pipeline**:
```typescript
const validateFiles = useCallback((fileList: FileList): { valid: File[], errors: string[] } => {
  const files = Array.from(fileList);
  const valid: File[] = [];
  const errors: string[] = [];
  
  // Check file count
  if (existingFiles.length + files.length > maxFiles) {
    errors.push(`Maximum ${maxFiles} files allowed`);
    return { valid: [], errors };
  }
  
  files.forEach(file => {
    // Type validation
    if (!allowedTypes.includes(file.type)) {
      errors.push(`${file.name}: File type not allowed`);
      return;
    }
    
    // Size validation
    if (file.size > maxSize) {
      errors.push(`${file.name}: File too large`);
      return;
    }
    
    // Duplicate detection
    const isDuplicate = existingFiles.some(existing => 
      existing.name === file.name && existing.size === file.size
    );
    if (isDuplicate) {
      errors.push(`${file.name}: Duplicate file`);
      return;
    }
    
    valid.push(file);
  });
  
  return { valid, errors };
}, [existingFiles, maxFiles, maxSize, allowedTypes]);
```

#### FileTable (`FileTable.tsx`)
**Purpose**: Advanced data table with TanStack Table integration

```typescript
interface FileTableProps {
  files: FileTableData[];
  mode: 'draft' | 'deal' | 'library';
  dealId?: string;
  isLoading?: boolean;
  onFileUpdate: (fileId: string, data: any) => Promise<void>;
  onFileDelete: (fileId: string) => Promise<void>;
  onFileReprocess: (fileId: string) => Promise<void>;
  onFileDownload: (fileId: string) => Promise<void>;
  onBulkDelete: (fileIds: string[]) => Promise<void>;
  onBulkUpdate: (fileIds: string[], data: any) => Promise<void>;
  onBulkReprocess: (fileIds: string[]) => Promise<void>;
  onFilesChange: () => Promise<void>;
}
```

**Key Features**:
- **Row selection**: Checkbox-based multi-select with bulk actions
- **Sorting**: Column sorting with visual indicators
- **Filtering**: Global search with debounced input
- **Pagination**: Configurable page sizes with navigation
- **Inline editing**: Cell-level editing with Popover components
- **Bulk operations**: Selection-based batch actions

**Column Architecture**:
```typescript
const columns: ColumnDef<FileTableData>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={table.toggleAllPageRowsSelected}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={row.toggleSelected}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const file = row.original;
      return (
        <div className="flex items-center gap-2">
          <FileIcon type={file.file_type} />
          <span className="font-medium">{file.name}</span>
          <StatusBadge status={file.processing_status} />
        </div>
      );
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <InlineEditCell
        value={row.original.category}
        onSave={(value) => handleFileUpdate(row.original.uuid, { category: value })}
        type="select"
        options={CATEGORY_OPTIONS}
      />
    ),
  },
  // Additional columns...
];
```

#### FileMetadataForm (`FileMetadataForm.tsx`)
**Purpose**: Form for configuring deal and file metadata with validation

```typescript
interface FileMetadataFormProps {
  files: UploadFile[];
  onSubmit: (data: DealFormData) => Promise<void>;
  onSaveDraft: (data: DealFormData) => Promise<void>;
  onCancel: () => void;
  onFormChange: (data: DealFormData) => void;
  isSubmitting?: boolean;
  isDraftSaving?: boolean;
  initialData?: Partial<DealFormData>;
}
```

**Key Features**:
- **React Hook Form**: Comprehensive form state management
- **Zod validation**: Schema-based validation with TypeScript inference
- **Per-file metadata**: Individual file configuration sections
- **Auto-save integration**: Form change tracking for draft persistence
- **Real-time validation**: Debounced validation with immediate feedback

**Form Schema**:
```typescript
const dealFormSchema = z.object({
  name: z.string().min(1, "Deal name is required").max(100, "Name too long"),
  description: z.string().max(1000, "Description too long").optional(),
  website: z.string().url("Must be valid URL").optional().or(z.literal("")),
  fundingTarget: z.string().optional(),
  files: z.array(z.object({
    id: z.string(),
    category: z.string().min(1, "Category is required"),
    documentType: z.string().optional(),
    proprietary: z.boolean().default(false),
    tldr: z.string().max(500, "Summary too long").optional(),
    tags: z.array(z.string()).max(10, "Maximum 10 tags").default([])
  })).min(1, "At least one file required").max(20, "Maximum 20 files")
});
```

### Supporting Components

#### FileActionsMenu (`FileActionsMenu.tsx`)
**Purpose**: Context menu for individual file actions

**Key Features**:
- **Status-aware actions**: Different actions based on processing status
- **Conditional rendering**: Show/hide actions based on file state and permissions
- **Confirmation dialogs**: Safety confirmations for destructive actions
- **Keyboard accessibility**: Full keyboard navigation support

#### BulkMetadataDialog (`BulkMetadataDialog.tsx`)
**Purpose**: Modal for bulk editing file metadata

**Key Features**:
- **Batch editing**: Update metadata for multiple files simultaneously
- **Current value display**: Show existing values for selected files
- **Partial updates**: Only update changed fields
- **Validation**: Same validation rules as individual file editing

#### BulkDeleteConfirmDialog (`BulkDeleteConfirmDialog.tsx`)
**Purpose**: Safety confirmation for bulk file deletion

**Key Features**:
- **File preview**: Show which files will be deleted
- **Impact assessment**: Display consequences of deletion
- **Safety measures**: Clear confirmation requirements
- **Progress tracking**: Show deletion progress for large batches

#### InlineEditCell (`InlineEditCell.tsx`)
**Purpose**: Table cell with inline editing capability

```typescript
interface InlineEditCellProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  type: 'text' | 'select' | 'boolean';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  validation?: (value: string) => string | undefined;
}
```

**Key Features**:
- **Popover editing**: Non-intrusive editing interface
- **Type support**: Text, select, and boolean field types
- **Validation**: Real-time validation during editing
- **Save/cancel**: Clear save and cancel actions
- **Loading states**: Visual feedback during save operations

## API Integration

### Custom Hooks

#### useDraftDeals (`hooks/useDraftDeals.ts`)
**Purpose**: Draft deal operations and workflow management

```typescript
export const useDraftDeals = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDraftDeal = useCallback(async (data: CreateDraftDealRequest): Promise<DraftDeal> => {
    setIsLoading(true);
    try {
      const response = await http.post<DraftDeal>('/deals/draft_deals/', data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to create draft deal';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Additional methods...
  
  return {
    createDraftDeal,
    updateDraftDeal,
    uploadDraftFile,
    finalizeDraftDeal,
    getDraftDeal,
    deleteDraftDeal,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};
```

#### useFileManagement (`hooks/useFileManagement.ts`)
**Purpose**: File CRUD operations for deals and library

**Key Methods**:
- **getDealFiles**: Paginated file listing with filters
- **uploadDealFile**: File upload with progress tracking
- **updateDealFile**: Metadata updates
- **deleteDealFile**: File deletion
- **reprocessDealFile**: Trigger file reprocessing
- **bulkOperations**: Batch operations for multiple files

#### useDraftPersistence (`hooks/useDraftPersistence.ts`)
**Purpose**: localStorage-based draft state management

```typescript
export const useDraftPersistence = (draftId?: string, options: DraftPersistenceOptions = {}) => {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const saveDraft = useCallback(async (state: Omit<DraftState, 'draftId' | 'lastSaved' | 'version'>): Promise<void> => {
    // Implementation with version control and conflict detection
  }, []);
  
  const loadDraft = useCallback((id: string = currentDraftId): DraftState | null => {
    // Implementation with expiration checking
  }, []);
  
  const checkForConflicts = useCallback((): { hasConflict: boolean; conflictVersion?: number } => {
    // Cross-tab conflict detection
  }, []);
  
  return {
    saveDraft,
    loadDraft,
    deleteDraft,
    scheduleAutoSave,
    getAllDrafts,
    clearAllDrafts,
    checkForConflicts,
    currentDraftId,
    isAutoSaving,
    lastSaved,
    error,
    clearError: () => setError(null)
  };
};
```

## State Management

### Draft Persistence Architecture

#### Storage Strategy
```typescript
interface DraftState {
  draftId: string;
  dealName: string;
  description?: string;
  website?: string;
  fundingTarget?: string;
  files: FileMetadata[];
  lastSaved: number;
  version: number;
}

const STORAGE_KEYS = {
  PREFIX: 'brain_draft_deal_',
  INDEX: 'brain_draft_deals_index',
};
```

#### Auto-save Implementation
```typescript
const scheduleAutoSave = useCallback((state: Omit<DraftState, 'draftId' | 'lastSaved' | 'version'>) => {
  if (autoSaveTimer.current) {
    clearTimeout(autoSaveTimer.current);
  }
  
  autoSaveTimer.current = setTimeout(() => {
    autoSave(state);
  }, options.autoSaveInterval);
}, [autoSave, options.autoSaveInterval]);

const autoSave = useCallback(async (state: Omit<DraftState, 'draftId' | 'lastSaved' | 'version'>) => {
  // Change detection to prevent unnecessary saves
  if (lastDraftState.current) {
    const currentStateString = JSON.stringify(state);
    const lastStateString = JSON.stringify({
      dealName: lastDraftState.current.dealName,
      description: lastDraftState.current.description,
      website: lastDraftState.current.website,
      fundingTarget: lastDraftState.current.fundingTarget,
      files: lastDraftState.current.files,
    });
    
    if (currentStateString === lastStateString) {
      return; // No changes to save
    }
  }

  setIsAutoSaving(true);
  try {
    await saveDraft(state);
  } catch (error) {
    console.warn('Auto-save failed:', error);
  } finally {
    setIsAutoSaving(false);
  }
}, [saveDraft]);
```

#### Conflict Detection
```typescript
const checkForConflicts = useCallback((): { hasConflict: boolean; conflictVersion?: number } => {
  if (!lastDraftState.current) return { hasConflict: false };
  
  const storedDraft = loadDraft(currentDraftId);
  if (!storedDraft) return { hasConflict: false };
  
  const hasConflict = storedDraft.version > lastDraftState.current.version;
  return {
    hasConflict,
    conflictVersion: hasConflict ? storedDraft.version : undefined,
  };
}, [currentDraftId, loadDraft]);
```

### File Upload State Management

#### Upload File Interface
```typescript
interface UploadFile {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  category?: string;
  documentType?: string;
  proprietary?: boolean;
  tldr?: string;
  tags?: string[];
  error?: string;
}
```

#### State Updates Pattern
```typescript
const updateFileStatus = useCallback((fileId: string, updates: Partial<UploadFile>) => {
  setFiles(prev => prev.map(file => 
    file.id === fileId ? { ...file, ...updates } : file
  ));
}, []);

const handleUploadProgress = useCallback((fileId: string, progress: number) => {
  updateFileStatus(fileId, { progress });
}, [updateFileStatus]);

const handleUploadComplete = useCallback((fileId: string) => {
  updateFileStatus(fileId, { status: 'completed', progress: 100 });
}, [updateFileStatus]);

const handleUploadError = useCallback((fileId: string, error: string) => {
  updateFileStatus(fileId, { status: 'error', error });
}, [updateFileStatus]);
```

## User Experience Patterns

### Progressive Disclosure

#### Tabbed Interface (Draft Mode)
```typescript
const DraftModeInterface = () => (
  <Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="upload">Upload Files</TabsTrigger>
      <TabsTrigger value="metadata" disabled={files.length === 0}>
        Configure Details ({files.length})
      </TabsTrigger>
    </TabsList>

    <TabsContent value="upload">
      <FileUpload 
        files={files}
        onFilesAdd={handleFileAdd}
        onFileRemove={handleFileRemove}
      />
    </TabsContent>

    <TabsContent value="metadata">
      <FileMetadataForm 
        files={files}
        onSubmit={handleDraftSubmit}
        onSaveDraft={handleSaveDraft}
      />
    </TabsContent>
  </Tabs>
);
```

#### Table View (Existing Deal/Library Mode)
```typescript
const TableModeInterface = () => (
  <Tabs defaultValue="files">
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="files">
        Manage Files ({files.length})
      </TabsTrigger>
      <TabsTrigger value="upload">
        Add Files
      </TabsTrigger>
    </TabsList>

    <TabsContent value="files">
      <FileTable 
        files={files}
        mode={mode}
        onFileUpdate={handleFileUpdate}
        onBulkDelete={handleBulkDelete}
      />
    </TabsContent>

    <TabsContent value="upload">
      <FileUpload 
        files={[]}
        onFilesAdd={handleUploadToExistingMode}
      />
    </TabsContent>
  </Tabs>
);
```

### Loading States

#### Skeleton Loading
```typescript
const FileTableSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-4 w-[60px]" />
      </div>
    ))}
  </div>
);
```

#### Progress Indicators
```typescript
const UploadProgress = ({ file }: { file: UploadFile }) => {
  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-200';
      case 'uploading': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-200';
    }
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(file.status)}`}
        style={{ width: `${file.progress}%` }}
      />
    </div>
  );
};
```

### Error Handling UI

#### Validation Error Display
```typescript
const ValidationErrorDisplay = ({ errors }: { errors: FieldErrors<DealFormData> }) => (
  <div className="space-y-2">
    {Object.entries(errors).map(([field, error]) => (
      <div key={field} className="text-sm text-red-600">
        <strong>{field}:</strong> {error?.message}
      </div>
    ))}
  </div>
);
```

#### Conflict Resolution UI
```typescript
const ConflictResolutionDialog = ({ 
  isOpen, 
  onResolve 
}: { 
  isOpen: boolean; 
  onResolve: (action: 'keep_local' | 'use_remote') => void; 
}) => (
  <AlertDialog open={isOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Draft Conflict Detected</AlertDialogTitle>
        <AlertDialogDescription>
          Your draft has been modified in another tab. What would you like to do?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => onResolve('keep_local')}>
          Keep My Changes
        </AlertDialogCancel>
        <AlertDialogAction onClick={() => onResolve('use_remote')}>
          Use Other Version
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
```

## Accessibility Implementation

### Keyboard Navigation

#### Table Navigation
```typescript
const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      // Navigate to previous row
      break;
    case 'ArrowDown':
      event.preventDefault();
      // Navigate to next row
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      // Toggle row selection or activate action
      break;
    case 'Escape':
      // Cancel current action or close dialogs
      break;
  }
}, []);
```

#### Screen Reader Support
```typescript
const FileTableRow = ({ file, isSelected }: { file: FileTableData; isSelected: boolean }) => (
  <tr 
    role="row"
    aria-selected={isSelected}
    aria-describedby={`file-${file.uuid}-description`}
  >
    <td role="gridcell">
      <Checkbox
        checked={isSelected}
        aria-label={`Select ${file.name}`}
        aria-describedby={`file-${file.uuid}-description`}
      />
    </td>
    <td role="gridcell">
      <div id={`file-${file.uuid}-description`}>
        {file.name} - {file.file_type} - {formatFileSize(file.file_size)}
      </div>
    </td>
    {/* Additional cells */}
  </tr>
);
```

### ARIA Labels and Descriptions

#### Upload Area
```typescript
const FileUploadArea = () => (
  <div
    role="button"
    tabIndex={0}
    aria-label="File upload area. Click or drag files here to upload."
    aria-describedby="upload-instructions"
    onKeyDown={handleKeyDown}
    className="border-2 border-dashed border-gray-300 rounded-lg p-8"
  >
    <div id="upload-instructions" className="text-center">
      <p>Drag and drop files here, or click to select files</p>
      <p className="text-sm text-gray-500">
        Supported formats: PDF, DOC, DOCX, TXT, MD (max 50MB each)
      </p>
    </div>
  </div>
);
```

## Performance Optimization

### Component Memoization

#### Expensive Component Rendering
```typescript
const FileTableRow = React.memo(({ file, isSelected, onUpdate }: FileTableRowProps) => {
  // Expensive rendering logic
  return (
    <tr>
      {/* Row content */}
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return (
    prevProps.file.uuid === nextProps.file.uuid &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.file.processing_status === nextProps.file.processing_status
  );
});
```

#### Callback Optimization
```typescript
const FileManager = () => {
  const handleFileUpdate = useCallback((fileId: string, data: any) => {
    return updateDealFile(fileId, data);
  }, [updateDealFile]);
  
  const handleBulkDelete = useCallback((fileIds: string[]) => {
    return bulkDeleteFiles(fileIds, mode);
  }, [bulkDeleteFiles, mode]);
  
  // Memoized column definitions
  const columns = useMemo(() => createColumns({
    onFileUpdate: handleFileUpdate,
    onFileDelete: handleFileDelete,
    onFileReprocess: handleFileReprocess,
  }), [handleFileUpdate, handleFileDelete, handleFileReprocess]);
  
  return (
    <FileTable
      files={files}
      columns={columns}
      onBulkDelete={handleBulkDelete}
    />
  );
};
```

### Virtual Scrolling (Future Enhancement)

```typescript
const VirtualizedFileTable = () => {
  const rowVirtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <FileTableRow file={files[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Testing Patterns

### Component Testing

#### File Upload Testing
```typescript
describe('FileUpload', () => {
  it('validates file types correctly', () => {
    const onFilesAdd = jest.fn();
    render(<FileUpload files={[]} onFilesAdd={onFilesAdd} allowedTypes={['application/pdf']} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-executable' });
    
    // Test valid file
    fireEvent.drop(screen.getByRole('button'), {
      dataTransfer: { files: [file] }
    });
    expect(onFilesAdd).toHaveBeenCalledWith([file]);
    
    // Test invalid file
    fireEvent.drop(screen.getByRole('button'), {
      dataTransfer: { files: [invalidFile] }
    });
    expect(screen.getByText(/File type not allowed/)).toBeInTheDocument();
  });
});
```

#### Form Validation Testing
```typescript
describe('FileMetadataForm', () => {
  it('validates deal name requirement', async () => {
    const onSubmit = jest.fn();
    render(<FileMetadataForm files={mockFiles} onSubmit={onSubmit} />);
    
    // Try to submit without deal name
    fireEvent.click(screen.getByText('Submit for Underwriting'));
    
    await waitFor(() => {
      expect(screen.getByText('Deal name is required')).toBeInTheDocument();
    });
    
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

### Integration Testing

#### Draft Persistence Testing
```typescript
describe('Draft Persistence Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('auto-saves draft state and recovers on reload', async () => {
    const { rerender } = render(<FileManager mode="draft-deal" />);
    
    // Add file and fill form
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.drop(screen.getByRole('button'), {
      dataTransfer: { files: [file] }
    });
    
    fireEvent.change(screen.getByLabelText('Deal Name'), {
      target: { value: 'Test Deal' }
    });
    
    // Wait for auto-save
    await waitFor(() => {
      expect(localStorage.getItem).toHaveBeenCalled();
    }, { timeout: 31000 });
    
    // Simulate page reload
    rerender(<FileManager mode="draft-deal" />);
    
    // Verify state recovery
    expect(screen.getByDisplayValue('Test Deal')).toBeInTheDocument();
  });
});
```

## Browser Compatibility

### File API Support
```typescript
const checkFileAPISupport = (): boolean => {
  return !!(
    window.File &&
    window.FileReader &&
    window.FileList &&
    window.Blob &&
    window.FormData
  );
};

const checkDragDropSupport = (): boolean => {
  const div = document.createElement('div');
  return (
    ('draggable' in div) ||
    ('ondragstart' in div && 'ondrop' in div)
  );
};
```

### Progressive Enhancement
```typescript
const FileUploadWithFallback = () => {
  const [supportsFileAPI] = useState(() => checkFileAPISupport());
  const [supportsDragDrop] = useState(() => checkDragDropSupport());
  
  if (!supportsFileAPI) {
    return (
      <div className="text-center p-8">
        <p>Your browser doesn't support file uploads.</p>
        <p>Please use a modern browser like Chrome, Firefox, or Safari.</p>
      </div>
    );
  }
  
  return (
    <div>
      {supportsDragDrop ? (
        <DragDropUploadArea />
      ) : (
        <SimpleFileInput />
      )}
    </div>
  );
};
```

## Deployment Considerations

### Bundle Optimization

#### Code Splitting
```typescript
// Lazy load heavy components
const BulkMetadataDialog = lazy(() => import('./BulkMetadataDialog'));
const FileTable = lazy(() => import('./FileTable'));

const FileManager = () => {
  return (
    <Suspense fallback={<FileManagerSkeleton />}>
      {mode === 'existing-deal' && <FileTable />}
      {showBulkDialog && <BulkMetadataDialog />}
    </Suspense>
  );
};
```

#### Tree Shaking
```typescript
// Import only needed functions
import { formatFileSize } from '@/lib/utils/fileUtils';
import { validateFileType } from '@/lib/utils/validation';

// Avoid importing entire libraries
import debounce from 'lodash/debounce';  // Good
import _ from 'lodash';                   // Bad
```

### Environment Configuration

#### Development
```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

const config = {
  autoSaveInterval: isDevelopment ? 10000 : 30000,
  maxFileSize: isDevelopment ? 10 * 1024 * 1024 : 50 * 1024 * 1024,
  enableDetailedLogging: isDevelopment,
  enableDragDropDebugging: isDevelopment,
};
```

## Conclusion

The File Manager Components represent a sophisticated frontend implementation supporting complex file management workflows. The architecture prioritizes maintainability, accessibility, performance, and user experience while providing comprehensive functionality for three distinct operational modes.

Key architectural decisions include:
- **Mode-based component design** for code reuse and maintainability
- **Comprehensive state management** with localStorage persistence and conflict resolution  
- **Advanced table implementation** with TanStack Table for enterprise-grade data management
- **Robust validation framework** using React Hook Form and Zod for type-safe validation
- **Accessibility-first design** with comprehensive ARIA support and keyboard navigation
- **Performance optimization** through memoization, lazy loading, and efficient rendering patterns

The system serves as a foundation for future file management needs across the platform and demonstrates best practices for complex React component architecture.