import React from 'react';
import { createRoot } from 'react-dom/client';
import FeaturedAnalysis from '@/components/research/FeaturedAnalysis';
import TeamAnalysis from '@/components/research/TeamAnalysis';
import PapersList from '@/components/research/PapersList';
import TeamMembersList from '@/components/research/TeamMembersList';
import { mockPapers, mockResearchAnalysis, mockTeamAnalysis, mockTeamMembers } from '@/lib/mocks/research_agent';

function ResearchAgentApp() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <FeaturedAnalysis content={mockResearchAnalysis} />
        </div>
        <div>
          <TeamAnalysis content={mockTeamAnalysis} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <PapersList papers={mockPapers} />
        </div>
        <div>
          <TeamMembersList members={mockTeamMembers} />
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

