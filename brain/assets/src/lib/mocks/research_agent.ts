export const mockInvestmentMetrics = {
    overallRating: {
        grade: 'A+' as const,
        description: 'Exceptional technical team and market opportunity',
    },
    recommendation: {
        type: 'Strong Buy' as const,
        confidence: 'High' as const,
    },
    riskLevel: {
        level: 'Medium' as const,
        factors: ['Technical execution', 'Market timing', 'Competition', 'Regulatory changes'],
    },
    marketOpportunity: {
        tam: '$850B',
        growth: '45% CAGR',
        timeline: '2030',
    },
};

export const mockEnhancedResearchAnalysis = {
    executiveSummary:
        'Our comprehensive analysis reveals exceptional investment potential in this quantum computing startup. The company demonstrates world-class technical leadership, breakthrough technology with proven advantages, and strong positioning in a rapidly expanding market with $850B TAM by 2030.',
    keyInsights: [
        {
            type: 'positive' as const,
            title: 'Technical Breakthrough Validated',
            description:
                '15% improvement in quantum error correction efficiency with 250 microsecond coherence time - significant competitive advantage.',
            impact: 'high' as const,
        },
        {
            type: 'positive' as const,
            title: 'Exceptional Team Quality',
            description:
                'A+ founding team with 40+ years combined experience, 15 Nature/Science publications, and proven exit track record.',
            impact: 'high' as const,
        },
        {
            type: 'positive' as const,
            title: 'Strong Market Positioning',
            description:
                'Strategic partnerships with IBM Research and Google Quantum provide validation and market access.',
            impact: 'medium' as const,
        },
        {
            type: 'risk' as const,
            title: 'Commercial Execution Risk',
            description:
                'Limited experience in quantum computing commercialization and pharmaceutical market penetration.',
            impact: 'medium' as const,
        },
        {
            type: 'neutral' as const,
            title: 'Financial Performance',
            description:
                '340% YoY revenue growth with improving margins (45% → 62%) and 24-month cash runway.',
            impact: 'low' as const,
        },
    ],
    recommendation:
        'STRONG BUY with HIGH confidence. This represents a top 5% technical team addressing a massive market opportunity with proven technology advantages. The risk-reward profile is highly attractive for early-stage quantum computing investment.',
    fullAnalysis: `# Detailed Investment Analysis

## Technical Innovation Deep Dive

### Quantum Error Correction Breakthrough
Our technical due diligence confirms the company's novel approach to quantum error correction represents a genuine breakthrough:
- **15% efficiency improvement** over current industry standards
- **250 microsecond coherence time** - among the highest achieved
- **12 patents filed** with strong IP protection strategy
- Validated by independent research published in Nature Quantum Information

### Scalability Validation
- Demonstrated scalability up to **1000 qubits** in laboratory conditions  
- Production roadmap targets **10,000 qubit systems** by 2026
- Manufacturing partnerships established with leading quantum hardware providers

## Market Analysis

### Total Addressable Market
- **$850B projected TAM by 2030** across multiple verticals
- **45% CAGR** in quantum computing applications
- Early mover advantage in pharmaceutical simulation (**$12B sub-market**)

### Competitive Landscape
- Direct competition limited to 3-4 well-funded startups
- Major tech companies (IBM, Google, Microsoft) focus on different approaches
- Strong differentiation through error correction methodology

## Financial Deep Dive

### Revenue Performance
- **$2.5M ARR** with 340% year-over-year growth
- **15 enterprise customers** including 3 Fortune 100 companies
- **$150K average contract value** with 2-year terms

### Unit Economics
- Gross margins improved from 45% to 62% over 18 months
- Customer acquisition cost: **$45K**
- Customer lifetime value: **$850K** (18.9x LTV/CAC ratio)

### Capital Efficiency
- **$8M raised to date** across seed and Series A
- **24 months cash runway** at current burn rate
- Path to profitability by Q4 2025 with current growth trajectory

## Risk Assessment

### Technology Risks
- **LOW**: Breakthrough validated by independent research and strategic partners
- Key technical milestones achieved ahead of schedule
- Strong IP portfolio provides competitive moat

### Market Risks  
- **MEDIUM**: Large TAM but adoption timeline uncertain
- Regulatory environment for quantum computing still evolving
- Competition from well-funded incumbents

### Execution Risks
- **MEDIUM**: First-time CEO but strong advisory support
- Commercial team needs strengthening for pharmaceutical vertical
- Scaling challenges as organization grows

## Investment Recommendation

**STRONG BUY** - This investment represents an exceptional opportunity to participate in the quantum computing revolution with a technically superior team and proven technology advantages.`,
};

