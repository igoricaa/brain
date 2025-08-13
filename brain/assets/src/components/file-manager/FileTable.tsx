import React, { useState, useCallback, useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type RowSelectionState,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Download,
  Edit,
  Trash2,
  RotateCcw,
  FileText,
  Image,
  FileSpreadsheet,
  FileType,
  File,
  Search,
  Filter,
  X,
} from 'lucide-react';
import InlineEditCell from './InlineEditCell';
import BulkMetadataDialog from './BulkMetadataDialog';
import BulkDeleteConfirmDialog from './BulkDeleteConfirmDialog';

export interface FileTableData {
  uuid: string;
  name: string;
  file_type: string;
  file_size: number;
  category: string;
  document_type?: string;
  proprietary: boolean;
  tldr?: string;
  tags: string[];
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
  download_url?: string;
}

export interface FileTableProps {
  files: FileTableData[];
  mode: 'deal' | 'library';
  dealId?: string;
  isLoading?: boolean;
  onFileUpdate?: (fileId: string, data: Partial<FileTableData>) => Promise<void>;
  onFileDelete?: (fileId: string) => Promise<void>;
  onFileReprocess?: (fileId: string) => Promise<void>;
  onFileDownload?: (fileId: string) => void;
  onBulkDelete?: (fileIds: string[]) => Promise<void>;
  onBulkUpdate?: (fileIds: string[], data: Partial<FileTableData>) => Promise<void>;
  onBulkReprocess?: (fileIds: string[]) => Promise<void>;
  onFilesChange?: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
  if (type.includes('image')) return <Image className="h-4 w-4 text-blue-500" />;
  if (type.includes('spreadsheet') || type.includes('excel')) 
    return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
  if (type.includes('document') || type.includes('word')) 
    return <FileType className="h-4 w-4 text-blue-600" />;
  return <File className="h-4 w-4 text-gray-500" />;
};

const getStatusBadge = (status: FileTableData['processing_status']) => {
  const variants = {
    pending: { variant: 'secondary' as const, label: 'Pending' },
    processing: { variant: 'default' as const, label: 'Processing' },
    completed: { variant: 'default' as const, label: 'Completed', className: 'bg-green-100 text-green-800' },
    failed: { variant: 'destructive' as const, label: 'Failed' },
    cancelled: { variant: 'outline' as const, label: 'Cancelled' },
  };
  
  const config = variants[status];
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
};

const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

