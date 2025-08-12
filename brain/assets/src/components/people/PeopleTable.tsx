import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink } from 'lucide-react';
import type { Advisor, Founder, CompanyMini, FounderCompany } from '@/lib/types/people';

type Person = Founder | Advisor;

interface PeopleTableProps {
    people: Person[];
    loading?: boolean;
    variant: 'founders' | 'advisors';
}

function CompanyChip({ company }: { company: CompanyMini }) {
    return (
        <a
            href={`/companies/${company.uuid}/`}
            className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm hover:bg-gray-50"
        >
            {company.image ? (
                <img
                    src={company.image}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                    loading="lazy"
                />
            ) : (
                <span className="h-5 w-5 rounded-full bg-gray-200" />
            )}
            <span className="truncate max-w-[12rem]">{company.name}</span>
        </a>
    );
}

function CompaniesCell({ companies }: { companies: CompanyMini[] }) {
    const firstThree = companies.slice(0, 3);
    const remaining = Math.max(0, companies.length - 3);
    return (
        <div className="flex flex-wrap gap-2">
            {firstThree.map((c) => (
                <CompanyChip key={c.uuid} company={c} />
            ))}
            {remaining > 0 && <Badge variant="secondary">+{remaining}</Badge>}
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Companies</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-6 w-48" />
                                </div>
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-5 w-24" />
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Skeleton className="h-7 w-28 rounded-full" />
                                    <Skeleton className="h-7 w-28 rounded-full" />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export function PeopleTable({ people, loading = false }: PeopleTableProps) {
    if (loading && people.length === 0) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Companies</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {people.map((p) => (
                        <TableRow key={p.uuid}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{p.name}</span>
                                    {p.linkedin_url && (
                                        <a
                                            href={p.linkedin_url}
                                            className="text-gray-500 hover:text-gray-700"
                                            target="_blank"
                                            rel="noreferrer"
                                            title="LinkedIn"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-gray-600">
                                {p.location || p.country || '—'}
                            </TableCell>
                            <TableCell>
                                <CompaniesCell
                                    companies={
                                        (p as any).companies as (CompanyMini | FounderCompany)[]
                                    }
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
