import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
    CompanyCell,
    FundraisingCell,
    IndustriesCell,
    DualUseSignalsCell,
    GrantsCell,
} from './DealCells';
import type { DealRowProps } from '@/lib/types/deals';

export function DealRow({ deal, onSelect, selected }: DealRowProps) {
    return (
        <TableRow
            className={`cursor-pointer hover:bg-accent/50 transition-colors ${selected ? 'bg-accent' : ''}`}
            onClick={() => onSelect?.(deal.uuid)}
        >
            <TableCell className="w-[300px] py-4">
                <CompanyCell deal={deal} />
            </TableCell>

            <TableCell className="py-4">
                <FundraisingCell deal={deal} />
            </TableCell>

            <TableCell className="py-4">
                <IndustriesCell industries={deal.industries} />
            </TableCell>

            <TableCell className="py-4">
                <DualUseSignalsCell signals={deal.dual_use_signals} />
            </TableCell>

            <TableCell className="py-4">
                <GrantsCell deal={deal} />
            </TableCell>

            <TableCell className="py-4 w-[100px]">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </TableCell>
        </TableRow>
    );
}
