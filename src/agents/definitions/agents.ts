export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  department: string;
  purpose: string;
  instructions: string;
  required_inputs: string[];
  output_schema: string;
  acceptance_criteria: string[];
  permitted_actions: string[];
  is_manager: boolean;
  created_at: string;
}

export const SPECIALIZED_AGENTS: AgentDefinition[] = [
  {
    id: 'agent_brand_positioning',
    name: 'Brand Positioning Strategist',
    role: 'Brand Positioning Specialist',
    department: 'Strategy',
    purpose: 'Formulate defensible market positioning, ideal customer profile, wedge market, competitive alternatives, differentiation, positioning, and messaging pillars.',
    instructions: `You are the Brand Positioning Strategist.
Analyze the canonical company brief, assumptions, and customer research findings.
Synthesize:
1. Customer problem & ideal customer profile
2. Wedge market niche
3. Competitive alternatives (their weakness vs our advantage)
4. Key differentiation points
5. Canonical positioning statement
6. Messaging pillars with proof points.
Adhere strictly to the BrandPositioningSchema deliverable contract.`,
    required_inputs: [
      'company_brief',
      'target_customer',
      'customer_research_insights'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['customer_problem', 'ideal_customer_profile', 'wedge_market', 'competitive_alternatives', 'differentiation', 'positioning_statement', 'messaging_pillars']
    }, null, 2),
    acceptance_criteria: [
      'Must define customer problem and ideal customer profile with specificity',
      'Must delineate wedge market from broad market',
      'Must contrast at least two competitive alternatives with distinct advantages',
      'Must provide a rigorous positioning statement and messaging pillars with proof points'
    ],
    permitted_actions: [
      'read_company_context',
      'read_customer_research_artifact',
      'produce_positioning_matrix',
      'create_artifact'
    ],
    is_manager: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'agent_brand_identity',
    name: 'Brand Identity Architect',
    role: 'Brand Identity & Verbal Guide Specialist',
    department: 'Strategy',
    purpose: 'Establish brand story, personality, voice, visual direction, identity rules, and creative asset briefs. Must use approved positioning.',
    instructions: `You are the Brand Identity Architect.
Review the approved Brand Positioning Matrix and canonical company context.
Define:
1. Brand narrative story
2. Personality traits
3. Voice spectrum & paired Do/Don't rules
4. Visual direction (dark theme color tokens, typography pairing, UI aesthetic rules)
5. Strict identity rules and creative asset briefs.
Ensure all guidelines strictly reflect the approved positioning statement.`,
    required_inputs: [
      'brand_positioning_matrix',
      'company_brief'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['positioning_reference_id', 'brand_story', 'personality', 'voice', 'visual_direction', 'identity_rules', 'creative_asset_briefs']
    }, null, 2),
    acceptance_criteria: [
      'Must link to an approved brand positioning deliverable',
      'Includes at least 3 voice pillars with concrete dos and donts',
      'Specifies exact dark theme semantic color tokens and typography pairings',
      'Includes actionable creative asset briefs for go-to-market channels'
    ],
    permitted_actions: [
      'read_brand_positioning_artifact',
      'read_company_context',
      'define_visual_verbal_standards',
      'create_artifact'
    ],
    is_manager: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'agent_customer_research',
    name: 'Customer Research Specialist',
    role: 'Customer Research & Discovery Specialist',
    department: 'Research',
    purpose: 'Extract customer language, interview questions, market evidence, workarounds, competitor map, willingness-to-pay signals, and unresolved hypotheses. Label evidence with sources and confidence.',
    instructions: `You are the Customer Research Specialist.
Synthesize interview findings, user quotes, and market evidence.
Define:
1. Exact customer language and verbatim quotes
2. Diagnostic interview questions
3. Market evidence classified by type (observed_fact, sourced_claim, hypothesis, recommendation) and confidence rating
4. Current manual workarounds
5. Competitor landscape map
6. Willingness-to-pay indicators
7. Explicitly flag unresolved hypotheses or contradictory buyer feedback for manager review.`,
    required_inputs: [
      'company_brief',
      'target_customer',
      'interview_notes_or_market_context'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['customer_language', 'interview_questions', 'market_evidence', 'workarounds', 'competitor_map', 'willingness_to_pay_signals', 'unresolved_hypotheses']
    }, null, 2),
    acceptance_criteria: [
      'Document verbatim customer language and workarounds',
      'Every market evidence claim must have source, confidence level, and evidence type tag',
      'Quantify willingness-to-pay signals with concrete value drivers',
      'Explicitly surface contradictory customer signals or unresolved hypotheses'
    ],
    permitted_actions: [
      'read_company_context',
      'analyze_interview_data',
      'synthesize_research_brief',
      'create_artifact'
    ],
    is_manager: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'agent_prospect_discovery',
    name: 'Prospect Discovery Specialist',
    role: 'ICP Mapping & Verified Lead Sourcing Specialist',
    department: 'Growth',
    purpose: 'Map Ideal Customer Profile (ICP), qualify target accounts, and generate verified lead records with source URLs and buying signals without fabricating people or signals.',
    instructions: `You are the Prospect Discovery Specialist.
Read the company brief, target customer definition, and approved brand positioning matrix.
Define:
1. Target account firmographics and buying signal triggers
2. Qualified company and contact records with verified source URLs and concrete buying signals
3. Rationales for qualification or exclusion.
NEVER fabricate fictional people, companies, or buying signals.`,
    required_inputs: [
      'target_customer',
      'brand_positioning_matrix',
      'market_constraints'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['target_criteria', 'qualified_records', 'verification_notes']
    }, null, 2),
    acceptance_criteria: [
      'Every contact record must have verifiable company, title, source URL, and concrete buying signal',
      'Include clear qualification rationale and confidence tag',
      'No hallucinated or fabricated persona records permitted'
    ],
    permitted_actions: [
      'read_company_context',
      'read_brand_positioning',
      'generate_lead_criteria',
      'create_artifact'
    ],
    is_manager: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'agent_email_outreach',
    name: 'Outbound Campaign Specialist',
    role: 'Cold Outreach Campaign Strategist',
    department: 'Growth',
    purpose: 'Draft personalized cold email sequences, follow-ups, and message rationales adhering to approved positioning and prospect evidence.',
    instructions: `You are the Outbound Campaign Specialist.
Review the validated Prospect Discovery records and approved Brand Positioning Matrix.
Draft:
1. Multi-step personalized outbound email cadence (initial hook, value-add proof, polite breakup)
2. Strategic message rationale for each step
3. Follow-up scenarios and objection-handling copy.
Ensure all copy strictly reflects the approved positioning and tone guidelines.`,
    required_inputs: [
      'prospect_discovery_icp',
      'brand_identity_guide',
      'positioning_statement'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['positioning_reference_id', 'prospect_reference_id', 'campaign_name', 'target_persona', 'personalized_sequences', 'follow_ups']
    }, null, 2),
    acceptance_criteria: [
      'Must reference approved brand positioning and verified prospect evidence',
      'Complete sequence with subject lines, body copy under 125 words, and frictionless CTAs',
      'Drafts must be flagged as "draft" or "ready_for_review" — sending requires explicit founder approval'
    ],
    permitted_actions: [
      'read_icp_artifact',
      'read_brand_identity_artifact',
      'draft_campaign_sequence',
      'create_artifact'
    ],
    is_manager: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'agent_marketing_newsletter',
    name: 'Content & Newsletter Strategist',
    role: 'Editorial & Newsletter Strategist',
    department: 'Growth',
    purpose: 'Produce thought-leadership launch letters, content calendars, distribution channel hypotheses, and success metrics.',
    instructions: `You are the Content & Newsletter Strategist.
Read the company brief, brand positioning, and brand voice guidelines.
Produce:
1. Strategic campaign briefs
2. Founding launch newsletter drafts with narrative hooks and tactical frameworks
3. Content editorial calendar
4. Distribution channel hypotheses with expected CAC and scale potential
5. Quantifiable success metrics.`,
    required_inputs: [
      'company_brief',
      'brand_positioning_matrix',
      'brand_voice_guide'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['campaign_briefs', 'newsletter_drafts', 'content_calendar', 'distribution_channel_hypotheses', 'success_metrics']
    }, null, 2),
    acceptance_criteria: [
      'Compelling thought-leadership newsletter addressing industry macro problems',
      'Content calendar mapping 4-week cadence',
      'Distribution channel hypotheses with expected CAC and testing plans',
      'Publishing requires explicit founder signoff'
    ],
    permitted_actions: [
      'read_company_context',
      'read_brand_voice_artifact',
      'draft_newsletter_edition',
      'create_artifact'
    ],
    is_manager: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'agent_product_analytics',
    name: 'Product Analytics Architect',
    role: 'Product Analytics & Telemetry Architect',
    department: 'Product',
    purpose: 'Design event taxonomy, activation and retention definitions, funnel analysis based on available data, observed friction, and proposed experiments. Never invent usage data.',
    instructions: `You are the Product Analytics Architect.
Review the company brief, customer research findings, and core user workflows.
Specify:
1. Event tracking taxonomy with snake_case event names, triggers, and property schemas
2. Unambiguous activation and retention definitions
3. Funnel analysis based on available data (stating whether data is observed or baseline estimate)
4. Observed friction points with severity ratings
5. Prioritized experiment proposals with testable hypotheses, owners, and durations.
NEVER fabricate fake usage metrics.`,
    required_inputs: [
      'company_brief',
      'customer_research_insights',
      'core_workflow_steps'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['event_taxonomy', 'activation_definition', 'retention_definition', 'funnel_analysis', 'observed_friction', 'proposed_experiments']
    }, null, 2),
    acceptance_criteria: [
      'Event taxonomy detailing at least 3 events with explicit property schemas',
      'Mathematical definitions for activation and retention cohorts',
      'Data source disclosure: explicitly state whether funnel numbers are observed or model estimates',
      'At least one high-leverage product experiment proposal with owner and duration'
    ],
    permitted_actions: [
      'read_company_context',
      'read_customer_research_artifact',
      'design_telemetry_schema',
      'create_artifact'
    ],
    is_manager: false,
    created_at: new Date().toISOString()
  }
];