export const mockResearchAnalysis = `# Investment Research Analysis: Quantum Computing Startup

## Executive Summary

Our analysis reveals **strong potential** in the quantum computing sector, with this startup demonstrating significant technical advancement and market positioning.

## Key Findings

### Technical Innovation
- Novel approach to quantum error correction showing **15% improvement** over existing methods
- Strong intellectual property portfolio with 12 patents filed
- Breakthrough in quantum coherence time achieving **250 microseconds**

### Market Opportunity
- Total addressable market projected at **$850B by 2030**
- Early mover advantage in pharmaceutical simulation applications
- Strategic partnerships with [IBM Research](https://research.ibm.com) and [Google Quantum](https://quantumai.google)

### Financial Analysis
- Revenue growth of **340% YoY**
- Gross margins improving from 45% to 62%
- Cash runway of 24 months at current burn rate

## Risk Assessment

**Medium Risk** - Technical execution risk balanced by strong team and market demand.

### References
- [Nature Quantum Information Paper](https://nature.com/articles/quantum-2023) - Core technical breakthrough
- [McKinsey Quantum Report](https://mckinsey.com/quantum-2024) - Market analysis
- [MIT Technology Review](https://technologyreview.com/quantum-startups) - Industry overview`;

export const mockEnhancedPapers = [
    {
        id: 1,
        title: 'Scalable Quantum Error Correction Using Surface Codes',
        authors: 'Chen, L., Martinez, R., Thompson, K.',
        year: 2024,
        citations: 127,
        relevance: 'high' as const,
        impact: 'significant' as const,
        technicalMerit: 'excellent' as const,
        abstract:
            'We present a novel approach to quantum error correction using surface codes that achieves unprecedented scalability. Our method demonstrates a 15% improvement in error correction efficiency while reducing computational overhead by 23%.',
        evaluation: `**Investment Implications: VERY POSITIVE**

This research directly validates the startup's core quantum error correction technology and provides strong evidence for their competitive advantages.

## Key Investment Points

• **Technical Validation**: 15% efficiency improvement aligns with startup's claims
• **Scalability Proof**: Demonstrated up to 1000 qubits supports production roadmap  
• **IP Opportunity**: Novel surface code methods could strengthen patent portfolio
• **Market Timing**: Research momentum indicates market readiness for solutions

## Competitive Analysis
- Method is directly applicable to startup's architecture
- 23% computational overhead reduction creates significant cost advantages
- Strong theoretical foundation reduces technical execution risk

**Bottom Line**: This paper significantly de-risks the technical thesis and supports premium valuation multiples for quantum error correction solutions.`,
        url: 'https://arxiv.org/abs/2024.quantum.001',
    },
    {
        id: 2,
        title: 'Commercial Applications of Quantum Computing in Drug Discovery',
        authors: 'Patel, S., Wilson, M., Lee, J.',
        year: 2023,
        citations: 89,
        relevance: 'high' as const,
        impact: 'moderate' as const,
        technicalMerit: 'good' as const,
        abstract:
            'This study examines the practical applications of quantum computing in pharmaceutical research, focusing on molecular simulation and drug design optimization.',
        evaluation: `**Investment Implications: POSITIVE**

Strong market validation for quantum computing applications in pharmaceutical sector, directly supporting startup's go-to-market strategy.

## Market Opportunity Analysis

• **TAM Validation**: $12B addressable market in pharma quantum applications
• **Value Proposition**: 40% reduction in drug discovery timelines  
• **Commercial Readiness**: Multiple pharma companies actively piloting quantum solutions
• **Regulatory Clarity**: Pathway for quantum-enhanced drug approval becoming established

## Strategic Implications
- Confirms pharmaceutical vertical as priority market for startup
- Timeline compression creates compelling ROI for enterprise customers  
- Regulatory acceptance removes key adoption barrier

**Bottom Line**: Validates commercial strategy and supports aggressive customer acquisition targets in pharmaceutical segment.`,
        url: 'https://doi.org/10.1038/quantum-pharma-2023',
    },
    {
        id: 3,
        title: 'Quantum Advantage in Financial Modeling and Risk Assessment',
        authors: 'Brown, A., Davis, C., Kumar, V.',
        year: 2024,
        citations: 203,
        relevance: 'medium' as const,
        impact: 'significant' as const,
        technicalMerit: 'excellent' as const,
        abstract:
            'We demonstrate quantum advantage in portfolio optimization and risk modeling, achieving exponential speedup for certain classes of financial problems.',
        evaluation: `**Investment Implications: OPPORTUNISTIC**

While not core to current strategy, represents significant adjacent market opportunity for future expansion.

## Diversification Opportunity

• **Market Expansion**: New revenue vertical beyond pharmaceutical focus
• **Technical Leverage**: Same quantum advantage principles apply
• **Customer Base**: High-value financial services clients
• **Proven Results**: 35% accuracy improvement in risk modeling

## Strategic Considerations
- Could accelerate revenue growth through market diversification
- Financial services customers typically have higher contract values
- May require different go-to-market approach and industry expertise

**Bottom Line**: Strong optionality value - provides multiple expansion paths if pharmaceutical market develops slower than expected.`,
        url: 'https://arxiv.org/abs/2024.quantum.finance',
    },
    {
        id: 4,
        title: 'Hardware Requirements for Fault-Tolerant Quantum Computing',
        authors: 'Kim, Y., Anderson, P., Zhang, L.',
        year: 2024,
        citations: 156,
        relevance: 'medium' as const,
        impact: 'moderate' as const,
        technicalMerit: 'good' as const,
        abstract:
            'Analysis of hardware requirements and constraints for implementing fault-tolerant quantum computing systems at scale.',
        evaluation: `**Investment Implications: CAUTIONARY**

Important technical context but raises some concerns about hardware scaling challenges.

## Risk Assessment

• **Scaling Challenges**: Hardware requirements may be more demanding than anticipated
• **Cost Implications**: Fault-tolerance could require significant infrastructure investment
• **Timeline Impact**: Hardware constraints may delay commercial deployment

## Mitigation Factors
- Startup's error correction approach may reduce hardware requirements
- Partnership strategy could address infrastructure challenges
- Market demand may justify higher infrastructure costs

**Bottom Line**: Important to monitor hardware scaling challenges, but startup's approach may offer advantages in addressing these constraints.`,
        url: 'https://arxiv.org/abs/2024.hardware.quantum',
    },
];

