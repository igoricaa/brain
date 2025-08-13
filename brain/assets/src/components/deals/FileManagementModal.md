# FileManagementModal Component

A comprehensive file management modal for deal details with support for three file types: decks, papers, and other files.

## Features

### Core Functionality
- **File Type Organization**: Separate tabs for Decks, Papers, and Other Files
- **Upload Support**: Drag and drop interface with file validation
- **File Operations**: Download, delete, and reprocess files
- **Status Tracking**: Visual indicators for file processing status
- **New File Detection**: Highlights files added since last assessment

### File Management
- **File Validation**: Type, size (15MB max), and duplicate checking
- **Progress Tracking**: Real-time upload progress with status updates
- **Error Handling**: Comprehensive error display with retry options
- **CSRF Protection**: Automatic CSRF token handling for security

### User Interface
- **Tabbed Interface**: Clean organization across file types
- **Search Functionality**: Filter files by name within each tab
- **Actions Menu**: Context menu for file operations
- **Confirmation Dialogs**: Safety confirmations for destructive actions
- **Toast Notifications**: User-friendly feedback for all operations

## Props Interface

```typescript
interface FileManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealUuid: string;
  dealName: string;
  lastAssessmentDate?: string;
}
```

## Usage Example

```typescript
import { FileManagementModal } from '@/components/deals/FileManagementModal';

function DealDetailPage() {
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setIsFileModalOpen(true)}>
        Edit Files
      </Button>
      
      <FileManagementModal
        isOpen={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        dealUuid={deal.uuid}
        dealName={deal.name}
        lastAssessmentDate={deal.last_assessment_created_at}
      />
    </>
  );
}
```

## API Integration

### Endpoints Used
- `GET /api/deals/decks/?deal={uuid}` - Fetch deal decks
- `GET /api/deals/papers/?deal={uuid}` - Fetch deal papers  
- `GET /api/deals/files/?deal={uuid}` - Fetch deal files
- `POST /api/deals/files/` - Upload new files
- `DELETE /api/deals/{type}/{uuid}/` - Delete specific files
- `POST /api/deals/{type}/{uuid}/reprocess/` - Reprocess files

### Data Flow
1. **Load Files**: On modal open, fetch all file types in parallel
2. **Upload Files**: Validate and upload with progress tracking
3. **File Operations**: Delete/reprocess with optimistic updates
4. **Cache Invalidation**: Refresh data after mutations

## File Types and Validation

### Supported File Types
- PDF (application/pdf)
- Word Documents (application/msword, .docx)
- Text Files (text/plain, text/markdown)

### Validation Rules
- **Size Limit**: 15MB per file
- **Type Checking**: Client-side MIME type validation
- **Duplicate Detection**: Based on filename and size
- **Count Limits**: No hard limit, but practical UX considerations

## State Management

### TanStack Query Integration
```typescript
// File listing with caching
const { data: decks } = useQuery({
  queryKey: ['deal-decks', dealUuid],
  queryFn: () => http.get(`/deals/decks/?deal=${dealUuid}`),
  enabled: isOpen,
});

// File operations with cache invalidation
const deleteMutation = useMutation({
  mutationFn: ({ fileId, type }) => http.delete(`/deals/${type}/${fileId}/`),
  onSuccess: () => {
    queryClient.invalidateQueries(['deal-decks', dealUuid]);
    queryClient.invalidateQueries(['deal-papers', dealUuid]);
    queryClient.invalidateQueries(['deal-files', dealUuid]);
  },
});
```

### Upload Progress Tracking
```typescript
interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}
```

## Accessibility Features

### Keyboard Navigation
- Full keyboard support for all interactive elements
- Tab order follows logical flow
- Escape key closes modal

### Screen Reader Support
- ARIA labels on all form controls
- File status announcements
- Progress updates for uploads

### Visual Design
- Clear visual hierarchy
- Consistent with shadcn/ui design system
- Responsive layout for different screen sizes

## Error Handling

### Validation Errors
- File type validation with user-friendly messages
- Size limit warnings
- Duplicate file detection

### Network Errors
- HTTP error parsing with DRF error formatting
- Toast notifications for all error states
- Retry mechanisms for failed uploads

### Recovery Patterns
- Graceful degradation for API failures
- Clear error messages with actionable guidance
- Non-blocking error states (operations can continue)

## Performance Considerations

### Optimization Strategies
- Lazy loading of file data (only when modal opens)
- Efficient re-rendering with React.memo patterns
- Debounced search input (300ms)
- Optimistic updates for better perceived performance

### Bundle Impact
- Component is code-split as part of deal_detail chunk
- Uses existing UI components (minimal bundle increase)
- TanStack Query provides efficient caching

## Integration Requirements

### Dependencies
- TanStack Query v5 for data fetching
- Zod for client-side validation
- Sonner for toast notifications
- shadcn/ui components for consistent styling

### Setup Requirements
```typescript
// Required providers in parent component
<QueryClientProvider client={queryClient}>
  <YourComponent />
  <Toaster />
</QueryClientProvider>
```

## Security Considerations

### CSRF Protection
- Automatic CSRF token extraction from cookies
- Proper token inclusion in POST/DELETE requests
- Credentials sent with all requests

### File Upload Security
- Client-side type validation (first line of defense)
- Size limits to prevent abuse
- Server-side validation should still be implemented

## Future Enhancements

### Planned Features
- Bulk file operations (select multiple files)
- File metadata editing (title, description, tags)
- File preview/viewer integration
- Advanced filtering and sorting options

### Technical Improvements
- WebSocket integration for real-time processing status
- Virtual scrolling for large file lists
- File chunking for large uploads
- Offline support with IndexedDB caching

## Testing Recommendations

### Unit Tests
- File validation logic
- Upload progress tracking
- Error state handling
- Modal open/close behavior

### Integration Tests
- API interaction patterns
- Cache invalidation flows
- Error recovery scenarios
- File upload end-to-end flow

### Accessibility Tests
- Keyboard navigation paths
- Screen reader compatibility
- Focus management
- ARIA attribute correctness