export interface RoleDefinition {
  id: string;
  title: string;
  description: string;
  coordinated_agents: string[];
  approval_scope: string[];
  required_review_gates: string[];
}

export const COMPANY_ROLES: RoleDefinition[] = [
  {
    id: 'role_founder_ceo',
    title: 'Founder / CEO',
    description: 'Final decision-maker. Governs cross-functional priorities, approves consequential external actions (sending emails, budget commitments), and resolves conflicting hypotheses.',
    coordinated_agents: [
      'agent_brand_positioning',
      'agent_brand_identity',
      'agent_customer_research',
      'agent_prospect_discovery',
      'agent_email_outreach',
      'agent_marketing_newsletter',
      'agent_product_analytics'
    ],
    approval_scope: [
      'Outbound Launch Signoff',
      'External Publication of Newsletters',
      'Strategic Pivot & Major Assumptions',
      'Capital & Budget Commitments'
    ],
    required_review_gates: [
      'Consequential external actions require explicit CEO approval'
    ]
  },
  {
    id: 'role_strategy_manager',
    title: 'Strategy Manager',
    description: 'Coordinates brand positioning and brand identity. Guarantees that identity and outreach never consume unapproved positioning.',
    coordinated_agents: [
      'agent_brand_positioning',
      'agent_brand_identity'
    ],
    approval_scope: [
      'Brand Positioning Matrix & Category Wedge',
      'Visual & Verbal Brand Guidebook',
      'Competitive Moat Framework'
    ],
    required_review_gates: [
      'Brand Identity cannot be reviewed until Brand Positioning is approved'
    ]
  },
  {
    id: 'role_research_manager',
    title: 'Research Manager',
    description: 'Coordinates customer research, qualitative discovery, and evidence ledger hygiene. Enforces strict labeling of observed facts vs untested hypotheses.',
    coordinated_agents: [
      'agent_customer_research'
    ],
    approval_scope: [
      'Customer Pain Point Dossier',
      'Evidence Ledger Classification',
      'Willingness-to-Pay Assessment'
    ],
    required_review_gates: [
      'Must surface conflicting evidence rather than resolving silently'
    ]
  },
  {
    id: 'role_growth_manager',
    title: 'Growth Manager',
    description: 'Coordinates prospect discovery, cold outreach drafting, and marketing newsletter development. Verifies real prospect sources.',
    coordinated_agents: [
      'agent_prospect_discovery',
      'agent_email_outreach',
      'agent_marketing_newsletter'
    ],
    approval_scope: [
      'Verified Prospect Roster (No fabricated contacts)',
      'Cold Outreach Cadence Drafts',
      'Launch Newsletter Content'
    ],
    required_review_gates: [
      'Outreach sequences must strictly consume approved positioning and verified prospect evidence'
    ]
  },
  {
    id: 'role_product_manager',
    title: 'Product Manager',
    description: 'Coordinates product analytics, telemetry event schemas, and experimentation backlogs. Never permits invented usage numbers.',
    coordinated_agents: [
      'agent_product_analytics'
    ],
    approval_scope: [
      'Event Telemetry Schema',
      'Activation Funnel Milestones',
      'Product Experimentation Backlog'
    ],
    required_review_gates: [
      'Telemetry designs must only analyze actual observed data or clearly labeled baseline estimates'
    ]
  }
];
