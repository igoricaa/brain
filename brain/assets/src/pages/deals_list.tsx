import React, { useState, useEffect } from 'react';
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
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { parseAsString, parseAsStringLiteral, parseAsInteger, useQueryStates } from 'nuqs';
import { useDebouncedCallback } from 'use-debounce';
import {
    Search,
    Eye,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    FileText,
    Building2,
    Users,
} from 'lucide-react';

import { http } from '@/lib/http';
import type { Deal, DealListResponse } from '@/lib/types/deals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

const PAGE_SIZE = 30;

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
        // For archived status, send it as-is (backend will handle it)
        searchParams.set('status', params.status);
    }

    const response = await http.get(`/deals/deals/?${searchParams.toString()}`);
    return response.data;
};

// Delete deal function
const deleteDeal = async (dealId: string): Promise<void> => {
    await http.delete(`/deals/deals/${dealId}/`);
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
                    <TableHead className="w-[120px]">Fundraise</TableHead>
                    <TableHead className="w-[140px]">Deal Status</TableHead>
                    <TableHead className="w-[200px]">Industries</TableHead>
                    <TableHead className="w-[200px]">Dual-use Signals</TableHead>
                    <TableHead className="w-[180px]">External Signals</TableHead>
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
                            <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-6 w-[100px] rounded-full" />
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
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-[120px]" />
                                <Skeleton className="h-4 w-[100px]" />
                                <Skeleton className="h-4 w-[140px]" />
                            </div>
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

    // Local search state for immediate input updates
    const [localSearchValue, setLocalSearchValue] = useState(searchQuery);

    // Debounced search handler
    const debouncedSearch = useDebouncedCallback((value: string) => {
        setUrlState({ q: value, page: 1 });
    }, 300);

    // Sync URL state back to local state when it changes
    useEffect(() => {
        setLocalSearchValue(searchQuery);
    }, [searchQuery]);

    // Data fetching
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['deals-list', searchQuery, status, page],
        queryFn: () => fetchDeals({ q: searchQuery, status, page }),
        placeholderData: keepPreviousData,
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
    const columns: ColumnDef<Deal>[] = [
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
                            <span className="text-sm text-gray-500">
                                {deal.company.hq_location}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'funding_target',
            header: 'Fundraise',
            cell: ({ row }) => {
                const deal = row.original;
                return <span className="text-sm">{formatFundingAmount(deal.funding_target)}</span>;
            },
        },
        {
            accessorKey: 'status',
            header: 'Deal Status',
            cell: ({ row }) => {
                const deal = row.original;
                const statusColors = {
                    new: 'bg-blue-100 text-blue-800',
                    active: 'bg-green-100 text-green-800',
                    'subcommittee vetting': 'bg-yellow-100 text-yellow-800',
                };

                // Count number of assessments (for now just show 1 if there's a last assessment date)
                const assessmentCount = deal.last_assessment_created_at ? 1 : 0;
                const statusText =
                    deal.status === 'active' && assessmentCount > 0
                        ? `Active (${assessmentCount}x run)`
                        : deal.status;

                return (
                    <Badge
                        className={
                            statusColors[deal.status as keyof typeof statusColors] ||
                            'bg-gray-100 text-gray-800'
                        }
                    >
                        {statusText}
                    </Badge>
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
                                    backgroundColor: signal?.category?.bg_color || '#e5e7eb',
                                    color: signal?.category?.text_color || '#374151',
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
            id: 'external_signals',
            header: 'External Signals',
            cell: ({ row }) => {
                const deal = row.original;
                const company = deal.company;

                // Get actual counts from data (we'll need to add these to the API response)
                const foundersCount = (company as any)?.founders_count || 0;
                const grantsCount = (deal as any).grants_count || 0;
                const patentsCount = (company as any)?.patents_count || 0;

                const signals = [];
                if (foundersCount > 0) {
                    signals.push({
                        icon: Users,
                        count: foundersCount,
                        label: 'Founder profiles',
                    });
                }
                if (grantsCount > 0) {
                    signals.push({ icon: FileText, count: grantsCount, label: 'Grants' });
                }
                if (patentsCount > 0) {
                    signals.push({
                        icon: Building2,
                        count: patentsCount,
                        label: 'Patent applications',
                    });
                }

                if (signals.length === 0) {
                    return <span className="text-gray-400 text-xs">No external data</span>;
                }

                return (
                    <div className="space-y-1">
                        {signals.map((signal, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-1 text-xs text-gray-600"
                            >
                                <signal.icon className="h-3 w-3" />
                                <span>
                                    {signal.count} {signal.label}
                                </span>
                            </div>
                        ))}
                    </div>
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
                                <a
                                    href={`/deals/${deal.uuid}/`}
                                    className="flex items-center gap-2"
                                >
                                    <Eye className="h-4 w-4" />
                                    View
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <a
                                    href={`/deals/${deal.uuid}/assessment/`}
                                    className="flex items-center gap-2"
                                >
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
    ];

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
    const handleStatusFilterChange = (value: string) => {
        setRowSelection({}); // Clear selection when switching tabs
        setUrlState({ status: value as any, page: 1 });
    };

    const handleSearchChange = (value: string) => {
        setLocalSearchValue(value); // Update local state immediately
        debouncedSearch(value);
    };

    const handleSingleDelete = () => {
        if (selectedDealForDelete) {
            deleteMutation.mutate(selectedDealForDelete);
            setDeleteDialogOpen(false);
            setSelectedDealForDelete(null);
        }
    };

    const handleBulkDelete = () => {
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        const dealIds = selectedRows.map((row) => row.original.uuid);

        if (dealIds.length > 0) {
            bulkDeleteMutation.mutate(dealIds);
            setBulkDeleteDialogOpen(false);
        }
    };

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

            {/* Search, Delete and Status Tabs in same row */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Search deals..."
                            value={localSearchValue}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Delete button - always visible but disabled when no selection */}
                    <Button
                        variant="destructive"
                        onClick={() => setBulkDeleteDialogOpen(true)}
                        disabled={selectedRowsCount === 0 || bulkDeleteProgress.deleting}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete {selectedRowsCount > 0 ? `(${selectedRowsCount})` : ''}
                    </Button>
                </div>

                {/* Status Tabs */}
                <Tabs value={status} onValueChange={handleStatusFilterChange}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="new">New</TabsTrigger>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="archived">Archived</TabsTrigger>
                    </TabsList>
                </Tabs>
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
                                                          header.getContext(),
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
                                                        cell.getContext(),
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
                            Are you sure you want to delete {selectedRowsCount} deal
                            {selectedRowsCount !== 1 ? 's' : ''}? This action cannot be undone.
                            {bulkDeleteProgress.deleting && (
                                <div className="mt-4 space-y-2">
                                    <p className="text-sm">
                                        Deleting {bulkDeleteProgress.completed} of{' '}
                                        {bulkDeleteProgress.total} deals...
                                    </p>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-red-600 h-2 rounded-full transition-all duration-300"
                                            style={{
                                                width: `${(bulkDeleteProgress.completed / bulkDeleteProgress.total) * 100}%`,
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
            Promise.all([import('@tanstack/react-query'), import('nuqs/adapters/react')]).then(
                ([{ QueryClient, QueryClientProvider }, { NuqsAdapter }]) => {
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
                            <NuqsAdapter>
                                <DealsListPage />
                            </NuqsAdapter>
                        </QueryClientProvider>,
                    );
                },
            );
        });
    }
}