export const mockPapers = [
    {
        id: 1,
        title: 'Scalable Quantum Error Correction Using Surface Codes',
        authors: 'Chen, L., Martinez, R., Thompson, K.',
        year: 2024,
        citations: 127,
        abstract:
            'We present a novel approach to quantum error correction using surface codes that achieves unprecedented scalability. Our method demonstrates a 15% improvement in error correction efficiency while reducing computational overhead by 23%.',
        evaluation: `## Paper Evaluation

**Relevance: High** - Directly applicable to the startup's core technology

**Technical Merit: Excellent** - Rigorous methodology and reproducible results

**Impact: Significant** - Addresses major scalability challenges in quantum computing

### Key Insights
- Novel surface code implementation reduces overhead
- Scalability demonstrated up to 1000 qubits
- Strong theoretical foundation with practical applications

**Investment Implication:** This research validates the startup's technical approach and suggests significant competitive advantages.`,
        url: 'https://arxiv.org/abs/2024.quantum.001',
    },
    {
        id: 2,
        title: 'Commercial Applications of Quantum Computing in Drug Discovery',
        authors: 'Patel, S., Wilson, M., Lee, J.',
        year: 2023,
        citations: 89,
        abstract:
            'This study examines the practical applications of quantum computing in pharmaceutical research, focusing on molecular simulation and drug design optimization.',
        evaluation: `## Paper Evaluation

**Relevance: High** - Maps to target market applications

**Technical Merit: Good** - Solid analysis of commercial viability

**Impact: Moderate** - Provides market validation but limited technical novelty

### Key Insights
- $12B addressable market in pharma quantum applications
- 40% reduction in drug discovery timelines demonstrated
- Regulatory pathway becoming clearer

**Investment Implication:** Confirms market opportunity and commercial viability of quantum applications.`,
        url: 'https://doi.org/10.1038/quantum-pharma-2023',
    },
    {
        id: 3,
        title: 'Quantum Advantage in Financial Modeling and Risk Assessment',
        authors: 'Brown, A., Davis, C., Kumar, V.',
        year: 2024,
        citations: 203,
        abstract:
            'We demonstrate quantum advantage in portfolio optimization and risk modeling, achieving exponential speedup for certain classes of financial problems.',
        evaluation: `## Paper Evaluation

**Relevance: Medium** - Adjacent market opportunity

**Technical Merit: Excellent** - Demonstrates clear quantum advantage

**Impact: High** - Opens new market verticals

### Key Insights
- Exponential speedup in portfolio optimization
- Risk modeling accuracy improved by 35%
- Commercial implementations already emerging

**Investment Implication:** Suggests diversification opportunities and additional revenue streams.`,
        url: 'https://arxiv.org/abs/2024.quantum.finance',
    },
];

