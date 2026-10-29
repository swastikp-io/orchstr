import { z } from 'zod';

// 1. Brand Positioning Contract
export const BrandPositioningSchema = z.object({
  customer_problem: z.string().min(10, 'Customer problem must be documented in detail'),
  ideal_customer_profile: z.string().min(10, 'Ideal customer profile must be defined'),
  wedge_market: z.string().min(5, 'Wedge market niche must be explicitly stated'),
  competitive_alternatives: z.array(z.object({
    name: z.string(),
    their_weakness: z.string(),
    our_advantage: z.string()
  })).min(1, 'At least one competitive alternative must be specified'),
  differentiation: z.array(z.string()).min(2, 'At least two core differentiators required'),
  positioning_statement: z.string().min(20, 'Positioning statement must follow category formula'),
  messaging_pillars: z.array(z.object({
    pillar: z.string(),
    hook: z.string(),
    proof_point: z.string()
  })).min(2, 'At least two messaging pillars required')
});

export type BrandPositioningDeliverable = z.infer<typeof BrandPositioningSchema>;

// 2. Brand Identity Contract (Must reference approved positioning)
export const BrandIdentitySchema = z.object({
  positioning_reference_id: z.string().min(1, 'Must link to an approved brand positioning deliverable'),
  brand_story: z.string().min(20, 'Brand narrative story required'),
  personality: z.array(z.string()).min(2, 'Personality traits required'),
  voice: z.object({
    tone_attributes: z.array(z.string()),
    dos_and_donts: z.array(z.object({
      rule: z.string(),
      do: z.string(),
      dont: z.string()
    })).min(2)
  }),
  visual_direction: z.object({
    dark_palette: z.array(z.string()).min(3, 'At least three semantic color tokens required'),
    typography: z.object({
      sans: z.string(),
      mono: z.string()
    }),
    aesthetic_rules: z.array(z.string())
  }),
  identity_rules: z.array(z.string()).min(2),
  creative_asset_briefs: z.array(z.object({
    asset_name: z.string(),
    target_channel: z.string(),
    creative_guidelines: z.string()
  })).min(1)
});

export type BrandIdentityDeliverable = z.infer<typeof BrandIdentitySchema>;

// 3. Customer Research Contract
export const CustomerResearchSchema = z.object({
  customer_language: z.array(z.string()).min(2, 'Real customer phrasing/quotes must be documented'),
  interview_questions: z.array(z.string()).min(3, 'Interview script questions required'),
  market_evidence: z.array(z.object({
    claim: z.string(),
    source: z.string(),
    confidence: z.enum(['low', 'medium', 'high']),
    evidence_type: z.enum(['observed_fact', 'sourced_claim', 'hypothesis', 'recommendation'])
  })).min(2, 'Evidence items must be classified and sourced'),
  workarounds: z.array(z.string()).min(1, 'Existing manual user workarounds must be listed'),
  competitor_map: z.array(z.object({
    competitor: z.string(),
    category: z.string(),
    market_share_notes: z.string()
  })),
  willingness_to_pay_signals: z.array(z.object({
    price_point: z.string(),
    value_driver: z.string(),
    source: z.string()
  })).min(1, 'Willingness to pay must be supported with evidence'),
  unresolved_hypotheses: z.array(z.object({
    hypothesis: z.string(),
    test_method: z.string(),
    confidence: z.enum(['low', 'medium', 'high'])
  }))
});

export type CustomerResearchDeliverable = z.infer<typeof CustomerResearchSchema>;

// 4. Prospect Discovery Contract (No fabricated contacts)
export const ProspectDiscoverySchema = z.object({
  target_criteria: z.string().min(10),
  qualified_records: z.array(z.object({
    company_name: z.string(),
    contact_title: z.string(),
    contact_name: z.string(),
    source_url: z.string(),
    buying_signal: z.string(),
    qualification_rationale: z.string(),
    confidence: z.enum(['low', 'medium', 'high']),
    is_excluded: z.boolean().default(false),
    exclusion_reason: z.string().optional()
  })).min(1, 'Must specify qualified prospect records with verified sources'),
  verification_notes: z.string()
});

export type ProspectDiscoveryDeliverable = z.infer<typeof ProspectDiscoverySchema>;

