// Deal-related TypeScript interfaces for the modern React implementation
export interface Company {
    uuid: string;
    name: string;
    logo_url?: string;
    hq_location?: string;
}

export interface Industry {
    uuid: string;
    name: string;
    bg_color: string;
    text_color: string;
}

export interface DualUseCategory {
    uuid: string;
    name: string;
    code: string;
    bg_color: string;
    text_color: string;
}

export interface DualUseSignal {
    uuid: string;
    name: string;
    code: string;
    category: DualUseCategory;
}

export interface FundingStage {
    uuid: string;
    name: string;
}

export interface FundingType {
    uuid: string;
    name: string;
}

export interface Deal {
    uuid: string;
    name: string;
    company: Company;
    description?: string;
    website?: string;
    status: 'new' | 'active' | 'subcommittee vetting';
    industries: Industry[];
    dual_use_signals: DualUseSignal[];
    funding_stage?: FundingStage;
    funding_type?: FundingType;
    funding_target?: number;
    funding_raised?: number;
    investors_names?: string[];
    partners_names?: string[];
    customers_names?: string[];
    processing_status: 'pending' | 'processing' | 'ready' | 'failed';
    sent_to_affinity: boolean;
    has_civilian_use?: boolean;
    govt_relationships?: string;
    grants_count?: number;
    has_processing_deck: boolean;
    created_at: string;
    updated_at: string;
}

export interface DealAssessment {
    uuid: string;
    deal: string; // UUID reference
    quality_percentile?: number;
    investment_rationale?: string;
    pros?: string;
    cons?: string;
    created_at: string;
    updated_at: string;
}

export interface MissedDeal {
    uuid: string;
    name: string;
    company?: Company;
    hq_location?: string;
    summary?: string;
    last_funding_amount?: number;
    last_funding_date?: string;
    total_funding_amount?: number;
    funding_rounds_count?: number;
    technology_type?: string;
    created_at: string;
    updated_at: string;
}

// API Response types
export interface DealListResponse {
    count: number;
    next?: string;
    previous?: string;
    results: Deal[];
}

export interface MissedDealListResponse {
    count: number;
    next?: string;
    previous?: string;
    results: MissedDeal[];
}

// Search and filter types
export interface DealFilters {
    q?: string; // search query
    status?: Deal['status'];
    industries?: string[]; // UUIDs
    dual_use_categories?: string[]; // UUIDs
    funding_stage?: string; // UUID
    date_from?: string;
    date_to?: string;
    has_grants?: boolean;
    processing_status?: Deal['processing_status'];
    sent_to_affinity?: boolean;
}

export interface DealSearchParams extends DealFilters {
    page?: number;
    page_size?: number;
    ordering?: string;
}

// UI State types
export interface DealTableColumn {
    key: string;
    label: string;
    sortable: boolean;
    className?: string;
}

export interface DealRowProps {
    deal: Deal;
    onSelect?: (dealId: string) => void;
    selected?: boolean;
}

// Formatting utilities
export interface FormattingOptions {
    currency: 'USD' | 'EUR' | 'GBP';
    dateFormat: 'relative' | 'absolute' | 'short';
    numberFormat: 'compact' | 'full';
}

// Hook return types
export interface UseDealsResult {
    deals: Deal[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    loadMore: () => void;
    refetch: () => void;
}

export interface UseSearchDealsResult extends UseDealsResult {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filters: DealFilters;
    setFilters: (filters: DealFilters) => void;
    clearFilters: () => void;
}

// Component props
export interface DealsListProps {
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
    viewMode?: 'table' | 'cards';
    enableBulkActions?: boolean;
    enableColumnSort?: boolean;
    customColumns?: DealTableColumn[];
    onDealSelect?: (deal: Deal) => void;
}