export const mockEnhancedTeamAnalysis = {
    overallRating: 'A+' as const,
    overallDescription:
        'Exceptional founding team with complementary skills, proven track records, and world-class technical expertise in quantum physics and engineering.',
    strengths: [
        {
            category: 'Technical Leadership',
            score: 95,
            description:
                'World-class quantum physics expertise with 15+ publications in Nature/Science',
        },
        {
            category: 'Execution Track Record',
            score: 90,
            description:
                'Previous successful exit ($340M to Intel) and strong operational discipline',
        },
        {
            category: 'Industry Recognition',
            score: 88,
            description: 'MIT TR Innovator, IEEE Fellows, Nobel laureate advisor',
        },
        {
            category: 'Fundraising Ability',
            score: 85,
            description: '$45M raised across previous ventures with strong investor relationships',
        },
        {
            category: 'Commercial Experience',
            score: 65,
            description: 'Limited quantum commercialization experience, needs strengthening',
        },
    ],
    highlights: [
        {
            icon: 'award' as const,
            title: 'Combined Experience',
            value: '40+ Years',
            description: 'At leading research institutions (IBM, Google, MIT)',
        },
        {
            icon: 'star' as const,
            title: 'Publications',
            value: '15',
            description: 'Nature/Science papers with 2,500+ total citations',
        },
        {
            icon: 'dollar' as const,
            title: 'Previous Exit',
            value: '$340M',
            description: 'Successful acquisition by Intel in 2019',
        },
        {
            icon: 'building' as const,
            title: 'Patent Portfolio',
            value: '12 Patents',
            description: 'Filed in quantum error correction and control systems',
        },
    ],
    riskFactors: [
        'Limited experience in quantum computing commercialization and pharmaceutical market penetration',
        'First-time CEO role for technical founder, though mitigated by strong advisory support',
        'Need for senior commercial hire with enterprise sales experience',
        'Team scaling challenges as organization grows beyond current 15-person size',
    ],
    recommendation:
        'This team represents the top 5% of technical teams evaluated. The combination of world-class technical expertise and proven execution track record significantly de-risks the investment despite commercial execution challenges.',
    fullAnalysis: `# Detailed Team Analysis: Quantum Dynamics Inc.

## Leadership Assessment

### Dr. Sarah Chen - CEO & Co-founder
**Overall Rating: A+**

#### Technical Excellence
- 12 years at IBM Quantum Research, led development of 127-qubit processor
- PhD MIT in Quantum Physics, focused on error correction algorithms  
- 8 patents filed in quantum error correction, 15 peer-reviewed publications
- MIT Technology Review Innovator Under 35 (2022)

#### Commercial Capabilities
- Led IBM's first commercial quantum product launch ($50M revenue)
- Scaled quantum engineering team from 5 to 50 people
- Strong fundraising track record ($45M across previous roles)
- First-time CEO but exceptional advisory support (Nobel laureate, 3 Fortune 500 CEOs)

#### Risk Mitigation
- Limited pharmaceutical industry experience mitigated by advisory board
- Strong technical leadership compensates for commercial learning curve

### Dr. Michael Rodriguez - CTO & Co-founder  
**Overall Rating: A**

#### Technical Systems Expertise
- 10 years at Google Quantum AI, core contributor to quantum supremacy demonstration
- PhD Stanford in Quantum Systems, specialized in hardware-software integration
- 22 publications in quantum control systems, 6 patents filed
- Led development of quantum compiler optimizations used industry-wide

#### Team Building & Execution
- Managed 20+ person engineering team at Google
- Strong track record of meeting technical milestones on schedule
- Excellent complement to CEO (hardware focus vs. algorithms)
- Proven ability to translate research into production systems

### Lisa Thompson - VP Business Development
**Overall Rating: B+**

#### Commercial Strength
- 8 years at Accenture Quantum, built practice from 0 to $50M revenue
- MBA Wharton, specialized in technology commercialization
- Strong relationships with Fortune 100 pharmaceutical companies
- 15 successful enterprise partnerships closed

#### Growth Areas
- Limited startup experience (primarily corporate background)
- No direct P&L responsibility in previous roles
- Would benefit from senior sales executive addition

## Team Composition Analysis

### Technical Team (12 people)
- **Quantum Physicists (4)**: PhDs from MIT, Stanford, Caltech, Harvard
- **Software Engineers (5)**: Specializing in quantum algorithms and control software
- **Hardware Engineers (3)**: Quantum systems and cryogenic engineering backgrounds

### Business Team (3 people)
- **Business Development (2)**: Led by Lisa Thompson, enterprise partnerships focus
- **Operations (1)**: Former startup COO, scaling and operational excellence

## Advisory Board Assessment

### Strategic Value
- **Nobel Laureate in Physics**: Provides scientific credibility and technical guidance
- **3 Fortune 500 CEOs**: IBM, Roche, Microsoft - direct market access and operational advice
- **2 Former VCs**: Sequoia, a16z partners - fundraising and strategic guidance

### Industry Connections
- Direct lines to potential customers through pharmaceutical and technology advisors  
- Access to talent pipeline through academic and research institution connections
- Strategic partnership opportunities through corporate advisor networks

## Competitive Benchmarking

### vs. Other Quantum Startups
- **Top 5% technical team quality** based on publications and experience
- **Above average execution track record** due to previous exit experience
- **Average commercial capabilities** - typical for early-stage deep tech

### vs. Big Tech Quantum Teams
- **Competitive technical talent** - team members came from leading programs
- **Superior focus** - dedicated to specific quantum computing applications
- **Higher risk tolerance** - willing to tackle harder commercial problems

## Scaling Roadmap

### Next 12 Months
- Add VP of Sales with enterprise software background
- Hire 3 additional quantum software engineers  
- Expand QA and regulatory affairs capabilities
- Add CFO for Series B preparation

### 12-24 Months  
- Scale engineering team to 35 people
- Add pharmaceutical industry expertise to business team
- Establish European operations and business development
- Build customer success and support functions

## Investment Risk Assessment

### Technical Risk: **LOW**
- World-class team with proven track record
- Technology validated by independent research
- Strong IP portfolio provides competitive protection

### Commercial Risk: **MEDIUM**  
- Pharmaceutical market new to team
- Enterprise sales capability needs development
- Market timing risk for quantum adoption

### Execution Risk: **LOW-MEDIUM**
- First-time CEO mitigated by strong advisors
- Proven ability to scale technical teams
- Strong operational discipline from previous experience

## Recommendation

**STRONG BUY on team quality.** This represents an exceptional technical founding team with proven execution capabilities. While commercial risks exist, they are addressable through strategic hires and the team's demonstrated ability to execute and scale.

The combination of world-class technical expertise, previous successful exit experience, and strong industry relationships creates a compelling investment thesis despite identified growth areas in commercial execution.`,
};

