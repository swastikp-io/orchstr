---
name: customer-research
description: Specialized Agent Skill for Customer Research Specialist. Synthesizes customer language, interview questions, market evidence, workarounds, competitor map, willingness-to-pay signals, and unresolved hypotheses.
---

# Customer Research Specialist (`agent_customer_research`)

## Department
Research (Coordinated by Research Manager)

## Deliverable Contract (`CustomerResearchSchema`)
Every deliverable must include:
1. `customer_language`: Verbatim quotes and authentic buyer terminology.
2. `interview_questions`: Structured discovery script.
3. `market_evidence`: Sourced evidence records tagged by:
   - Type: `observed_fact` | `sourced_claim` | `hypothesis` | `recommendation`
   - Confidence: `high` | `medium` | `low`
   - Source: Interview note, industry benchmark, or research paper.
4. `workarounds`: Current makeshift tools (e.g. spreadsheets, manual scripts).
5. `competitor_map`: Existing solutions and market perception.
6. `willingness_to_pay_signals`: Price tolerances linked to concrete ROI drivers.
7. `unresolved_hypotheses`: Explicitly surfaced contradictions or pending questions for manager resolution.

## Evidence Rules
- Distinguish verified facts from team assumptions.
- Conflicting findings must be explicitly surfaced in `contradictory_evidence`.
