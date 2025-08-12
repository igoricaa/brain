// People-related TypeScript interfaces and helpers

export interface CompanyMini {
    uuid: string;
    name: string;
    website?: string | null;
    image?: string | null; // URL if available
}

export interface FounderCompany extends CompanyMini {
    title?: string | null; // founder title from Founding relation
}

export interface Founder {
    uuid: string;
    name: string;
    bio?: string | null;
    linkedin_url?: string | null;
    website?: string | null;
    country?: string | null; // ISO code serialized by DRF CountryField
    location?: string | null;
    companies: FounderCompany[]; // via RelatedFounderCompanySerializer
    created_at?: string;
    updated_at?: string;
}

export interface Advisor {
    uuid: string;
    name: string;
    bio?: string | null;
    linkedin_url?: string | null;
    website?: string | null;
    country?: string | null; // ISO code
    location?: string | null;
    companies: CompanyMini[]; // via RelatedAdvisorCompanySerializer
    created_at?: string;
    updated_at?: string;
}

export interface Paginated<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface PeopleSearchParams {
    q?: string;
    page?: number;
    page_size?: number; // default 30 via DRF
    ordering?: string; // e.g. -created_at
}