export const mockTeamAnalysis = `# Team Analysis: Quantum Dynamics Inc.

## Overall Assessment: **A+ Team**

This is an exceptional founding team with complementary skills and proven track records in quantum physics, engineering, and business development.

## Strengths

### Technical Leadership
- **World-class expertise** in quantum error correction
- Combined **40+ years** of experience at leading research institutions
- **15 Nature/Science publications** among team members
- Strong patent portfolio with proven ability to translate research into IP

### Execution Capability  
- Previous startup experience with **successful exit** (acquired by Intel for $340M)
- Strong operational discipline and milestone achievement
- Effective fundraising track record (**$45M raised** across previous ventures)

### Industry Recognition
- Dr. Sarah Chen: **MIT Technology Review Innovator Under 35**
- Multiple team members are **IEEE Fellows**
- Advisory board includes Nobel laureate in Physics

## Growth Areas

### Commercial Experience
- Limited experience in quantum computing commercialization
- Would benefit from senior commercial hire with enterprise sales experience
- Product-market fit validation needed for pharmaceutical applications

### Team Scaling
- Engineering team needs expansion for production system development
- Business development capabilities require strengthening
- Quality assurance and regulatory expertise gaps identified

## Risk Mitigation

The team's technical excellence significantly de-risks execution on the core technology. Primary risks relate to commercial execution and market development, which can be addressed through strategic hires and advisory additions.

**Recommendation:** This team represents the **top 5%** of technical teams we've evaluated. Strong investment case despite commercial execution risks.`;

