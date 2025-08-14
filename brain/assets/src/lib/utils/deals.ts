/**
 * Utility functions for deal-related operations
 */

/**
 * Check if a file was created after the last assessment date
 * @param fileDate - The creation date of the file (ISO string)
 * @param lastAssessmentDate - The date of the last assessment (ISO string)
 * @returns true if the file is new since the last assessment
 */
export function isNewSinceLastAssessment(
    fileDate: string | null | undefined,
    lastAssessmentDate: string | null | undefined
): boolean {
    if (!fileDate || !lastAssessmentDate) {
        return false;
    }
    
    try {
        const fileDateTime = new Date(fileDate).getTime();
        const assessmentDateTime = new Date(lastAssessmentDate).getTime();
        return fileDateTime > assessmentDateTime;
    } catch {
        return false;
    }
}

/**
 * Format currency values in a compact format (e.g., $1.5M, $250K)
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatCompactCurrency(amount: number | null | undefined): string {
    if (!amount || amount === 0) return 'N/A';
    
    const abs = Math.abs(amount);
    
    if (abs >= 1_000_000_000) {
        return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    } else if (abs >= 1_000_000) {
        return `$${(amount / 1_000_000).toFixed(1)}M`;
    } else if (abs >= 1_000) {
        return `$${(amount / 1_000).toFixed(0)}K`;
    } else {
        return `$${amount.toLocaleString()}`;
    }
}

/**
 * Format a date string to a relative time (e.g., "2 days ago", "3 months ago")
 * @param dateStr - ISO date string
 * @returns Relative time string
 */
export function formatRelativeDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffHours === 0) {
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
            }
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const diffWeeks = Math.floor(diffDays / 7);
            return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
        } else if (diffDays < 365) {
            const diffMonths = Math.floor(diffDays / 30);
            return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
        } else {
            const diffYears = Math.floor(diffDays / 365);
            return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
        }
    } catch {
        return dateStr;
    }
}

/**
 * Format a standard date string (e.g., "Dec 15, 2023")
 * @param dateStr - ISO date string
 * @returns Formatted date string
 */
export function formatStandardDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    
    try {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

/**
 * Get color class for different industry types
 * @param industryName - Name of the industry
 * @returns Tailwind color classes
 */
export function getIndustryColor(industryName: string): string {
    const name = industryName.toLowerCase();
    
    if (name.includes('ai') || name.includes('artificial intelligence') || name.includes('machine learning')) {
        return 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20';
    } else if (name.includes('biotech') || name.includes('pharmaceutical') || name.includes('healthcare')) {
        return 'bg-green-50 text-green-700 ring-1 ring-green-600/20';
    } else if (name.includes('fintech') || name.includes('financial') || name.includes('blockchain')) {
        return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20';
    } else if (name.includes('defense') || name.includes('aerospace') || name.includes('security')) {
        return 'bg-red-50 text-red-700 ring-1 ring-red-600/20';
    } else if (name.includes('energy') || name.includes('clean') || name.includes('renewable')) {
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20';
    } else if (name.includes('software') || name.includes('saas') || name.includes('enterprise')) {
        return 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20';
    } else {
        return 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/20';
    }
}

/**
 * Get color class for dual-use signals
 * @param signalName - Name of the dual-use signal
 * @returns Tailwind color classes
 */
export function getDualUseSignalColor(signalName: string): string {
    const name = signalName.toLowerCase();
    
    if (name.includes('high') || name.includes('critical')) {
        return 'bg-red-50 text-red-700 ring-1 ring-red-600/20';
    } else if (name.includes('medium') || name.includes('moderate')) {
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20';
    } else if (name.includes('low') || name.includes('minimal')) {
        return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20';
    } else {
        return 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20';
    }
}

/**
 * Get status color for clinical trials
 * @param status - Clinical trial status
 * @returns Tailwind color classes
 */
export function getClinicalTrialStatusColor(status: string | null | undefined): string {
    if (!status) return 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('completed')) {
        return 'bg-green-50 text-green-700 ring-1 ring-green-600/20';
    } else if (statusLower.includes('recruiting') || statusLower.includes('active')) {
        return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20';
    } else if (statusLower.includes('terminated') || statusLower.includes('withdrawn')) {
        return 'bg-red-50 text-red-700 ring-1 ring-red-600/20';
    } else if (statusLower.includes('suspended')) {
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20';
    } else {
        return 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/20';
    }
}

/**
 * Get status color for patent applications
 * @param status - Patent application status
 * @returns Tailwind color classes
 */
export function getPatentStatusColor(status: string | null | undefined): string {
    if (!status) return 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('granted') || statusLower.includes('issued')) {
        return 'bg-green-50 text-green-700 ring-1 ring-green-600/20';
    } else if (statusLower.includes('pending') || statusLower.includes('application')) {
        return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20';
    } else if (statusLower.includes('abandoned') || statusLower.includes('rejected')) {
        return 'bg-red-50 text-red-700 ring-1 ring-red-600/20';
    } else {
        return 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/20';
    }
}

/**
 * Truncate text to a specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}