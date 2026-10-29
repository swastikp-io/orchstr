export function renderDeliverableMarkdown(agentId: string, data: any): string {
  if (!data || typeof data !== 'object') {
    return String(data ?? '');
  }

  switch (agentId) {
    case 'agent_brand_positioning': {
      const p = data;
      const comps = (p.competitive_alternatives || [])
        .map((c: any) => `| ${c.name} | ${c.their_weakness} | ${c.our_advantage} |`)
        .join('\n');
      const diffs = (p.differentiation || []).map((d: string) => `- ${d}`).join('\n');
      const pillars = (p.messaging_pillars || [])
        .map((m: any) => `### ${m.pillar}\n**Hook:** ${m.hook}\n\n**Proof Point:** ${m.proof_point}\n`)
        .join('\n');

      return `# Brand Positioning Strategy

## 1. Customer Problem
${p.customer_problem}

## 2. Ideal Customer Profile (ICP)
${p.ideal_customer_profile}

## 3. Wedge Market
${p.wedge_market}

## 4. Competitive Alternatives
| Competitor | Their Weakness | Our Advantage |
| :--- | :--- | :--- |
${comps || '| None listed | - | - |'}

## 5. Core Differentiation
${diffs || '- None listed'}

## 6. Canonical Positioning Statement
> ${p.positioning_statement}

## 7. Messaging Pillars
${pillars}
`;
    }

    case 'agent_brand_identity': {
      const b = data;
      const traits = (b.personality || []).map((t: string) => `- **${t}**`).join('\n');
      const dosDonts = (b.voice?.dos_and_donts || [])
        .map((d: any) => `| ${d.rule} | ${d.do} | ${d.dont} |`)
        .join('\n');
      const palette = (b.visual_direction?.dark_palette || [])
        .map((c: string) => `\`${c}\``)
        .join(' · ');
      const briefs = (b.creative_asset_briefs || [])
        .map((ab: any) => `### ${ab.asset_name} (${ab.target_channel})\n${ab.creative_guidelines}\n`)
        .join('\n');

      return `# Brand Identity & Verbal Direction

*Referenced Positioning Deliverable:* \`${b.positioning_reference_id}\`

## Brand Story
${b.brand_story}

## Personality Traits
${traits}

## Voice Principles & Editorial Guardrails
| Rule | Do | Don't |
| :--- | :--- | :--- |
${dosDonts || '| Standard | Clear and concise | Never jargon |'}

## Visual Direction
- **Dark Theme Palette:** ${palette}
- **Typography:** Sans: \`${b.visual_direction?.typography?.sans || 'Inter'}\` · Mono: \`${b.visual_direction?.typography?.mono || 'JetBrains Mono'}\`
- **Aesthetic Rules:** ${(b.visual_direction?.aesthetic_rules || []).join(', ')}

## Creative Asset Briefs
${briefs}
`;
    }

    case 'agent_customer_research': {
      const cr = data;
      const quotes = (cr.customer_language || []).map((q: string) => `> "${q}"`).join('\n\n');
      const questions = (cr.interview_questions || []).map((q: string, i: number) => `${i + 1}. ${q}`).join('\n');
      const evidence = (cr.market_evidence || [])
        .map((e: any) => `| ${e.claim} | ${e.source} | ${e.confidence} | ${e.evidence_type} |`)
        .join('\n');
      const workarounds = (cr.workarounds || []).map((w: string) => `- ${w}`).join('\n');
      const wtp = (cr.willingness_to_pay_signals || [])
        .map((s: any) => `- **Price Point:** ${s.price_point} — *Value Driver:* ${s.value_driver} (Source: ${s.source})`)
        .join('\n');
      const hypotheses = (cr.unresolved_hypotheses || [])
        .map((h: any) => `- [ ] **${h.hypothesis}** (Method: ${h.test_method}, Confidence: ${h.confidence})`)
        .join('\n');

      return `# Customer Research & Pain Point Dossier

## Customer Language (Verbatim Quotes)
${quotes || '*No verbatim quotes recorded.*'}

## Validated Interview Script
${questions}

## Sourced Market Evidence
| Claim | Source | Confidence | Provenance |
| :--- | :--- | :--- | :--- |
${evidence || '| None | - | - | - |'}

## Current User Workarounds
${workarounds || '- Manual spreadsheets and email threads.'}

## Willingness to Pay Signals
${wtp || '- No willingness to pay signals documented.'}

## Unresolved Hypotheses
${hypotheses || '- No unresolved hypotheses.'}
`;
    }

    case 'agent_prospect_discovery': {
      const pd = data;
      const records = (pd.qualified_records || [])
        .map((r: any) => `| ${r.company_name} | ${r.contact_name} | ${r.contact_title} | [Source](${r.source_url}) | ${r.buying_signal} | ${r.confidence} | ${r.is_excluded ? 'EXCLUDED' : 'QUALIFIED'} |`)
        .join('\n');

      return `# Ideal Customer Profile & Prospect Records

## Qualification Criteria
${pd.target_criteria}

## Sourced & Verified Prospect Accounts
| Company | Contact | Title | Source | Buying Signal | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${records || '| None listed | - | - | - | - | - | - |'}

## Verification & Sourcing Notes
${pd.verification_notes}
`;
    }

    case 'agent_email_outreach': {
      const eo = data;
      const sequences = (eo.personalized_sequences || [])
        .map((s: any) => `### Step ${s.step_number} (+${s.delay_days}d) — "${s.subject_line}"\n**Rationale:** ${s.message_rationale}\n\n**Body:**\n\n${s.body}\n\n**CTA:** ${s.call_to_action}\n*Status:* \`${s.draft_status}\`\n`)
        .join('\n---\n\n');
      const followUps = (eo.follow_ups || [])
        .map((f: any) => `#### Scenario: ${f.scenario}\n${f.suggested_copy}\n`)
        .join('\n');

      return `# High-Converting Outbound Sequence

**Campaign:** ${eo.campaign_name}  
**Target Persona:** ${eo.target_persona}  
*Positioning Ref:* \`${eo.positioning_reference_id}\` · *Prospect Ref:* \`${eo.prospect_reference_id}\`

## Cadence & Messaging
${sequences}

## Objection Handling & Follow-ups
${followUps}
`;
    }

    case 'agent_marketing_newsletter': {
      const mn = data;
      const drafts = (mn.newsletter_drafts || [])
        .map((d: any) => {
          const sections = (d.body_sections || []).map((s: any) => `### ${s.heading}\n${s.content}`).join('\n\n');
          return `## ${d.edition_title}\n*Preview Hook:* ${d.preview_hook}\n\n${sections}\n\n[CTA: ${d.cta_link}](${d.cta_link})`;
        })
        .join('\n\n---\n\n');
      const calendar = (mn.content_calendar || [])
        .map((c: any) => `| ${c.week} | ${c.topic} | ${c.format} | ${c.target_audience} |`)
        .join('\n');

      return `# Launch Content & Editorial Strategy

${drafts}

## Content Calendar
| Week | Topic | Format | Target Audience |
| :--- | :--- | :--- | :--- |
${calendar || '| Week 1 | Founding Story | Newsletter | Early Adopters |'}
`;
    }

    case 'agent_product_analytics': {
      const pa = data;
      const events = (pa.event_taxonomy || [])
        .map((e: any) => {
          const props = (e.properties || []).map((pr: any) => `\`${pr.key}\` (${pr.type}): ${pr.description}`).join('; ');
          return `| \`${e.event_name}\` | ${e.trigger_condition} | ${props} |`;
        })
        .join('\n');
      const funnels = (pa.funnel_analysis?.stages || [])
        .map((s: any) => `| ${s.name} | ${s.observed_conversion_rate !== null ? s.observed_conversion_rate + '%' : 'Baseline (Pending Data)'} | ${(s.dropoff_reasons || []).join(', ')} |`)
        .join('\n');
      const experiments = (pa.proposed_experiments || [])
        .map((x: any) => `### Experiment: ${x.hypothesis}\n- **Intervention:** ${x.intervention}\n- **Metric:** ${x.primary_metric}\n- **Owner:** ${x.owner} (${x.duration_weeks} weeks)\n`)
        .join('\n');

      return `# Product Analytics & Telemetry Blueprint

## Event Taxonomy
| Event Name | Trigger Condition | Properties |
| :--- | :--- | :--- |
${events || '| None | - | - |'}

## Activation Milestone
**Milestone:** ${pa.activation_definition?.milestone}  
**Criteria:** ${pa.activation_definition?.criteria}  
**Target Time to Activate:** ${pa.activation_definition?.time_to_activate_target}

## Funnel Stages & Baseline
| Stage | Observed Rate | Known Dropoff Factors |
| :--- | :--- | :--- |
${funnels || '| Sign Up | 100% | Initial Entry |'}

*Data Notes:* ${pa.funnel_analysis?.data_source_notes || 'Observed telemetry'}

## Proposed Growth Experiments
${experiments}
`;
    }

    case 'agent_sales_ops': {
      const so = data;
      const icp = so.icp_definition;
      const tiers = (so.lead_tiering || [])
        .map((t: any) => `| ${t.tier.toUpperCase()} | ${t.criteria} | ${t.outreach_channel} | ${t.target_response_sla} |`)
        .join('\n');
      const pipeline = (so.pipeline_stages || [])
        .map((p: any) => `| ${p.stage_name} | ${p.exit_criteria} | ${(p.required_fields || []).join(', ')} |`)
        .join('\n');
      const questions = (so.consult_call_questions || []).map((q: string, i: number) => `${i + 1}. ${q}`).join('\n');
      const pitch = so.pitch_structure;
      const diags = (so.stage_conversion_diagnostics?.observations || []).map((o: string) => `- ${o}`).join('\n');

      return `# Sales Operations & Pipeline Architecture

## Ideal Customer Profile (7 Dimensions)
- **Company Size:** ${icp?.company_size}
- **Industry:** ${icp?.industry}
- **Stage:** ${icp?.stage}
- **Geography:** ${icp?.geography}
- **Target Workflow:** ${icp?.workflow}
- **Typical Budget:** ${icp?.budget}
- **Buying Trigger Event:** ${icp?.trigger_event}

## Lead Tiering Matrix
| Tier | Criteria | Outreach Channel | Response SLA |
| :--- | :--- | :--- | :--- |
${tiers || '| - | - | - | - |'}

## 8-Stage Sales Pipeline & Exit Criteria
| Stage | Objective Exit Criteria | Required Fields |
| :--- | :--- | :--- |
${pipeline || '| - | - | - |'}

## Consult Call Qualification Questions
${questions}

## 6-Part Pitch Structure
1. **Heard (Context):** ${pitch?.heard}
2. **Why It Matters (Stakes):** ${pitch?.why_it_matters}
3. **What Changes (Status Quo Shift):** ${pitch?.what_changes}
4. **How Product Helps (Capability):** ${pitch?.how_product_helps}
5. **Proof (Evidence/Validation):** ${pitch?.proof}
6. **Next Step (Action):** ${pitch?.next_step}

## Stage Conversion Diagnostics
${diags || '- Diagnostics based strictly on verified user data.'}
`;
    }

    case 'agent_customer_support': {
      const cs = data;
      const kb = (cs.knowledge_base_outline || [])
        .map((cat: any) => `### ${cat.category}\n${(cat.articles || []).map((a: string) => `- ${a}`).join('\n')}`)
        .join('\n\n');
      const trees = (cs.decision_trees || [])
        .map((dt: any) => `### Scenario: \`${dt.scenario}\`\n**Diagnosis Steps:**\n${(dt.diagnosis_steps || []).map((s: string) => `1. ${s}`).join('\n')}\n\n**Resolution:** ${dt.resolution}`)
        .join('\n\n');
      const escalations = (cs.escalation_rules || [])
        .map((er: any) => `| ${er.trigger} | \`${er.category}\` | ${er.human_reviewer_role} | ${er.target_resolution_sla} |`)
        .join('\n');
      const handoff = (cs.support_theme_handoff || [])
        .map((h: any) => `| ${h.theme} | ${h.frequency} | ${h.impact} | ${h.recommended_roadmap_item} |`)
        .join('\n');

      return `# Customer Support & Resolution Playbook

## Knowledge Base Architecture
${kb}

## Triage Decision Trees
${trees}

## Human Escalation Policies
| Trigger Event | Category | Assigned Human Role | SLA Target |
| :--- | :--- | :--- | :--- |
${escalations || '| - | - | - | - |'}

## Support-to-Roadmap Handoff Backlog
| Friction Theme | Frequency | Customer Impact | Recommended Roadmap Item |
| :--- | :--- | :--- | :--- |
${handoff || '| - | - | - | - |'}
`;
    }

    case 'agent_competitor_analysis': {
      const ca = data;
      const comps = (ca.competitors || [])
        .map((c: any) => `### ${c.name} ([Source](${c.sourced_url}))\n- **Positioning:** ${c.positioning}\n- **Homepage Speaks To:** ${c.homepage_audience}\n- **Lead Pain:** ${c.lead_pain}\n- **Highlighted Features:** ${(c.highlighted_features || []).join(', ')}\n- **Pricing Model:** ${c.pricing}\n- **Customer Review Complaints:** ${(c.review_complaints || []).join('; ')}`)
        .join('\n\n');
      const gaps = (ca.positioning_gaps || [])
        .map((g: any) => `### Strategic Gap: ${g.gap_description}\n**Positioning Opportunity:** ${g.opportunity_to_position}\n**Evidence Sources:** ${(g.evidence_urls || []).map((u: string) => `[Source](${u})`).join(', ')}`)
        .join('\n\n');

      return `# Competitor Intelligence Dossier

## Competitor Breakdown
${comps}

## Defensible Positioning Gaps
${gaps}
`;
    }

    case 'agent_unit_economics': {
      const ue = data;
      const inputs = Object.entries(ue.reported_inputs || {})
        .map(([k, v]) => `| \`${k}\` | ${v} |`)
        .join('\n');
      const metrics = Object.entries(ue.calculated_metrics || {})
        .map(([k, v]) => `| \`${k}\` | **${v}** |`)
        .join('\n');
      const missing = (ue.missing_inputs || []).map((m: string) => `- \`${m}\``).join('\n');
      const notes = (ue.analysis_notes || []).map((n: string) => `- ${n}`).join('\n');

      return `# Deterministic Unit Economics & Financial Assessment

## Reported Raw Inputs
| Metric Input | Value |
| :--- | :--- |
${inputs || '| No inputs provided | - |'}

## Calculated Output Metrics
| Metric | Calculated Value |
| :--- | :--- |
${metrics || '| Pending complete inputs | - |'}

## Missing Inputs (Not Estimated)
${missing || '*All required inputs provided.*'}

## Analysis & Strategic Notes
${notes || '- Calculations strictly based on validated financial data.'}
`;
    }

    case 'agent_website_build': {
      const wb = data;
      const mvp = wb.mvp_spec;
      const checklist = (wb.technical_checklist || [])
        .map((t: any) => `- [${t.status === 'ready' ? 'x' : ' '}] **${t.category.toUpperCase()}**: ${t.item}`)
        .join('\n');
      const ans = wb.homepage_answers;
      const launch = (wb.launch_checklist || [])
        .map((l: any) => `- [${l.verified ? 'x' : ' '}] ${l.step}`)
        .join('\n');

      return `# Website Architecture & Launch Readiness

## MVP Scope Boundary
- **Core Problem:** ${mvp?.core_problem}
- **Key Features:**
${(mvp?.features || []).map((f: string) => `  - ${f}`).join('\n')}
- **Target Platform:** \`${mvp?.platform}\`

## Technical & Infrastructure Checklist
${checklist}

## Homepage Narrative Answers
1. **Who is this for?** ${ans?.who}
2. **What problem does it solve?** ${ans?.problem}
3. **What is the product?** ${ans?.product}
4. **Why is it better than alternatives?** ${ans?.why_better}
5. **What is the next step for the visitor?** ${ans?.next_step}

## Pre-Launch Verification Gates
${launch}
`;
    }

    default: {
      // Clean structured JSON dump formatted nicely in markdown
      return `# Deliverable Artifact (${agentId})

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
`;
    }
  }
}
