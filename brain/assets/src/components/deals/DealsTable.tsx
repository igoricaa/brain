import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DealRow } from './DealRow';
import { useDealColumns } from '@/hooks/useDeals';
import type { Deal } from '@/lib/types/deals';

interface DealsTableProps {
    deals: Deal[];
    loading?: boolean;
    onDealSelect?: (dealId: string) => void;
    selectedDeals?: Set<string>;
}

export function DealsTable({
    deals,
    loading = false,
    onDealSelect,
    selectedDeals = new Set(),
}: DealsTableProps) {
    const columns = useDealColumns();

    if (loading && deals.length === 0) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="rounded-md border border-border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead key={column.key} className={column.className}>
                                {column.label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {deals.map((deal) => (
                        <DealRow
                            key={deal.uuid}
                            deal={deal}
                            onSelect={onDealSelect}
                            selected={selectedDeals.has(deal.uuid)}
                        />
                    ))}

                    {deals.length === 0 && !loading && (
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
    );
}

// Loading skeleton for initial load
function LoadingSkeleton() {
    return (
        <div className="rounded-md border border-border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[280px]">Company</TableHead>
                        <TableHead>Fundraise</TableHead>
                        <TableHead>Industries</TableHead>
                        <TableHead>Dual-use Signal</TableHead>
                        <TableHead>Grants</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
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
                            <TableCell className="w-[100px]">
                                <Skeleton className="h-8 w-8" />
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
            <TableCell className="w-[100px]">
                <Skeleton className="h-8 w-8" />
            </TableCell>
        </TableRow>
    );
}
