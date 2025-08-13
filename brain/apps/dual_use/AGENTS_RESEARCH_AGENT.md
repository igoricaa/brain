# Research Agent Implementation

## Overview
The Research Agent is a comprehensive React-based dashboard for investment analysis and due diligence. It provides a structured view of investment metrics, research analysis, team evaluation, and supporting research papers.

## Architecture

### Page Structure
- **Entry Point**: `brain/assets/src/pages/research_agent.tsx`
- **Mount Target**: `research-agent-root` DOM element
- **Layout**: Responsive grid system with 3-phase progressive disclosure

### Component Hierarchy
```
ResearchAgentApp
├── MetricsHeader (4-column metric cards)
├── Grid Layout (lg:grid-cols-3)
│   ├── EnhancedResearchAnalysis (lg:col-span-2)
│   └── EnhancedTeamAnalysis (lg:col-span-1)
└── Supporting Data Grid (lg:grid-cols-2)
    ├── EnhancedPapersList
    └── EnhancedTeamMembersList
```

## Key Components

### 1. MetricsHeader
- **Location**: `@/components/research/MetricsHeader`
- **Purpose**: Display key investment metrics in 4-column card layout
- **Metrics**: Overall Rating, Investment Recommendation, Risk Level, Market Opportunity
- **Design**: Color-coded cards with icons and visual hierarchy

### 2. EnhancedResearchAnalysis
- **Location**: `@/components/research/EnhancedResearchAnalysis`
- **Features**:
  - Executive summary with green highlight background
  - Key insights with color-coded categories (positive/risk/neutral)
  - Impact badges (high/medium/low)
  - Collapsible detailed analysis with markdown support
  - Responsive design with proper spacing

### 3. EnhancedTeamAnalysis
- **Location**: `@/components/research/EnhancedTeamAnalysis`
- **Features**:
  - Overall team rating with A+ scale
  - Strength categories with progress bars
  - Highlight metrics (experience, publications, exits, patents)
  - Risk factors assessment
  - Collapsible full analysis with markdown

### 4. EnhancedPapersList
- **Location**: `@/components/research/EnhancedPapersList`
- **Features**:
  - Academic paper cards with metadata
  - Relevance, impact, and technical merit indicators
  - Investment implications for each paper
  - Citation counts and author information
  - Enhanced evaluation with markdown support

### 5. EnhancedTeamMembersList
- **Location**: `@/components/research/EnhancedTeamMembersList`
- **Features**:
  - Individual team member profile cards
  - Letter grade ratings (A+, A, B+, etc.)
  - Avatar placeholders with initials
  - Key metrics grid (publications, patents, exits, experience)
  - Strengths vs. risk factors comparison
  - Detailed analysis per member with markdown

## Design System

### Color Coding
- **Green**: Positive indicators, strengths, high ratings
- **Blue**: Neutral information, general metrics
- **Orange**: Medium risk/impact, warnings
- **Red**: High risk, critical issues
- **Purple**: Academic/research related (publications)

### Typography Hierarchy
- **Headers**: Large, bold with icons
- **Subheaders**: Medium weight with subtle color
- **Body**: Regular weight, good contrast
- **Metadata**: Smaller, muted color

### Layout Patterns
- **Card-based design**: All content in shadowed cards
- **Responsive grids**: Mobile-first with breakpoint adaptations
- **Progressive disclosure**: Expandable sections for detailed content
- **Visual hierarchy**: Icons, spacing, and color to guide attention

## Data Structure

### Mock Data Location
- **File**: `@/lib/mocks/research_agent.ts`
- **Exports**:
  - `mockInvestmentMetrics`: Top-level KPIs
  - `mockEnhancedResearchAnalysis`: Detailed investment analysis
  - `mockEnhancedTeamAnalysis`: Team evaluation data
  - `mockEnhancedPapers`: Academic research papers
  - `mockEnhancedTeamMembers`: Individual team member profiles

### Type Definitions
```typescript
// Key types for research agent components
export type ResearchInsight = {
    type: 'positive' | 'neutral' | 'risk';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
};

export type EnhancedTeamMember = {
    id: number | string;
    name: string;
    role?: string;
    rating: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-';
    experience: number;
    publications?: number;
    patents?: number;
    previousExits?: number;
    keyStrengths: string[];
    riskFactors: string[];
    analysis?: string;
};
```

## Integration Points

### Django Template Integration
- Uses standard React mount pattern with `research-agent-root`
- Integrated with loading overlay system
- Compatible with existing sidebar navigation

### Asset Pipeline
- Built with Vite for development and production
- Uses shared UI components from `@/components/ui`
- Follows established import patterns and path aliases

### Responsive Design
- Mobile-first approach with Tailwind CSS
- Adaptive grid layouts at `lg:` breakpoint
- Touch-friendly interaction elements
- Optimized for various screen sizes

## Development Patterns

### Component Structure
- Functional components with TypeScript
- Props interfaces for all components
- Default prop values where appropriate
- Consistent naming conventions

### State Management
- Local state for UI interactions (expand/collapse)
- No global state dependencies
- Stateless where possible for performance

### Accessibility
- Semantic HTML structure
- ARIA attributes for interactive elements
- Keyboard navigation support
- Screen reader compatible

## Future Enhancements

### Potential API Integration
- Replace mock data with real API endpoints
- Add loading states and error handling
- Implement data fetching patterns

### Interactive Features
- Filtering and sorting capabilities
- Search functionality within analysis
- Export/print functionality
- Bookmarking and note-taking

### Advanced Visualizations
- Charts for financial metrics
- Network graphs for team connections
- Timeline visualizations for company history
- Risk assessment matrices

## Code Quality

### Standards Followed
- TypeScript strict mode
- ESLint and Prettier configuration
- Consistent component patterns
- Proper separation of concerns

### Performance Considerations
- Efficient re-renders with proper React patterns
- Lazy loading for detailed analysis sections
- Optimized bundle size with tree shaking
- Minimal DOM manipulations

## Testing Strategy
- Component unit tests for each major component
- Integration tests for data flow
- Visual regression tests for design consistency
- Accessibility testing with automated tools