import { useMemo, useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    ColumnDef,
    flexRender,
    SortingState,
    RowSelectionState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
    CompanyCell,
    FundraisingCell,
    IndustriesCell,
    DualUseSignalsCell,
    GrantsCell,
} from './DealCells';
import { http } from '@/lib/http';
import type { Deal } from '@/lib/types/deals';
import { toast } from 'sonner';

interface DealsTableV2Props {
    deals: Deal[];
    loading?: boolean;
    onDealSelect?: (dealId: string) => void;
    onDealsChange?: () => void; // Callback to refresh the data
}

export function DealsTableV2({
    deals,
    loading = false,
    onDealSelect,
    onDealsChange,
}: DealsTableV2Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // TanStack Table column definitions
    const columns = useMemo<ColumnDef<Deal>[]>(
        () => [
            // Selection column
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && 'indeterminate')
                        }
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
                size: 40,
            },
            // Company column
            {
                accessorKey: 'company',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                        Company
                        {column.getIsSorted() === 'asc' && <ChevronUp className="ml-2 h-4 w-4" />}
                        {column.getIsSorted() === 'desc' && (
                            <ChevronDown className="ml-2 h-4 w-4" />
                        )}
                    </Button>
                ),
                cell: ({ row }) => (
                    <CompanyCell
                        deal={row.original}
                        onClick={() => onDealSelect?.(row.original.uuid)}
                    />
                ),
                sortingFn: (rowA, rowB) => {
                    return rowA.original.company.name.localeCompare(rowB.original.company.name);
                },
                size: 280,
            },
            // Fundraise column
            {
                accessorKey: 'fundraise',
                header: 'Fundraise',
                cell: ({ row }) => <FundraisingCell deal={row.original} />,
                enableSorting: false,
            },
            // Industries column
            {
                accessorKey: 'industries',
                header: 'Industries',
                cell: ({ row }) => <IndustriesCell industries={row.original.industries} />,
                enableSorting: false,
            },
            // Dual-use signals column
            {
                accessorKey: 'dual_use_signals',
                header: 'Dual-use Signal',
                cell: ({ row }) => <DualUseSignalsCell signals={row.original.dual_use_signals} />,
                enableSorting: false,
            },
            // Grants column
            {
                accessorKey: 'grants_count',
                header: 'Grants',
                cell: ({ row }) => <GrantsCell count={row.original.grants_count} />,
                enableSorting: false,
            },
        ],
        [onDealSelect],
    );

    const table = useReactTable({
        data: deals || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        getRowId: (row) => row.uuid,
        state: {
            sorting,
            rowSelection,
        },
    });

    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedCount = selectedRows.length;

    // Bulk delete handler
    const handleBulkDelete = async () => {
        if (selectedCount === 0) return;

        const confirmed = window.confirm(
            `Are you sure you want to delete ${selectedCount} deal${selectedCount > 1 ? 's' : ''}?`,
        );

        if (!confirmed) return;

        setBulkDeleting(true);
        let successful = 0;
        let failed = 0;

        try {
            // Process deletions in parallel but limit concurrency to avoid overwhelming the server
            const deletePromises = selectedRows.map(async (row) => {
                try {
                    await http.delete(`/deals/deals/${row.original.uuid}/`);
                    return { success: true, id: row.original.uuid };
                } catch (error) {
                    console.error(`Failed to delete deal ${row.original.uuid}:`, error);
                    return { success: false, id: row.original.uuid };
                }
            });

            const results = await Promise.allSettled(deletePromises);

            results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value.success) {
                    successful++;
                } else {
                    failed++;
                }
            });

            // Show results
            if (successful > 0) {
                toast.success(
                    `Successfully deleted ${successful} deal${successful > 1 ? 's' : ''}`,
                );
            }
            if (failed > 0) {
                toast.error(`Failed to delete ${failed} deal${failed > 1 ? 's' : ''}`);
            }

            // Clear selection and refresh data
            setRowSelection({});
            onDealsChange?.();
        } catch (error) {
            toast.error('An error occurred during bulk deletion');
            console.error('Bulk deletion error:', error);
        } finally {
            setBulkDeleting(false);
        }
    };

    // Bulk selection controls
    const handleSelectAll = () => {
        table.toggleAllPageRowsSelected(true);
    };

    const handleClearAll = () => {
        table.toggleAllPageRowsSelected(false);
    };

    if (loading && deals.length === 0) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="space-y-4">
            {/* Bulk actions bar - only show when items are selected */}
            {selectedCount > 0 && (
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-blue-900 font-medium">
                            {selectedCount} deal{selectedCount > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAll}
                                disabled={table.getIsAllPageRowsSelected()}
                            >
                                Select All
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleClearAll}>
                                Clear All
                            </Button>
                        </div>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={bulkDeleting}
                        className="flex items-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
                    </Button>
                </div>
            )}

            {/* Table */}
            <div className="rounded-md border border-border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={header.id === 'select' ? 'w-[40px]' : ''}
                                        style={{
                                            width:
                                                header.getSize() !== 150
                                                    ? header.getSize()
                                                    : undefined,
                                        }}
                                    >
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
                                    className="cursor-pointer hover:bg-gray-50"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2">
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
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No deals found.
                                </TableCell>
                            </TableRow>
                        )}

                        {loading && deals.length > 0 && <LoadingRow />}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

// Loading skeleton for initial load
function LoadingSkeleton() {
    return (
        <div className="rounded-md border border-border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40px]">
                            <Skeleton className="h-4 w-4" />
                        </TableHead>
                        <TableHead className="w-[280px]">Company</TableHead>
                        <TableHead>Fundraise</TableHead>
                        <TableHead>Industries</TableHead>
                        <TableHead>Dual-use Signal</TableHead>
                        <TableHead>Grants</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell className="w-[40px]">
                                <Skeleton className="h-4 w-4" />
                            </TableCell>
                            <TableCell className="w-[280px]">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-4 w-4" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-3 w-12" />
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-1">
                                    <Skeleton className="h-5 w-16" />
                                    <Skeleton className="h-5 w-12" />
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-1">
                                    <Skeleton className="h-5 w-20" />
                                </div>
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-4 w-16" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// Loading row for pagination loading
function LoadingRow() {
    return (
        <TableRow>
            <TableCell className="w-[40px]">
                <Skeleton className="h-4 w-4" />
            </TableCell>
            <TableCell className="w-[280px]">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12" />
                </div>
            </TableCell>
            <TableCell>
                <div className="flex gap-1">
                    <Skeleton className="h-5 w-16" />
                </div>
            </TableCell>
            <TableCell>
                <div className="flex gap-1">
                    <Skeleton className="h-5 w-20" />
                </div>
            </TableCell>
            <TableCell>
                <Skeleton className="h-4 w-16" />
            </TableCell>
        </TableRow>
    );
}
