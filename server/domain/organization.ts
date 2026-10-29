import { AgentDefinition, RoleDefinition } from './types.js';

export const COMPANY_ROLES: RoleDefinition[] = [
  {
    id: 'role_founder_ceo',
    title: 'Founder / CEO',
    description: 'Final decision-maker. Governs cross-functional priorities, approves major company decisions, capital allocation, and key brand milestones.',
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
      'Final Brand Positioning Approval',
      'Strategic Pivot Signoff',
      'Outbound Launch Signoff',
      'Product Analytics North Star Signoff'
    ]
  },
  {
    id: 'role_strategy_manager',
    title: 'Strategy Manager',
    description: 'Coordinates brand positioning and brand identity. Ensures coherence across strategic narrative, competitive differentiation, and design principles.',
    coordinated_agents: [
      'agent_brand_positioning',
      'agent_brand_identity'
    ],
    approval_scope: [
      'Brand Positioning Matrix',
      'Visual & Verbal Brand Guide',
      'Competitive Moat Framework'
    ]
  },
  {
    id: 'role_research_manager',
    title: 'Research Manager',
    description: 'Coordinates customer research. Oversees qualitative discovery, hypothesis validation, pain point mapping, and customer interview synthesis.',
    coordinated_agents: [
      'agent_customer_research'
    ],
    approval_scope: [
      'Customer Pain Point Taxonomy',
      'Interview Synthesis Brief',
      'Willingness-to-Pay Assessment'
    ]
  },
  {
    id: 'role_growth_manager',
    title: 'Growth Manager',
    description: 'Coordinates prospect discovery, email outreach, and marketing/newsletters. Optimizes the go-to-market funnel from ICP identification to conversion.',
    coordinated_agents: [
      'agent_prospect_discovery',
      'agent_email_outreach',
      'agent_marketing_newsletter'
    ],
    approval_scope: [
      'ICP & Account List Review',
      'Cold Email Sequences Review',
      'Marketing Newsletter Editions'
    ]
  },
  {
    id: 'role_product_manager',
    title: 'Product Manager',
    description: 'Coordinates product analytics. Formulates telemetry events, user journeys, funnel metrics, and telemetry instrumentation specifications.',
    coordinated_agents: [
      'agent_product_analytics'
    ],
    approval_scope: [
      'Product Telemetry Schema',
      'Activation Funnel Milestones',
      'North Star Metric Formulation'
    ]
  }
];

