# File Manager Components - Frontend Guide

## Overview

Frontend components implementing a comprehensive file management system with three operational modes, advanced table features, bulk operations, and sophisticated state management. Built with React 19, TypeScript, shadcn/ui, and TanStack Table.

**Recent Updates (Dec 2025)**: 
- **Draft Loading Fix**: Complete draft management with load/edit/continue workflow
- **Workflow Simplification**: Removed complex forms, deal name requirements, and metadata configuration
- **Backend Integration**: Immediate file upload and backend persistence with existing file management

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
- **Draft loading**: Initialize and load existing drafts with file management
- **State coordination**: Manages file lists, loading states, and error handling
- **Existing file display**: Shows previously uploaded files with remove capability
- **Smart button states**: Enable/disable based on new and existing files
- **Event handling**: Coordinates between child components

**Architecture Pattern**:
```typescript
const FileManager = ({ mode, draftId, dealId, ...props }) => {
  // State management
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [existingDraftFiles, setExistingDraftFiles] = useState<FileTableData[]>([]);
  
  // Initialize draft from prop
  useEffect(() => {
    if (mode === 'draft-deal' && dealId && dealId !== currentDraftId) {
      setCurrentDraftId(dealId);
    }
  }, [mode, dealId, currentDraftId]);
  
  // Load existing draft files
  useEffect(() => {
    const loadDraftFiles = async () => {
      if (mode === 'draft-deal' && currentDraftId) {
        const response = await getDealFiles(currentDraftId);
        setExistingDraftFiles(response.results);
      }
    };
    loadDraftFiles();
  }, [mode, currentDraftId, getDealFiles]);
  
  // API hooks
  const { createDraftDeal, uploadDraftFile } = useDraftDeals();
  const { getDealFiles, uploadDealFile } = useFileManagement();
  
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

## Draft Deal Workflow Evolution (Dec 2025)

### Complete Draft Management Cycle

#### 1. Draft Creation & Loading
- **New Draft**: Upload files to create fresh draft
- **Load Existing**: Select from saved drafts to continue editing
- **Seamless Transition**: Auto-load existing files when draft selected

#### 2. File Management Integration
- **Existing Files**: Display previously uploaded files with remove capability
- **New Files**: Add additional files to existing draft
- **Contextual UI**: Upload section adapts based on draft state

#### 3. Iterative Editing
- **Save Draft**: Upload new files, keep existing ones, stay on page
- **Continue Later**: All changes persisted in backend for later access
- **File Operations**: Remove existing files, add new ones, save incrementally

### Implementation Changes

#### Before: Complex Multi-Step Process
```typescript
// Complex interface with tabs, forms, and metadata
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="upload">Upload Files</TabsTrigger>
    <TabsTrigger value="metadata">Configure Details</TabsTrigger>
  </TabsList>
  
  <TabsContent value="metadata">
    <FileMetadataForm 
      schema={complexDealFormSchema}
      validation={realTimeValidation}
      files={files}
    />
  </TabsContent>
</Tabs>
```

#### After: Simplified Direct Upload
```typescript
// Simplified single-view interface
<div className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle>Upload Files for New Deal</CardTitle>
    </CardHeader>
    <CardContent>
      <FileUpload
        files={files}
        onFilesAdd={handleFileAdd}
        onFileRemove={handleFileRemove}
      />
    </CardContent>
  </Card>
  
  {/* Sticky bottom bar with save/submit actions */}
  <div className="fixed bottom-0 left-64 right-0 bg-white shadow-lg">
    <Button onClick={handleSimpleSaveDraft} disabled={files.length === 0}>
      Save Draft
    </Button>
    <Button onClick={handleSimpleSubmit} disabled={files.length === 0}>
      Submit for Underwriting  
    </Button>
  </div>
</div>
```

### Removed Components
These components are no longer used in the simplified draft workflow:

#### FileMetadataForm.tsx (Deprecated)
- **Purpose**: Complex form for deal and file metadata
- **Reason Removed**: Too complex for simplified workflow
- **Replaced By**: Direct file upload with default values

#### DraftSelectionDialog.tsx (Deprecated)  
- **Purpose**: Select existing drafts from localStorage
- **Reason Removed**: Backend-first approach eliminates localStorage dependence
- **Replaced By**: ManageDraftsDialog with backend API

#### useDraftPersistence.ts (Simplified)
- **Before**: Complex localStorage management with form state
- **After**: Minimal state tracking, backend handles persistence

### Updated Components

#### FileManager.tsx - Enhanced Draft Management
```typescript
// Draft loading and state management
useEffect(() => {
  if (mode === 'draft-deal' && dealId && dealId !== currentDraftId) {
    setCurrentDraftId(dealId);
  }
}, [mode, dealId, currentDraftId]);

useEffect(() => {
  const loadDraftFiles = async () => {
    if (mode === 'draft-deal' && currentDraftId) {
      const response = await getDealFiles(currentDraftId);
      setExistingDraftFiles(response.results);
    }
  };
  loadDraftFiles();
}, [mode, currentDraftId, getDealFiles]);

