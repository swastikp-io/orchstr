import { ArtifactType } from '../types.js';

export interface MockDeliverable {
  title: string;
  type: ArtifactType;
  content: string;
  outputData: Record<string, any>;
}

export const MOCK_DELIVERABLES: Record<string, MockDeliverable> = {
  agent_customer_research: {
    title: 'Customer Discovery & Pain Point Dossier',
    type: 'analysis',
    outputData: {
      research_summary: 'Synthesized 18 customer discovery conversations with Head of Engineering and VP Supply Chain leaders across mid-market manufacturing companies.',
      pain_point_clusters: [
        {
          cluster_name: 'Visibility Lag in Tier-2/3 Suppliers',
          severity: 'critical',
          observed_behavior: 'Firms rely on quarterly manual audits and emergency phone calls when shipments are already 10 days late.',
          representative_quote: 'We only find out our Taiwanese sub-tier capacitor supplier had a factory flood when the final assembly line in Ohio grinds to a halt.'
        },
        {
          cluster_name: 'Fragmented Siloed Spreadsheets',
          severity: 'high',
          observed_behavior: 'Critical inventory thresholds managed across 40+ unversioned Excel sheets without audit trails.',
          representative_quote: 'Three different planners have three different versions of the safety stock matrix.'
        },
        {
          cluster_name: 'Reactive Crisis Management vs Predictive Modeling',
          severity: 'high',
          observed_behavior: 'Zero predictive alerting on geopolitical tariffs or port congestions.',
          representative_quote: 'We spend 60% of our week putting out fires rather than negotiating strategic supplier reserves.'
        }
      ],
      willingness_to_pay_signals: [
        'Confirmed $45k-$80k annual software budget if system integrates with legacy SAP/Oracle ERP and reduces supply chain stockouts by >15%.'
      ],
      contradictory_evidence: [
        'Notice: Older procurement directors express hesitation regarding autonomous supplier rerouting without mandatory human-in-the-loop signoff.'
      ],
      actionable_insights: [
        'Focus MVP on proactive risk telemetry and automated disruption alerts rather than full autonomous procurement.',
        'Human-in-the-loop approval workflows are a mandatory purchase requirement.'
      ]
    },
    content: `# Customer Discovery & Pain Point Dossier

**Target Persona**: VP of Supply Chain, Operations Director, Head of Procurement  
**Primary Focus**: Tier-2 and Tier-3 Supplier Resilience & Disruption Monitoring  

---

## 1. Executive Summary
We analyzed 18 discovery sessions with manufacturing leaders managing between $50M and $500M in annual bill-of-materials (BOM) spend. Over 80% reported that unanticipated supply chain stockouts caused revenue delays exceeding \$2.4M on average during the past 18 months.

---

## 2. Core Validated Pain Point Clusters

### Cluster A: Visibility Lag in Tier-2/3 Suppliers [CRITICAL SEVERITY]
- **Observed Workflow**: Teams maintain direct relationships with Tier-1 assembly vendors, but possess zero real-time telemetry into Tier-2 raw material extractors or component fabricators.
- **Direct Quote**: *"We only find out our Taiwanese sub-tier capacitor supplier had a factory flood when the final assembly line in Ohio grinds to a halt."*
- **Frequency**: 15 out of 18 interviewees cited this as their single highest source of unforecasted margin loss.

### Cluster B: Fragmented Spreadsheets & Disjointed ERP Sync [HIGH SEVERITY]
- **Observed Workflow**: Operations teams pull CSV extracts from SAP/NetSuite and merge them into manual, unversioned Google Sheets.
- **Direct Quote**: *"Three planners have three different versions of the safety stock matrix. Nobody knows which file has the true lead times."*

### Cluster C: Reactive Firefighting vs. Continuous Telemetry [HIGH SEVERITY]
- **Observed Workflow**: Supply chain managers spend over 25 hours per week manually triaging carrier delays, weather anomalies, and port customs delays.

---

## 3. Contradictory Evidence & Edge Cases
> [!WARNING]
> While younger VP-level operators demanded automated AI rerouting of shipments, 7 of 10 legacy procurement directors stated they would reject any software that submits purchase orders or alters contracts without explicit human approval.
> **Design Implication**: All autonomous mitigation plans must flow through an interactive Manager Approval Inbox.

---

## 4. Willingness to Pay & Budget Authority
- Target ACV (Annual Contract Value): **$45,000 - $80,000 / year**.
- Purchasing Trigger: Preventing a single 48-hour assembly line shutdown pays for the software for 2 years.
`
  },

  agent_brand_positioning: {
    title: 'Brand Positioning Matrix & Category Narrative',
    type: 'strategy',
    outputData: {
      category_name: 'Autonomous Supply Chain Resilience Operating System',
      positioning_statement: 'For mid-market manufacturing enterprises crippled by unexpected component shortages, ApexFlow is the Autonomous Supply Chain Resilience Operating System that continuously predicts multi-tier supplier disruptions and prepares validated mitigation playbooks, unlike brittle legacy ERP modules because ApexFlow combines continuous multi-tier graph intelligence with human-in-the-loop autonomous execution.',
      value_wedge: 'Continuous Sub-Tier Graph Telemetry + Verified Remediation Playbooks',
      key_differentiators: [
        'Deep Tier-2/3 graph observability rather than Tier-1 only point telemetry',
        'Actionable remediation workflows with single-click human signoff',
        'Instant 30-minute integration over legacy ERPs without requiring 9-month SAP migrations'
      ]
    },
    content: `# Brand Positioning Matrix & Strategic Narrative

**Category**: Autonomous Supply Chain Resilience Operating System  
**Product**: ApexFlow  

---

## 1. Canonical Positioning Statement
> **For** mid-market manufacturing and hardware enterprises  
> **Who** suffer catastrophic revenue disruptions from sub-tier component shortages  
> **ApexFlow** is the *Autonomous Supply Chain Resilience Operating System*  
> **That** delivers continuous multi-tier graph visibility and automated risk mitigation playbooks  
> **Unlike** brittle legacy ERP add-ons (SAP Ariba, Coupa) and passive freight dashboards (Project44)  
> **Because** ApexFlow continuously correlates global disruption signals with Bill-of-Materials dependencies and generates audited, actionable recovery protocols with human-in-the-loop control.

---

## 2. Competitive Contrast Matrix

| Dimension | Legacy ERP Modules (SAP/Oracle) | Freight Tracking Dashboards | ApexFlow |
| :--- | :--- | :--- | :--- |
| **Visibility Scope** | Tier-1 direct suppliers only | Port & container shipment status | Full multi-tier graph (Tier-1 through Tier-4) |
| **Response Latency** | Days or weeks (Manual reports) | Real-time tracking of delayed cargo | Predictive alerts 14-21 days before stockout |
| **Remediation** | None (Operators manually email vendors) | None (Shows you where the delay is) | Deterministic mitigation workflows & playbooks |
| **Time-to-Value** | 6–12 month consulting deployment | 3–6 month API setup | Zero-code ERP connector in under 48 hours |

---

## 3. Core Messaging Pillars
1. **Predict Before You Panic**: Continuous telemetry turns unseen supplier risks into high-confidence lead times.
2. **Deterministic Control**: High-speed AI simulation paired with infallible human executive governance.
3. **Resilience Without Complexity**: Plug into your existing ERP; deploy instant defense without migrating databases.
`
  },

  agent_brand_identity: {
    title: 'Brand Identity Guidebook & Verbal Principles',
    type: 'strategy',
    outputData: {
      brand_voice_pillars: ['Engineering-Grade Precision', 'Unflinching Calmness', 'Transparent Agency'],
      visual_philosophy: 'Dark, tactile, minimal instrumentation aesthetic inspired by aerospace avionics and financial terminals.'
    },
    content: `# Brand Identity Guidebook & Design System

---

## 1. Verbal Brand Voice & Tone Spectrum

### Pillar 1: Engineering-Grade Precision
- **Do**: Speak in quantifiable, rigorous operational terms (latency, margin protection, multi-tier graph depth).
- **Don't**: Use hyperbolic buzzwords like "hyper-revolutionary magic AI" or "effortless 10x disruption".

### Pillar 2: Unflinching Calmness
- **Do**: Maintain the steady, confident composure of a mission control flight director during an anomaly.
- **Don't**: Sound frantic, alarmist, or overly promotional.

### Pillar 3: Human-Empowered Agency
- **Do**: Emphasize that the system augments and protects the operations leader's decision authority.
- **Don't**: Suggest that algorithms are replacing human judgment or operating without oversight.

---

## 2. Design Tokens & Visual Hierarchy

\`\`\`css
/* Semantic Dark Theme Palette */
--bg-primary: #0a0a0c;      /* Deep Obsidian Void */
--bg-card: #121216;         /* Elevated Surface */
--border-subtle: #1f1f28;   /* Precision Divider */
--accent-brand: #22c55e;    /* Telemetry Green (Healthy) */
--accent-warning: #f59e0b;  /* Risk Warning Amber */
--accent-danger: #ef4444;   /* Critical Disruption Red */
--text-primary: #f4f4f5;    /* 95% High Contrast Zinc */
--text-muted: #a1a1aa;      /* Secondary Guidance Zinc */
\`\`\`

- **Typography**: 
  - Sans: \`Inter\` (Clean, geometric, supreme legibility at small sizes)
  - Monospace: \`JetBrains Mono\` (Used for Task IDs, SKUs, timestamps, and confidence percentages)
`
  },

  agent_prospect_discovery: {
    title: 'ICP Playbook & Target Account Matrix',
    type: 'analysis',
    outputData: {
      icp_definition: 'North American and European precision manufacturing companies with $50M-$500M annual revenue and multi-continental supply chains.',
      sample_target_accounts: [
        'AccuDynamics Industrial Solutions ($140M Rev)',
        'Vanguard Precision Robotics ($220M Rev)',
        'Nexis Medical Devices ($85M Rev)',
        'Apex Aerospace Componentry ($310M Rev)',
        'Triton Marine Systems ($165M Rev)'
      ]
    },
    content: `# ICP Playbook & Target Account Matrix

---

## 1. Ideal Customer Profile (ICP) Parameters
- **Verticals**: Industrial Equipment, Medical Devices, Automotive Tier-1, High-Reliability Electronics.
- **Revenue Range**: \$50M to \$500M ARR / Annual Revenue.
- **BOM Complexity**: 500+ active component SKUs sourced across at least 3 international jurisdictions.
- **Tech Stack Markers**: SAP ECC/S4HANA, NetSuite ERP, Infor, Microsoft Dynamics 365.

---

## 2. Target Buyer Personas

### Persona A: The Economic Buyer (VP of Supply Chain / COO)
- **Role Title**: VP of Global Supply Chain, VP of Manufacturing Operations
- **Core KPI**: On-Time In-Full (OTIF) delivery rate > 96%, carrying cost reduction, margin preservation.
- **Pain**: Line stoppage costs \$50,000/hour; Board is scrutinizing inventory volatility.

### Persona B: The Operational Champion (Director of Strategic Sourcing)
- **Role Title**: Director of Procurement, Sourcing Manager
- **Core KPI**: Vendor compliance, alternative supplier qualification cycle time.
- **Pain**: Buried in spreadsheets and crisis emails whenever a component vendor delays shipment.

---

## 3. High-Priority Target Account Roster
1. **AccuDynamics Industrial**: 1,200 employees, \$140M rev, complex micro-actuator manufacturing.
2. **Vanguard Precision Robotics**: 950 employees, \$220M rev, heavily dependent on rare-earth motors.
3. **Nexis Medical Instruments**: 600 employees, \$85M rev, strict FDA traceability compliance.
4. **Apex Aerospace Componentry**: 2,100 employees, \$310M rev, high aerospace qualification friction.
5. **Triton Power & Marine**: 1,400 employees, \$165M rev, frequent overseas maritime transit risks.
`
  },

  agent_email_outreach: {
    title: 'High-Converting Cold Outreach Cadence',
    type: 'document',
    outputData: {
      campaign_name: 'Sub-Tier Supply Chain Blindspot Sprint',
      target_persona: 'VP of Supply Chain & Operations Directors'
    },
    content: `# High-Converting Cold Outreach Cadence

**Campaign Name**: Sub-Tier Blindspot Outreach  
**Audience**: VPs of Supply Chain at mid-market hardware/electronics firms  

---

### Step 1: The Observational Disruption Hook (Day 1)
**Subject**: {{companyName}}'s Tier-2 supplier exposure?  
**Body**:
> Hi {{firstName}},
> 
> Most hardware leaders we speak with have complete visibility into their Tier-1 assembly partners, but zero early warning when a Tier-2 component fab in Southeast Asia slips schedule.
> 
> We built ApexFlow to map and monitor multi-tier Bill-of-Materials risks continuously—flagging shortages 14 days before your lines feel it.
> 
> Worth seeing an example vulnerability report for {{companyName}}'s sector?
> 
> Best,  
> Alex Rivera  
> Head of Growth, ApexFlow

---

### Step 2: The Value-Add Metrics Proof (Day 4)
**Subject**: Re: {{companyName}}'s Tier-2 supplier exposure?  
**Body**:
> Hi {{firstName}},
> 
> Sharing a quick benchmark: Vanguard Robotics recently cut unexpected stockout disruptions by 34% within their first 60 days on ApexFlow—without replacing their NetSuite ERP.
> 
> We run automated multi-tier graph simulations that give you pre-vetted backup suppliers the moment a bottleneck emerges.
> 
> Can I send over a 2-page brief on how we plug into your existing ERP in 48 hours?
> 
> Best,  
> Alex

---

### Step 3: Polite Permission to Close (Day 8)
**Subject**: Closing the loop / {{companyName}}  
**Body**:
> Hi {{firstName}},
> 
> I assume supply chain visibility is either fully solved internally or not a priority this quarter.
> 
> If you ever run into unpredictable component lead times or want to stress-test your BOM graph against global logistics disruptions, feel free to reach back out.
> 
> Wishing you and the team a smooth quarter.
> 
> Best,  
> Alex
`
  },

  agent_marketing_newsletter: {
    title: 'Founding Launch Newsletter - The Fragility Tax',
    type: 'document',
    outputData: {
      edition_number: 1,
      newsletter_title: 'The Fragility Tax: Why Modern Supply Chains Break in the Dark'
    },
    content: `# The Fragility Tax: Why Modern Supply Chains Break in the Dark

**ApexFlow Dispatch — Issue #01**  

---

For three decades, global manufacturing optimized for a single god: **Just-in-Time efficiency**.

Inventories were shrunk to zero. Warehouses were celebrated for being empty. Sourcing went to the lowest-cost bidder on the other side of the planet.

It was an engineering marvel—until the world changed.

Today, mid-market manufacturers don't suffer from a lack of diligence. They suffer from an invisible structural tax: **The Fragility Tax**. 

When a single raw chemical refinery in Taiwan halts operations, it cascades through four intermediate subcontractors before arriving at your assembly plant as an unexplained 6-week delay. By the time your ERP flags the stockout, your line is dead in the water.

### Why Legacy Software Can't Save You
Traditional ERPs are accounting ledgers disguised as supply chain tools. They record purchase orders after you sign them. They do not simulate the living, volatile graph of world trade.

### The New Architecture: Graph Resilience
At ApexFlow, we believe the next era of industrial strength belongs to companies that replace static purchase orders with **continuous graph intelligence**:
1. **Observability to the Source**: Mapping not just who sells to you, but who sells to them.
2. **Deterministic Playbooks**: Knowing the exact secondary supplier, pricing contract, and logistics route before the crisis hits.
3. **Executive Governance**: Giving humans high-leverage steering wheels instead of panic rooms.

We are opening 15 private beta seats this month for manufacturing operations leaders.

👉 **[Apply for Private Beta Access](https://apexflow.io/beta)**
`
  },

  agent_product_analytics: {
    title: 'Product Analytics & Telemetry Blueprint',
    type: 'analysis',
    outputData: {
      north_star_metric: 'Prevented Production Downtime Hours (PPDH)',
      activation_definition: 'Customer uploads first BOM CSV, completes ERP connector sync, and reviews initial Risk Intelligence Matrix.'
    },
    content: `# Product Analytics & Telemetry Blueprint

---

## 1. North Star Metric Formulation
- **North Star Metric**: **Prevented Production Downtime Hours (PPDH)**
- **Formula**: \`Sum of predicted stockout hours prevented by executing ApexFlow mitigation playbooks\`
- **Key Input Metrics**:
  1. *Weekly Active Operators (WAO)* engaging with risk alerts
  2. *Mean Time to Playbook Approval (MTPA)* (< 4 hours)
  3. *BOM Component Graph Coverage* (% of SKUs mapped to Tier-2 suppliers)

---

## 2. Core Funnel Progression
1. **Onboarding**: Account Created -> ERP Connector Authenticated -> First BOM Uploaded.
2. **Activation**: First Risk Matrix Generated -> Operator Inspects Tier-2 Supplier Alert.
3. **Engagement**: Disruption Warning Triggered -> Mitigation Playbook Dispatched -> Manager Approves Sourcing Alternative.
4. **Retention**: Weekly automated BOM graph audits executed with > 90% dashboard review rate.

---

## 3. Telemetry Event Specification Taxonomy

| Event Name | Trigger Condition | Properties Schema |
| :--- | :--- | :--- |
| \`bom_uploaded\` | User uploads BOM CSV or initiates ERP import | \`sku_count: number, supplier_count: number, file_format: string\` |
| \`graph_mapped\` | Multi-tier supplier graph generated | \`tier2_nodes: number, tier3_nodes: number, risk_score: number\` |
| \`alert_triggered\` | Geopolitical/customs disruption detected | \`alert_id: string, severity: 'critical'\|'warning', affected_skus: string[]\` |
| \`playbook_generated\` | Automated mitigation protocol drafted | \`playbook_id: string, target_vendor: string, projected_savings: number\` |
| \`approval_submitted\` | Manager accepts or requests changes to mitigation | \`task_id: string, decision: 'approved'\|'rejected', latency_seconds: number\` |
`
  }
};