export const SPECIALIZED_AGENTS: AgentDefinition[] = [
  {
    id: 'agent_brand_positioning',
    name: 'Brand Positioning Strategist',
    role: 'Brand Positioning Specialist',
    department: 'Strategy',
    purpose: 'Formulate defensible market positioning, competitive moats, value wedge, and core category narrative.',
    instructions: `You are the Brand Positioning Strategist for the company.
Analyze the canonical company brief, current customer assumptions, and customer research findings.
Synthesize a defensible category positioning statement, an unfair advantage wedge, and a comprehensive competitor contrast matrix.
Highlight exactly what incumbents get wrong and why this solution creates a new category or superior wedge.
Ensure every claim is tied to verified customer pain points rather than generic marketing fluff.`,
    required_inputs: [
      'company_brief',
      'target_customer',
      'customer_research_insights'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['positioning_statement', 'category_name', 'value_wedge', 'competitor_matrix', 'key_differentiators', 'messaging_pillars'],
      properties: {
        positioning_statement: { type: 'string', description: 'Formula: For [target], [company] is the [category] that [benefit] unlike [competitors] because [wedge]' },
        category_name: { type: 'string' },
        value_wedge: { type: 'string' },
        competitor_matrix: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              competitor: { type: 'string' },
              their_approach: { type: 'string' },
              our_advantage: { type: 'string' }
            }
          }
        },
        key_differentiators: { type: 'array', items: { type: 'string' } },
        messaging_pillars: { type: 'array', items: { type: 'string' } }
      }
    }, null, 2),
    acceptance_criteria: [
      'Must provide a rigorous category positioning statement adhering to standard positioning calculus',
      'Must contrast at least two existing alternatives or incumbent paradigms with specific architectural/workflow differences',
      'Must ground value wedge directly in customer research pain points',
      'Deliverable must be structured as clear Markdown with executive summary'
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
    purpose: 'Establish verbal brand voice, visual aesthetics principles, design guidelines, and typography/color philosophy.',
    instructions: `You are the Brand Identity Architect.
Review the approved Brand Positioning Matrix and canonical company context.
Define the brand voice spectrum (e.g., authoritative vs approachable, technical vs colloquial) with concrete dos and don'ts.
Specify the visual design philosophy, high-contrast dark theme color tokens, typography pairing rationale, and UI component styling rules.
Ensure all tone guidelines reflect the positioning wedge and speak directly to engineering and executive buyers.`,
    required_inputs: [
      'brand_positioning_matrix',
      'company_brief'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['brand_voice_pillars', 'voice_dos_and_donts', 'visual_philosophy', 'design_tokens', 'ui_aesthetic_rules'],
      properties: {
        brand_voice_pillars: { type: 'array', items: { type: 'string' } },
        voice_dos_and_donts: {
          type: 'array',
          items: {
            type: 'object',
            properties: { rule: { type: 'string' }, do: { type: 'string' }, dont: { type: 'string' } }
          }
        },
        visual_philosophy: { type: 'string' },
        design_tokens: {
          type: 'object',
          properties: {
            palette: { type: 'array', items: { type: 'string' } },
            typography: { type: 'object' }
          }
        },
        ui_aesthetic_rules: { type: 'array', items: { type: 'string' } }
      }
    }, null, 2),
    acceptance_criteria: [
      'Must articulate at least 3 distinct voice pillars with paired Do/Don\'t examples',
      'Must specify an exact dark-mode color palette with semantic hexadecimal codes',
      'Must detail font pairings and monospace typography rules for technical workflows',
      'Output formatted as an actionable Brand Design Guidebook'
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
    purpose: 'Extract user pain points, purchase motivations, and friction loops from raw interviews and market observations.',
    instructions: `You are the Customer Research Specialist.
Analyze the target customer segment, industry context, and customer interview data.
Synthesize raw buyer comments into high-impact pain point clusters, quantify friction levels, and identify willingness-to-pay indicators.
Explicitly distinguish between validated user realities and untested team assumptions.
Flag any contradictory findings or buyer hesitation patterns for manager review.`,
    required_inputs: [
      'company_brief',
      'target_customer',
      'interview_notes_or_market_context'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['research_summary', 'pain_point_clusters', 'willingness_to_pay_signals', 'contradictory_evidence', 'actionable_insights'],
      properties: {
        research_summary: { type: 'string' },
        pain_point_clusters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              cluster_name: { type: 'string' },
              severity: { type: 'string', enum: ['critical', 'high', 'moderate'] },
              observed_behavior: { type: 'string' },
              representative_quote: { type: 'string' }
            }
          }
        },
        willingness_to_pay_signals: { type: 'array', items: { type: 'string' } },
        contradictory_evidence: { type: 'array', items: { type: 'string' } },
        actionable_insights: { type: 'array', items: { type: 'string' } }
      }
    }, null, 2),
    acceptance_criteria: [
      'At least 3 distinct validated pain point clusters documented with severity ratings',
      'Direct quotes or observational evidence linked to every identified cluster',
      'Explicit section highlighting contradictory customer signals or edge cases',
      'Deliverable formatted as a comprehensive Customer Discovery Dossier'
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
    role: 'ICP Mapping & Lead Generation Specialist',
    department: 'Growth',
    purpose: 'Map Ideal Customer Profile (ICP), qualify target accounts, and generate structured lead criteria.',
    instructions: `You are the Prospect Discovery Specialist.
Read the company brief, target customer definition, and approved brand positioning matrix.
Define precise Ideal Customer Profile (ICP) boundaries including employee count, tech stack criteria, triggers, and buying committees.
Produce actionable buyer personas with target titles, KPIs, and decision authority.
Structure an initial list of target accounts and qualification criteria for cold outreach.`,
    required_inputs: [
      'target_customer',
      'brand_positioning_matrix',
      'market_constraints'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['icp_definition', 'firmographics', 'buyer_personas', 'account_qualification_matrix', 'sample_target_accounts'],
      properties: {
        icp_definition: { type: 'string' },
        firmographics: {
          type: 'object',
          properties: {
            company_size: { type: 'string' },
            industries: { type: 'array', items: { type: 'string' } },
            geographies: { type: 'array', items: { type: 'string' } },
            tech_stack_prerequisites: { type: 'array', items: { type: 'string' } }
          }
        },
        buyer_personas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role_title: { type: 'string' },
              primary_pain: { type: 'string' },
              eval_criteria: { type: 'string' }
            }
          }
        },
        sample_target_accounts: { type: 'array', items: { type: 'string' } }
      }
    }, null, 2),
    acceptance_criteria: [
      'Defines at least 2 distinct buyer persona profiles with role titles and KPIs',
      'Provides quantifiable firmographic and technographic qualification filters',
      'Lists at least 5 representative target company profiles matching criteria',
      'Formatted as a structured ICP & Account Targeting Playbook'
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
    purpose: 'Draft high-converting personalized cold email sequences adhering to verbal identity and positioning.',
    instructions: `You are the Outbound Campaign Specialist.
Review the ICP Targeting Playbook, Brand Identity Guidebook, and Brand Positioning Matrix.
Craft a 3-step outbound cold email campaign targeting key persona decision-makers.
Step 1: Problem-first observational hook with low-friction CTA (no 30-min demo pitches).
Step 2: Value-add evidence or metric proof-point follow-up.
Step 3: Polite breakup / permission-to-close email.
Ensure strict adherence to the brand voice and avoid spam trigger words.`,
    required_inputs: [
      'prospect_discovery_icp',
      'brand_identity_guide',
      'positioning_statement'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['campaign_name', 'target_persona', 'sequence_steps', 'subject_line_variants', 'call_to_actions'],
      properties: {
        campaign_name: { type: 'string' },
        target_persona: { type: 'string' },
        sequence_steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              step_number: { type: 'number' },
              delay_days: { type: 'number' },
              subject_line: { type: 'string' },
              body: { type: 'string' },
              call_to_action: { type: 'string' }
            }
          }
        },
        subject_line_variants: { type: 'array', items: { type: 'string' } },
        call_to_actions: { type: 'array', items: { type: 'string' } }
      }
    }, null, 2),
    acceptance_criteria: [
      'Complete 3-step sequence with distinct subject lines, bodies, and delay intervals',
      'Every email copy is under 125 words, high readability, and no jargon puffery',
      'Strict compliance with Brand Identity tone and voice rules',
      'Includes at least 3 alternative subject line variants for A/B testing'
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
    purpose: 'Produce thought-leadership content, founder launch letters, and product update newsletters.',
    instructions: `You are the Content & Newsletter Strategist.
Read the company brief, brand positioning, and brand voice guidelines.
Compose a high-signal founding launch edition newsletter for early subscribers and industry peers.
Frame the core macro shift or industry inflection point that necessitates the company's existence.
Provide deep tactical insight that is valuable even if the reader never uses the product.
Conclude with a clear product introduction and invite to join the private beta.`,
    required_inputs: [
      'company_brief',
      'brand_positioning_matrix',
      'brand_voice_guide'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['newsletter_title', 'edition_number', 'subject_line', 'preview_hook', 'body_markdown', 'social_snippets'],
      properties: {
        newsletter_title: { type: 'string' },
        edition_number: { type: 'number' },
        subject_line: { type: 'string' },
        preview_hook: { type: 'string' },
        body_markdown: { type: 'string' },
        social_snippets: { type: 'array', items: { type: 'string' } }
      }
    }, null, 2),
    acceptance_criteria: [
      'Engaging narrative opening tied to real macroeconomic or technical headwinds',
      'Deep actionable insights demonstrating category mastery',
      'Clear, tasteful call to action for the private beta waitlist',
      'Includes 3 companion Twitter/LinkedIn micro-posts'
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
    purpose: 'Design North Star metrics, core event tracking schema, activation funnel stages, and telemetry specifications.',
    instructions: `You are the Product Analytics Architect.
Review the company brief, customer research findings, and core user workflows.
Define the canonical North Star Metric and 3 essential input metrics.
Map the user journey into 4 key funnel stages (Visitor -> Signup -> Activated -> Retained).
Specify a comprehensive telemetry event taxonomy with exact event names, trigger conditions, and payload properties.`,
    required_inputs: [
      'company_brief',
      'customer_research_insights',
      'core_workflow_steps'
    ],
    output_schema: JSON.stringify({
      type: 'object',
      required: ['north_star_metric', 'input_metrics', 'funnel_stages', 'telemetry_events', 'activation_definition'],
      properties: {
        north_star_metric: { type: 'string' },
        input_metrics: { type: 'array', items: { type: 'string' } },
        funnel_stages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              stage_name: { type: 'string' },
              success_metric: { type: 'string' },
              dropoff_risk: { type: 'string' }
            }
          }
        },
        telemetry_events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              event_name: { type: 'string' },
              trigger: { type: 'string' },
              properties: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        activation_definition: { type: 'string' }
      }
    }, null, 2),
    acceptance_criteria: [
      'Defines single high-leverage North Star metric with mathematical formula or criteria',
      'Explicitly details at least 6 standard tracking events with parameter schemas',
      'Unambiguous definition of the "Aha!" moment and user activation event',
      'Delivered as an implementation-ready Telemetry & Tracking Specification'
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
