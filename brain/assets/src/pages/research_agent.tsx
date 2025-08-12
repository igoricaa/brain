import { createRoot } from 'react-dom/client';
import MetricsHeader from '@/components/research/MetricsHeader';
import EnhancedResearchAnalysis from '@/components/research/EnhancedResearchAnalysis';
import EnhancedTeamAnalysis from '@/components/research/EnhancedTeamAnalysis';
import EnhancedPapersList from '@/components/research/EnhancedPapersList';
import EnhancedTeamMembersList from '@/components/research/EnhancedTeamMembersList';
import {
    mockInvestmentMetrics,
    mockEnhancedResearchAnalysis,
    mockEnhancedTeamAnalysis,
    mockEnhancedPapers,
    mockEnhancedTeamMembers,
} from '@/lib/mocks/research_agent';

function ResearchAgentApp() {
    return (
        <div className="space-y-8">
            {/* Key Metrics Header */}
            <MetricsHeader metrics={mockInvestmentMetrics} />

            {/* Analysis Content - Responsive Layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <EnhancedResearchAnalysis data={mockEnhancedResearchAnalysis} />
                </div>
                <div>
                    <EnhancedTeamAnalysis data={mockEnhancedTeamAnalysis} />
                </div>
            </div>

            {/* Supporting Data - Two Column */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                    <EnhancedPapersList papers={mockEnhancedPapers} />
                </div>
                <div>
                    <EnhancedTeamMembersList members={mockEnhancedTeamMembers} />
                </div>
            </div>
        </div>
    );
}

function mount() {
    const el = document.getElementById('research-agent-root');
    if (!el) return;
    const root = createRoot(el);
    root.render(<ResearchAgentApp />);
}

export function initialize() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
}