// Simplified save with existing file awareness
const handleSimpleSaveDraft = async () => {
  const draftDeal = currentDraftId ? { uuid: currentDraftId } : 
    await createDraftDeal({ name: 'Untitled Deal' });

  // Only upload new files (not re-upload existing ones)
  if (files.length > 0) {
    for (const file of files) {
      await uploadDraftFile(draftDeal.uuid, {
        file: file.file,
        category: 'other',
        proprietary: false,
    });
  }
  
  setFiles([]); // Clear after upload
  toast.success('Draft saved successfully');
  // No redirect - stay on page
};
```

#### Button Logic Simplification
```typescript
// Old: Complex validation dependencies  
disabled={!dealName.trim() || files.length === 0 || hasValidationErrors}

// New: Simple file count check
disabled={files.length === 0}
```

### Backend Integration Changes

#### API Calls Simplified
```typescript
// Old: Complex form data with validation
const formData = {
  name: dealName,
  description,
  website,
  fundingTarget,
  files: files.map(f => ({
    ...f,
    category,
    documentType,
    proprietary,
    tldr,
    tags
  }))
};

// New: Minimal data with defaults
const draftDeal = await createDraftDeal({ name: 'Untitled Deal' });
await uploadDraftFile(draftDeal.uuid, {
  file: file.file,
  category: 'other',
  proprietary: false,
});
```

### User Experience Improvements

#### Workflow Comparison
| Aspect | Before (Complex) | After (Simplified) |
|--------|------------------|-------------------|
| Steps | 4-5 steps with forms | 2 steps: select files → save/submit |
| Required Fields | Deal name, file categories | None (all defaults) |
| Validation | Complex schema validation | File count only |
| Save Behavior | Form submission → redirect | Upload → stay on page |
| Submit Behavior | Form submission → redirect | Upload → finalize → redirect |
| Error Handling | Field-level validation errors | Upload-level errors only |
| Progress Feedback | Form validation states | File upload progress |

#### Performance Benefits
1. **Faster workflow** - Eliminated form filling time
2. **Immediate feedback** - Files upload on save, not on submit
3. **Reduced complexity** - No form state management overhead
4. **Better error recovery** - Upload failures don't lose form data

#### Technical Benefits
1. **Smaller bundle** - Removed complex form validation libraries usage
2. **Simpler state** - Eliminated form state, validation state
3. **Better maintainability** - Fewer components to maintain
4. **Clearer data flow** - Direct file → API → response pattern

## Complete Draft Management Workflow (Dec 2025)

### End-to-End User Journey

#### 1. Draft Discovery & Selection
```typescript
// ManageDraftsDialog integration
<ManageDraftsDialog
  isOpen={isManageDraftsOpen}
  onSelectDraft={handleSelectDraft}  // Sets draftId in FileManager
  onCreateNew={handleCreateNew}      // Resets draftId to null
/>
```

#### 2. Draft Loading & File Display
```typescript
// FileManager automatically loads existing files
useEffect(() => {
  if (mode === 'draft-deal' && currentDraftId) {
    const response = await getDealFiles(currentDraftId);
    setExistingDraftFiles(response.results);
  }
}, [mode, currentDraftId]);

// UI shows both existing and new files
{existingDraftFiles.length > 0 && (
  <Card>
    <CardTitle>Previously Uploaded Files ({existingDraftFiles.length})</CardTitle>
    {existingDraftFiles.map(file => (
      <FileRow key={file.uuid} file={file} onRemove={handleExistingFileRemove} />
    ))}
  </Card>
)}
```

#### 3. File Operations
```typescript
// Add new files to existing draft
const handleFileAdd = (newFiles: File[]) => {
  setFiles(prev => [...prev, ...newFiles.map(toUploadFile)]);
};

// Remove existing files from backend
const handleExistingFileRemove = async (fileUuid: string) => {
  await deleteDealFile(fileUuid);
  setExistingDraftFiles(prev => prev.filter(f => f.uuid !== fileUuid));
};
```

#### 4. Smart Save Logic
```typescript
// Save only uploads new files, preserves existing
const handleSimpleSaveDraft = async () => {
  if (files.length > 0) {
    for (const file of files) {
      await uploadDraftFile(currentDraftId, file);
    }
    setFiles([]); // Clear new files after upload
    // Reload to show newly uploaded files in existing section
    const response = await getDealFiles(currentDraftId);
    setExistingDraftFiles(response.results);
  }
  toast.success(`Draft saved successfully (${existingDraftFiles.length + files.length} files)`);
};
```

#### 5. Button State Management
```typescript
// Buttons enabled when ANY files present (new OR existing)
const hasFiles = files.length > 0 || existingDraftFiles.length > 0;

<Button disabled={!hasFiles || isLoading}>Save Draft</Button>
<Button disabled={!hasFiles || isLoading}>Submit for Underwriting</Button>
```

### Migration Guide

For developers working with the file manager components:

#### Updating Existing Code
```typescript
// Remove these imports (no longer used)
import { FileMetadataForm } from './FileMetadataForm';
import { useDraftPersistence } from '@/hooks/useDraftPersistence'; 
import { dealFormSchema } from '@/lib/validation/dealFormSchema';

// Update FileManager props (simplified)
<FileManager
  mode="draft-deal"
  dealId={selectedDraftId}  // NEW: Pass draft ID to load existing files
  // Removed: formSchema, validationOptions, metadataConfig
  onDraftSubmit={handleDraftSubmit}
  onCancel={handleCancel}
/>
```

#### Testing Updates
```typescript
// Old test: Complex form validation
it('validates deal name requirement', async () => {
  // Form validation testing...
});

// New test: Simple file upload
it('uploads files on save draft', async () => {
  const mockFiles = [new File(['content'], 'test.pdf')];
  fireEvent.drop(uploadArea, { dataTransfer: { files: mockFiles } });
  fireEvent.click(screen.getByText('Save Draft'));
  
  await waitFor(() => {
    expect(mockUploadDraftFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        file: mockFiles[0],
        category: 'other',
        proprietary: false,
      })
    );
  });
});
```

This simplification represents a major UX improvement, reducing the deal creation workflow from a complex multi-step process to a streamlined file upload experience.