// 5. Email Outreach Contract (Uses approved positioning & prospect evidence)
export const EmailOutreachSchema = z.object({
  positioning_reference_id: z.string().min(1, 'Must reference approved brand positioning'),
  prospect_reference_id: z.string().min(1, 'Must reference validated prospect discovery records'),
  campaign_name: z.string().min(3),
  target_persona: z.string().min(3),
  personalized_sequences: z.array(z.object({
    step_number: z.number().int().positive(),
    delay_days: z.number().int().nonnegative(),
    subject_line: z.string().max(80),
    body: z.string().min(30),
    message_rationale: z.string(),
    call_to_action: z.string(),
    draft_status: z.enum(['draft', 'ready_for_review', 'approved']).default('draft')
  })).min(2, 'Sequence must contain at least 2 steps (initial + follow-up)'),
  follow_ups: z.array(z.object({
    scenario: z.string(),
    suggested_copy: z.string()
  }))
});

export type EmailOutreachDeliverable = z.infer<typeof EmailOutreachSchema>;

// 6. Marketing & Newsletters Contract
export const MarketingNewslettersSchema = z.object({
  campaign_briefs: z.array(z.object({
    title: z.string(),
    objective: z.string(),
    channel: z.string(),
    key_message: z.string()
  })).min(1),
  newsletter_drafts: z.array(z.object({
    edition_title: z.string(),
    preview_hook: z.string(),
    body_sections: z.array(z.object({
      heading: z.string(),
      content: z.string()
    })),
    cta_link: z.string()
  })).min(1),
  content_calendar: z.array(z.object({
    week: z.string(),
    topic: z.string(),
    format: z.string(),
    target_audience: z.string()
  })),
  distribution_channel_hypotheses: z.array(z.object({
    channel: z.string(),
    expected_cac: z.string(),
    scale_potential: z.string(),
    test_plan: z.string()
  })).min(1),
  success_metrics: z.array(z.object({
    metric_name: z.string(),
    target_value: z.string(),
    tracking_method: z.string()
  }))
});

export type MarketingNewslettersDeliverable = z.infer<typeof MarketingNewslettersSchema>;

// 7. Product Analytics Contract (Never invent usage data)
export const ProductAnalyticsSchema = z.object({
  event_taxonomy: z.array(z.object({
    event_name: z.string().regex(/^[a-z_0-9]+$/, 'Event names must be snake_case'),
    trigger_condition: z.string(),
    properties: z.array(z.object({
      key: z.string(),
      type: z.string(),
      description: z.string()
    }))
  })).min(3, 'At least 3 tracking events required in taxonomy'),
  activation_definition: z.object({
    milestone: z.string(),
    criteria: z.string(),
    time_to_activate_target: z.string()
  }),
  retention_definition: z.object({
    cohort_basis: z.string(),
    retention_milestones: z.array(z.string())
  }),
  funnel_analysis: z.object({
    stages: z.array(z.object({
      name: z.string(),
      observed_conversion_rate: z.number().nullable(),
      dropoff_reasons: z.array(z.string())
    })),
    data_source_notes: z.string().min(5, 'Explicitly state whether data is observed or baseline estimate')
  }),
  observed_friction: z.array(z.object({
    step: z.string(),
    severity: z.enum(['critical', 'high', 'medium']),
    observation: z.string()
  })),
  proposed_experiments: z.array(z.object({
    hypothesis: z.string(),
    intervention: z.string(),
    primary_metric: z.string(),
    owner: z.string(),
    duration_weeks: z.number().int().positive()
  })).min(1)
});

export type ProductAnalyticsDeliverable = z.infer<typeof ProductAnalyticsSchema>;

// Master validator map
export const CONTRACT_VALIDATORS: Record<string, z.ZodTypeAny> = {
  agent_brand_positioning: BrandPositioningSchema,
  agent_brand_identity: BrandIdentitySchema,
  agent_customer_research: CustomerResearchSchema,
  agent_prospect_discovery: ProspectDiscoverySchema,
  agent_email_outreach: EmailOutreachSchema,
  agent_marketing_newsletter: MarketingNewslettersSchema,
  agent_product_analytics: ProductAnalyticsSchema
};
