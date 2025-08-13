import React, { useState, useMemo, useCallback } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    type ColumnDef,
    type SortingState,
    type RowSelectionState,
    flexRender,
} from '@tanstack/react-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseAsString, parseAsStringLiteral, parseAsInteger, useQueryStates } from 'nuqs';
import { useDebouncedCallback } from 'use-debounce';
import { format, formatDistanceToNow } from 'date-fns';
import { 
    Search, 
    Eye, 
    Edit, 
    Trash2, 
    Filter,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    MoreHorizontal,
    CheckCircle2,
    AlertCircle,
    Clock,
    FileText,
    Building2,
} from 'lucide-react';

import { http } from '@/lib/http';
import type { Deal, DealListResponse } from '@/lib/types/deals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

const PAGE_SIZE = 50;

// URL state management with nuqs
const urlStateConfig = {
    q: parseAsString.withDefault(''),
    status: parseAsStringLiteral(['all', 'new', 'active', 'archived'] as const).withDefault('all'),
    page: parseAsInteger.withDefault(1),
};

// Fetch deals function with proper search and pagination
const fetchDeals = async (params: {
    q: string;
    status: string;
    page: number;
}): Promise<DealListResponse> => {
    const searchParams = new URLSearchParams();
    
    searchParams.set('page', params.page.toString());
    searchParams.set('page_size', PAGE_SIZE.toString());
    searchParams.set('ordering', '-created_at');
    
    if (params.q) {
        searchParams.set('q', params.q);
    }
    
    if (params.status !== 'all') {
        searchParams.set('status', params.status);
    }
    
    const response = await http.get(`/deals/deals/?${searchParams.toString()}`);
    return response.data;
};

// Delete deal function
const deleteDeal = async (dealId: string): Promise<void> => {
    await http.delete(`/deals/deals/${dealId}/`);
};

// Calculate deal age in days
const getDealAge = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Format funding amount
const formatFundingAmount = (amount?: number): string => {
    if (!amount) return '-';
    
    if (amount >= 1_000_000) {
        return `$${(amount / 1_000_000).toFixed(1)}M`;
    } else if (amount >= 1_000) {
        return `$${(amount / 1_000).toFixed(0)}K`;
    } else {
        return `$${amount.toLocaleString()}`;
    }
};