export const mockEnhancedTeamMembers = [
    {
        id: 1,
        name: 'Dr. Sarah Chen',
        role: 'CEO & Co-founder',
        background:
            'Former Principal Research Scientist at IBM Quantum, PhD MIT. Led development of IBM 127-qubit processor and first commercial quantum product.',
        rating: 'A+' as const,
        experience: 12,
        publications: 15,
        patents: 8,
        previousExits: 0,
        keyStrengths: [
            'World-class technical expertise in quantum error correction',
            'Proven commercialization experience at IBM',
            'Strong fundraising track record ($45M raised)',
            'Exceptional team scaling ability (5 to 50 engineers)',
            'MIT Technology Review Innovator Under 35 (2022)',
        ],
        riskFactors: [
            'First-time CEO role',
            'Limited pharmaceutical industry experience',
            'Transition from corporate to startup environment',
        ],
        analysis: `**Investment Implications: VERY STRONG**

Dr. Chen represents the ideal technical founder-CEO profile for deep tech investment.

## Leadership Excellence

• **Technical Credibility**: 12 years at IBM Quantum Research, led 127-qubit processor development
• **Commercial Validation**: Led IBM's first commercial quantum product ($50M revenue)
• **Team Building**: Successfully scaled quantum engineering team 10x (5 to 50 engineers)
• **Industry Recognition**: MIT TR Innovator Under 35, widely respected in quantum community

## Risk Mitigation

While first-time CEO, several factors significantly reduce execution risk:
- Exceptional advisory support (Nobel laureate, Fortune 500 CEOs)
- Proven ability to operate at scale within IBM structure
- Strong technical foundation reduces core technology risk
- Track record of translating research into commercial products

## Investment Thesis

Dr. Chen's combination of world-class technical expertise and proven commercial instincts makes her an exceptional founding CEO. The technical credibility alone provides significant competitive advantage in enterprise sales cycles.

**Bottom Line**: Represents top 1% of technical founder-CEOs. Strong technical leadership significantly de-risks core technology execution.`,
    },
    {
        id: 2,
        name: 'Dr. Michael Rodriguez',
        role: 'CTO & Co-founder',
        background:
            'Former Staff Engineer at Google Quantum AI, PhD Stanford. Core contributor to Google quantum supremacy demonstration.',
        rating: 'A' as const,
        experience: 10,
        publications: 22,
        patents: 6,
        previousExits: 0,
        keyStrengths: [
            'Deep quantum hardware-software integration expertise',
            'Production-scale experience at Google Quantum AI',
            'Strong engineering team leadership (20+ people)',
            'Proven ability to meet complex technical milestones',
            'Industry-wide impact through quantum compiler work',
        ],
        riskFactors: [
            'Limited business development experience',
            'Technical perfectionism could delay time-to-market',
            'Transition from large tech company to startup pace',
        ],
        analysis: `**Investment Implications: STRONG**

Dr. Rodriguez provides critical technical depth and production experience essential for quantum startup success.

## Technical Excellence

• **Systems Expertise**: Deep understanding of full quantum stack (hardware + software)
• **Production Experience**: Google Quantum AI background provides scale perspective
• **Engineering Leadership**: Proven ability to manage complex technical teams (20+ engineers)
• **Industry Impact**: Quantum compiler optimizations used across industry

## Complementary Partnership

Perfect technical complement to CEO Chen:
- Hardware focus vs. her algorithms expertise
- Production systems experience vs. her research background
- Engineering leadership vs. her business development skills

## Risk Assessment

Main risks are typical for technical co-founders:
- Limited commercial exposure could slow business development
- High technical standards may impact product launch timing
- Adjustment from Google's resources to startup constraints

**Bottom Line**: Exceptional technical co-founder with proven ability to build production quantum systems. Critical for successful technology execution.`,
    },
    {
        id: 3,
        name: 'Lisa Thompson',
        role: 'VP of Business Development',
        background:
            'Former Director at Accenture Quantum, MBA Wharton. Built Accenture quantum consulting practice from 0 to $50M revenue.',
        rating: 'B+' as const,
        experience: 8,
        publications: 0,
        patents: 0,
        previousExits: 0,
        keyStrengths: [
            'Strong enterprise relationships in quantum ecosystem',
            'Proven business building experience ($50M practice)',
            'Direct pharmaceutical industry partnerships',
            'Strategic consulting background',
            'Strong educational foundation (Wharton MBA)',
        ],
        riskFactors: [
            'Limited startup experience (primarily corporate)',
            'No direct P&L responsibility in previous roles',
            'Quantum industry still developing commercial maturity',
            'Need to adapt consulting skills to product sales',
        ],
        analysis: `**Investment Implications: POSITIVE**

Lisa provides essential commercial capabilities that balance the technical founding team, though with some startup execution risk.

## Commercial Strengths

• **Market Access**: Direct relationships with Fortune 100 pharmaceutical companies
• **Business Building**: Grew Accenture practice from zero to $50M revenue
• **Industry Expertise**: Deep quantum ecosystem knowledge and network
• **Enterprise Sales**: 15 successful enterprise partnerships closed

## Strategic Value

Addresses key gap in technical founding team:
- Commercial focus balances deep technical expertise
- Pharmaceutical relationships accelerate customer acquisition
- Consulting background provides strategic perspective on enterprise adoption

## Risk Assessment

Primary concerns relate to startup transition:
- Corporate background may not translate to startup urgency
- No previous P&L ownership could impact commercial discipline
- Quantum market still early - sales cycle uncertainty

## Recommendation

Strong commercial addition that significantly improves team balance. While startup risk exists, pharmaceutical relationships and business building experience provide material value.

**Bottom Line**: Important commercial hire that addresses founding team gaps. Monitor execution but provides valuable market access and enterprise relationships.`,
    },
];