export default function FileTable({
  files,
  mode,
  dealId,
  isLoading = false,
  onFileUpdate,
  onFileDelete,
  onFileReprocess,
  onFileDownload,
  onBulkDelete,
  onBulkUpdate,
  onBulkReprocess,
  onFilesChange,
}: FileTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [bulkMetadataDialogOpen, setBulkMetadataDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const selectedFileIds = useMemo(() => {
    return Object.keys(rowSelection).filter(key => rowSelection[key]);
  }, [rowSelection]);

  const selectedFileObjects = useMemo(() => {
    return files.filter(file => selectedFileIds.includes(file.uuid));
  }, [files, selectedFileIds]);

  const handleFileAction = useCallback(async (
    action: 'update' | 'delete' | 'reprocess' | 'download',
    fileId: string,
    data?: Partial<FileTableData>
  ) => {
    try {
      switch (action) {
        case 'update':
          if (onFileUpdate && data) {
            await onFileUpdate(fileId, data);
            onFilesChange?.();
          }
          break;
        case 'delete':
          if (onFileDelete) {
            await onFileDelete(fileId);
            onFilesChange?.();
          }
          break;
        case 'reprocess':
          if (onFileReprocess) {
            await onFileReprocess(fileId);
            onFilesChange?.();
          }
          break;
        case 'download':
          if (onFileDownload) {
            onFileDownload(fileId);
          }
          break;
      }
    } catch (error) {
      console.error(`Error ${action}ing file:`, error);
    }
  }, [onFileUpdate, onFileDelete, onFileReprocess, onFileDownload, onFilesChange]);

  const handleBulkAction = useCallback(async (
    action: 'delete' | 'update' | 'reprocess',
    data?: Partial<FileTableData>
  ) => {
    if (selectedFileIds.length === 0) return;

    try {
      switch (action) {
        case 'delete':
          setBulkDeleteDialogOpen(true);
          break;
        case 'update':
          setBulkMetadataDialogOpen(true);
          break;
        case 'reprocess':
          if (onBulkReprocess) {
            await onBulkReprocess(selectedFileIds);
            setRowSelection({});
            onFilesChange?.();
          }
          break;
      }
    } catch (error) {
      console.error(`Error ${action}ing files:`, error);
    }
  }, [selectedFileIds, onBulkReprocess, onFilesChange]);

  const handleBulkMetadataSubmit = useCallback(async (data: any) => {
    if (onBulkUpdate && selectedFileIds.length > 0) {
      await onBulkUpdate(selectedFileIds, data);
      setRowSelection({});
      onFilesChange?.();
    }
  }, [onBulkUpdate, selectedFileIds, onFilesChange]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (onBulkDelete && selectedFileIds.length > 0) {
      await onBulkDelete(selectedFileIds);
      setRowSelection({});
      onFilesChange?.();
    }
  }, [onBulkDelete, selectedFileIds, onFilesChange]);

  const handleInlineEdit = useCallback(async (fileId: string, field: string, value: any) => {
    if (onFileUpdate) {
      await onFileUpdate(fileId, { [field]: value });
      onFilesChange?.();
    }
  }, [onFileUpdate, onFilesChange]);

  const columns = useMemo<ColumnDef<FileTableData>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 lg:px-3"
        >
          Filename
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          {getFileIcon(row.original.file_type)}
          <span className="font-medium truncate max-w-[200px]" title={row.original.name}>
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'file_type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.file_type.split('/')[1]?.toUpperCase() || 'Unknown'}
        </span>
      ),
    },
    {
      accessorKey: 'file_size',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 lg:px-3"
        >
          Size
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm">{formatFileSize(row.original.file_size)}</span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <InlineEditCell
          file={row.original}
          field="category"
          value={row.original.category}
          onSave={handleInlineEdit}
          disabled={row.original.processing_status === 'processing'}
        />
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'document_type',
      header: 'Document Type',
      cell: ({ row }) => (
        <InlineEditCell
          file={row.original}
          field="document_type"
          value={row.original.document_type}
          onSave={handleInlineEdit}
          disabled={row.original.processing_status === 'processing'}
        />
      ),
    },
    {
      accessorKey: 'processing_status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.processing_status),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 lg:px-3"
        >
          Added
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatRelativeDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <InlineEditCell
            file={row.original}
            field="proprietary"
            value={row.original.proprietary}
            onSave={handleInlineEdit}
            disabled={row.original.processing_status === 'processing'}
            className="mr-2"
          />
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => handleFileAction('download', row.original.uuid)}
            disabled={!row.original.download_url}
          >
            <Download className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleFileAction('update', row.original.uuid)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit metadata
              </DropdownMenuItem>
              {(row.original.processing_status === 'failed' || row.original.processing_status === 'cancelled') && (
                <DropdownMenuItem
                  onClick={() => handleFileAction('reprocess', row.original.uuid)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reprocess
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleFileAction('delete', row.original.uuid)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [handleFileAction]);

  const table = useReactTable({
    data: files,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getRowId: (row) => row.uuid,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading files...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No files yet</h3>
            <p className="text-muted-foreground">
              {mode === 'deal' ? 'Upload files to this deal to get started' : 'Upload files to the knowledge base to get started'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-8 w-[200px] lg:w-[250px]"
            />
          </div>
          {globalFilter && (
            <Button
              variant="ghost"
              onClick={() => setGlobalFilter('')}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} of {table.getCoreRowModel().rows.length} files
          </span>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedFileIds.length > 0 && (
        <Alert>
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {selectedFileIds.length} file{selectedFileIds.length === 1 ? '' : 's'} selected
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('reprocess')}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reprocess
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('update')}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkAction('delete')}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="h-8 w-[70px] rounded shadow-sm bg-background px-3 py-1 text-sm"
            >
              {[25, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Operation Dialogs */}
      <BulkMetadataDialog
        open={bulkMetadataDialogOpen}
        onOpenChange={setBulkMetadataDialogOpen}
        selectedFiles={selectedFileObjects}
        mode={mode}
        onSubmit={handleBulkMetadataSubmit}
        isSubmitting={isLoading}
      />

      <BulkDeleteConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedFiles={selectedFileObjects}
        mode={mode}
        onConfirm={handleBulkDeleteConfirm}
        isDeleting={isLoading}
      />
    </div>
  );
}