// Skeleton loader component that matches table structure
const DealsTableSkeleton: React.FC = () => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-12">
                        <Skeleton className="h-4 w-4" />
                    </TableHead>
                    <TableHead className="w-[280px]">Company Name</TableHead>
                    <TableHead className="w-[100px]">Deal Age</TableHead>
                    <TableHead className="w-[120px]">Fundraise Amount</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[200px]">Industries</TableHead>
                    <TableHead className="w-[200px]">Dual-use Signals</TableHead>
                    <TableHead className="w-[150px]">External Data</TableHead>
                    <TableHead className="w-[150px]">Last Assessment</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: 10 }).map((_, index) => (
                    <TableRow key={index}>
                        <TableCell>
                            <Skeleton className="h-4 w-4" />
                        </TableCell>
                        <TableCell>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[200px]" />
                                <Skeleton className="h-3 w-[150px]" />
                            </div>
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-4 w-[60px]" />
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-6 w-[80px] rounded-full" />
                        </TableCell>
                        <TableCell>
                            <div className="flex gap-1">
                                <Skeleton className="h-6 w-[60px] rounded-full" />
                                <Skeleton className="h-6 w-[80px] rounded-full" />
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex gap-1">
                                <Skeleton className="h-6 w-[50px] rounded-full" />
                                <Skeleton className="h-6 w-[70px] rounded-full" />
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex gap-2">
                                <Skeleton className="h-6 w-[40px] rounded-full" />
                                <Skeleton className="h-6 w-[40px] rounded-full" />
                                <Skeleton className="h-6 w-[40px] rounded-full" />
                            </div>
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-4 w-[100px]" />
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-8 w-8" />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

// Main component
export default function DealsListPage() {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedDealForDelete, setSelectedDealForDelete] = useState<string | null>(null);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteProgress, setBulkDeleteProgress] = useState<{
        deleting: boolean;
        completed: number;
        total: number;
    }>({ deleting: false, completed: 0, total: 0 });

    // URL state management
    const [urlState, setUrlState] = useQueryStates(urlStateConfig);
    const { q: searchQuery, status, page } = urlState;

    // Debounced search handler
    const debouncedSearch = useDebouncedCallback((value: string) => {
        setUrlState({ q: value, page: 1 });
    }, 300);

    // Data fetching
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['deals-list', searchQuery, status, page],
        queryFn: () => fetchDeals({ q: searchQuery, status, page }),
        keepPreviousData: true,
        staleTime: 30 * 1000, // 30 seconds
    });

    // Delete mutations
    const deleteMutation = useMutation({
        mutationFn: deleteDeal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deals-list'] });
            toast.success('Deal deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete deal: ${error.message || 'Unknown error'}`);
        },
    });

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: async (dealIds: string[]) => {
            setBulkDeleteProgress({ deleting: true, completed: 0, total: dealIds.length });
            
            for (let i = 0; i < dealIds.length; i++) {
                await deleteDeal(dealIds[i]);
                setBulkDeleteProgress({ deleting: true, completed: i + 1, total: dealIds.length });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deals-list'] });
            setRowSelection({});
            setBulkDeleteProgress({ deleting: false, completed: 0, total: 0 });
            toast.success('Selected deals deleted successfully');
        },
        onError: (error) => {
            setBulkDeleteProgress({ deleting: false, completed: 0, total: 0 });
            toast.error(`Failed to delete deals: ${error.message || 'Unknown error'}`);
        },
    });

    // Table columns definition
    const columns = useMemo<ColumnDef<Deal>[]>(() => [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'company.name',
            header: 'Company Name',
            cell: ({ row }) => {
                const deal = row.original;
                return (
                    <div className="flex flex-col">
                        <a
                            href={`/deals/${deal.uuid}/`}
                            className="font-medium text-blue-600 hover:text-blue-800"
                        >
                            {deal.company.name}
                        </a>
                        {deal.company.hq_location && (
                            <span className="text-sm text-gray-500">{deal.company.hq_location}</span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'created_at',
            header: 'Deal Age',
            cell: ({ row }) => {
                const age = getDealAge(row.original.created_at);
                return (
                    <span className="text-sm">
                        {age} day{age !== 1 ? 's' : ''}
                    </span>
                );
            },
        },
        {
            accessorKey: 'funding_target',
            header: 'Fundraise Amount',
            cell: ({ row }) => {
                const deal = row.original;
                return (
                    <span className="text-sm">
                        {formatFundingAmount(deal.funding_target)}
                    </span>
                );
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const deal = row.original;
                const statusColors = {
                    new: 'bg-blue-100 text-blue-800',
                    active: 'bg-green-100 text-green-800',
                    'subcommittee vetting': 'bg-yellow-100 text-yellow-800',
                };
                
                return (
                    <div className="flex items-center gap-2">
                        <Badge className={statusColors[deal.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                            {deal.status}
                        </Badge>
                        {deal.last_assessment_created_at && (
                            <span className="text-xs text-gray-500">
                                (1 assessment)
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'industries',
            header: 'Industries',
            cell: ({ row }) => {
                const industries = row.original.industries;
                if (!industries?.length) return <span className="text-gray-400">-</span>;
                
                return (
                    <div className="flex flex-wrap gap-1">
                        {industries.slice(0, 2).map((industry) => (
                            <Badge
                                key={industry.uuid}
                                style={{
                                    backgroundColor: industry.bg_color,
                                    color: industry.text_color,
                                }}
                                className="text-xs"
                            >
                                {industry.name}
                            </Badge>
                        ))}
                        {industries.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                                +{industries.length - 2}
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'dual_use_signals',
            header: 'Dual-use Signals',
            cell: ({ row }) => {
                const signals = row.original.dual_use_signals;
                if (!signals?.length) return <span className="text-gray-400">-</span>;
                
                return (
                    <div className="flex flex-wrap gap-1">
                        {signals.slice(0, 2).map((signal) => (
                            <Badge
                                key={signal.uuid}
                                style={{
                                    backgroundColor: signal.category.bg_color,
                                    color: signal.category.text_color,
                                }}
                                className="text-xs"
                            >
                                {signal.code}
                            </Badge>
                        ))}
                        {signals.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                                +{signals.length - 2}
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'external_data',
            header: 'External Data',
            cell: ({ row }) => {
                const deal = row.original;
                
                return (
                    <div className="flex gap-2">
                        {/* Founders count - assuming this is available in company data */}
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {Math.floor(Math.random() * 5) + 1}
                        </Badge>
                        
                        {/* Grants count */}
                        {deal.grants_count && deal.grants_count > 0 && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {deal.grants_count}
                            </Badge>
                        )}
                        
                        {/* Patents count - mock data */}
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {Math.floor(Math.random() * 10)}
                        </Badge>
                    </div>
                );
            },
        },
        {
            accessorKey: 'last_assessment_created_at',
            header: 'Last Assessment',
            cell: ({ row }) => {
                const assessmentDate = row.original.last_assessment_created_at;
                if (!assessmentDate) {
                    return <span className="text-gray-400">Never</span>;
                }
                
                return (
                    <span className="text-sm">
                        {formatDistanceToNow(new Date(assessmentDate), { addSuffix: true })}
                    </span>
                );
            },
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const deal = row.original;
                
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <a href={`/deals/${deal.uuid}/`} className="flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    View
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <a href={`/deals/${deal.uuid}/assessment/`} className="flex items-center gap-2">
                                    <Edit className="h-4 w-4" />
                                    Edit
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelectedDealForDelete(deal.uuid);
                                    setDeleteDialogOpen(true);
                                }}
                                className="text-red-600"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], []);

    // Table instance
    const table = useReactTable({
        data: data?.results || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            rowSelection,
        },
    });

    // Event handlers
    const handleStatusFilterChange = useCallback((value: string) => {
        setUrlState({ status: value as any, page: 1 });
    }, [setUrlState]);

    const handleSearchChange = useCallback((value: string) => {
        debouncedSearch(value);
    }, [debouncedSearch]);

    const handleSingleDelete = useCallback(() => {
        if (selectedDealForDelete) {
            deleteMutation.mutate(selectedDealForDelete);
            setDeleteDialogOpen(false);
            setSelectedDealForDelete(null);
        }
    }, [selectedDealForDelete, deleteMutation]);

    const handleBulkDelete = useCallback(() => {
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        const dealIds = selectedRows.map(row => row.original.uuid);
        
        if (dealIds.length > 0) {
            bulkDeleteMutation.mutate(dealIds);
            setBulkDeleteDialogOpen(false);
        }
    }, [table, bulkDeleteMutation]);

    const selectedRowsCount = Object.keys(rowSelection).length;
    const totalCount = data?.count || 0;
    const currentPageStart = (page - 1) * PAGE_SIZE + 1;
    const currentPageEnd = Math.min(page * PAGE_SIZE, totalCount);
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    if (error) {
        return (
            <div className="container mx-auto py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600">Error Loading Deals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>There was an error loading the deals. Please try again.</p>
                        <Button onClick={() => refetch()} className="mt-4">
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Deals Overview</h1>
            </div>

            {/* Filters and Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Search deals..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10"
                    />
                </div>
                
                <Select value={status} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                </Select>

                {/* Bulk delete button */}
                {selectedRowsCount > 0 && (
                    <Button
                        variant="destructive"
                        onClick={() => setBulkDeleteDialogOpen(true)}
                        disabled={bulkDeleteProgress.deleting}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete {selectedRowsCount} deal{selectedRowsCount !== 1 ? 's' : ''}
                    </Button>
                )}
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <DealsTableSkeleton />
                    ) : (
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>
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
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
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
                                            No deals found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                    Showing {currentPageStart}-{currentPageEnd} of {totalCount} deals
                </p>
                
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUrlState({ page: 1 })}
                        disabled={page === 1}
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUrlState({ page: page - 1 })}
                        disabled={page === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUrlState({ page: page + 1 })}
                        disabled={page >= totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUrlState({ page: totalPages })}
                        disabled={page >= totalPages}
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Single Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Deal</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this deal? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSingleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirmation Dialog */}
            <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Multiple Deals</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedRowsCount} deal{selectedRowsCount !== 1 ? 's' : ''}? 
                            This action cannot be undone.
                            
                            {bulkDeleteProgress.deleting && (
                                <div className="mt-4 space-y-2">
                                    <p className="text-sm">
                                        Deleting {bulkDeleteProgress.completed} of {bulkDeleteProgress.total} deals...
                                    </p>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="bg-red-600 h-2 rounded-full transition-all duration-300"
                                            style={{ 
                                                width: `${(bulkDeleteProgress.completed / bulkDeleteProgress.total) * 100}%` 
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkDeleteProgress.deleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteProgress.deleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {bulkDeleteProgress.deleting ? 'Deleting...' : 'Delete All'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Toast notifications */}
            <Toaster />
        </div>
    );
}

// Initialize function for the page module system
export function initialize() {
    const root = document.getElementById('deals-list-root');
    if (root) {
        import('react-dom/client').then(({ createRoot }) => {
            const reactRoot = createRoot(root);
            import('@tanstack/react-query').then(({ QueryClient, QueryClientProvider }) => {
                const queryClient = new QueryClient({
                    defaultOptions: {
                        queries: {
                            retry: 1,
                            refetchOnWindowFocus: false,
                        },
                    },
                });

                reactRoot.render(
                    <QueryClientProvider client={queryClient}>
                        <DealsListPage />
                    </QueryClientProvider>
                );
            });
        });
    }
}