export const mockTeamMembers = [
    {
        id: 1,
        name: 'Dr. Sarah Chen',
        role: 'CEO & Co-founder',
        background: 'Former Principal Research Scientist at IBM Quantum, PhD MIT',
        analysis: `## Dr. Sarah Chen - CEO Analysis

**Overall Rating: A+**

### Strengths
- **Exceptional technical leader** with 12 years at IBM Quantum
- **Proven commercialization experience** - led IBM's first commercial quantum product
- **Strong fundraising track record** - raised $45M in previous role
- **15 peer-reviewed publications** in top-tier journals

### Key Achievements
- Led development of IBM's 127-qubit processor
- Filed 8 patents in quantum error correction
- MIT Technology Review Innovator Under 35 (2022)
- Successfully scaled quantum team from 5 to 50 engineers

### Risk Factors
- First time CEO (mitigated by strong advisory support)
- Limited experience in pharmaceutical vertical

**Investment Implication:** World-class technical leader with strong commercial instincts. Excellent founding CEO choice.`,
    },
    {
        id: 2,
        name: 'Dr. Michael Rodriguez',
        role: 'CTO & Co-founder',
        background: 'Former Staff Engineer at Google Quantum AI, PhD Stanford',
        analysis: `## Dr. Michael Rodriguez - CTO Analysis

**Overall Rating: A**

### Strengths
- **Deep systems expertise** in quantum hardware-software stack
- **Production-scale experience** at Google Quantum AI
- **Strong engineering leadership** - managed 20+ person team
- **Complementary skills** to CEO (hardware focus vs. algorithms)

### Key Achievements
- Core contributor to Google's quantum supremacy demonstration
- 22 publications in quantum systems and hardware
- Led development of quantum compiler optimizations
- 6 patents in quantum control systems

### Risk Factors
- Limited business development experience
- Technical perfectionism may impact time-to-market

**Investment Implication:** Excellent technical co-founder with proven ability to build production quantum systems.`,
    },
    {
        id: 3,
        name: 'Lisa Thompson',
        role: 'VP of Business Development',
        background: 'Former Director at Accenture Quantum, MBA Wharton',
        analysis: `## Lisa Thompson - VP Business Development Analysis

**Overall Rating: B+**

### Strengths
- **Strong enterprise relationships** in target markets
- **Quantum industry experience** at Accenture's quantum practice
- **Commercial focus** balances technical founding team
- **Partnership development expertise** - closed 15 enterprise partnerships

### Key Achievements
- Built Accenture's quantum consulting practice from 0 to $50M revenue
- Led partnerships with 3 Fortune 100 pharmaceutical companies
- MBA with focus on technology commercialization
- Strong network in quantum ecosystem

### Risk Factors
- Limited startup experience (mostly corporate background)
- No direct P&L responsibility in previous roles

**Investment Implication:** Strong commercial addition to technical team. Addresses key gap in enterprise sales and partnerships.`,
    },
];
