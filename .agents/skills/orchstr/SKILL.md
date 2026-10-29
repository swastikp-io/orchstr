---
name: orchstr
description: AI-Native Company Operating System workflow. Use when the user types "/orchstr lets work on this business idea: [BUSINESS IDEA]" or wants to initialize an autonomous company workspace, generate an agent task plan, run specialized agents (positioning, identity, research, growth, analytics), and govern manager approvals.
---

# /orchstr — AI-Native Company Operating System Workflow

This workflow orchestrates an autonomous company from a startup idea across five managerial roles and seven specialized agents, with local SQLite persistence, DAG dependency enforcement, and human-in-the-loop approvals.

---

## Supported Invocation

```text
/orchstr lets work on this business idea: [BUSINESS IDEA]
```

*Example*:
```text
/orchstr lets work on this business idea: Autonomous drone delivery network for urgent rural hospital pathology samples.
```

---

## Operating Protocol for the Agent

When the user triggers `/orchstr`, execute the following 10 steps sequentially:

### Step 1: Parse the User Request
Extract the startup concept, target customer segment, core problem, and industry domain from the prompt.

### Step 2: Locate or Create the Company Workspace
Run the local CLI bridge to locate or initialize the workspace:
```powershell
npx tsx src/server/cli.ts workspace:create --name "[COMPANY NAME]" --idea "[BUSINESS IDEA]" --industry "[INDUSTRY]"
```
This initializes the company records in SQLite and establishes the directory `companies/<company-slug>/`.

### Step 3: Read Canonical Company Context & Shared Memory
Read the current company brief, active assumptions, strategic decisions, and approved artifacts:
- Inspect `companies/<company-slug>/company.json` or call the local API `GET /api/companies/:id`
- Check whether any approved brand positioning or customer research artifacts already exist.

### Step 4: Ask Focused Follow-up Questions (If Information Missing)
If critical business dimensions are unclear (e.g., specific buyer role, regulatory boundaries, initial pricing tier), ask 2–3 focused clarifying questions using plain text or the `ask_question` tool. Do not stall on minor details; establish working hypotheses for untested assumptions.

### Step 5: Update Brief & Explicit Assumption Ledger
Document verified facts versus untested hypotheses in the Shared Memory system:
- Classify assumptions into `market`, `product`, `customer`, and `growth` with `low`/`medium`/`high` confidence.
- Note any contradictory signals discovered.

### Step 6: Generate Deterministic Task Plan for the Seven Agents
Run the planner to instantiate the canonical 7-specialist task graph:
```powershell
npx tsx src/server/cli.ts plan:generate --company <companyId>
```
This registers:
1. `agent_customer_research`: Customer Discovery & Pain Point Dossier (Parallelizable)
2. `agent_brand_positioning`: Category Positioning & Competitor Matrix (Depends on Research)
3. `agent_brand_identity`: Verbal Identity & Visual Guide (Depends on Positioning)
4. `agent_prospect_discovery`: ICP Mapping & Verified Lead Sourcing (Depends on Positioning, Parallelizable)
5. `agent_email_outreach`: 3-Step Outbound Cold Campaign (Depends on Prospect Discovery & Identity)
6. `agent_marketing_newsletter`: Launch Edition & Editorial Calendar (Depends on Positioning, Parallelizable)
7. `agent_product_analytics`: Telemetry Event Schema & Activation Funnel (Depends on Research, Parallelizable)

### Step 7: Respect Dependencies & Identify Parallelizable Work
Evaluate the task DAG:
- Prerequisite tasks (`customer_research`) run first.
- Independent tasks (`product_analytics` and `customer_research`) execute in parallel.
- Downstream tasks (`brand_identity`, `prospect_discovery`, `marketing_newsletter`) remain **BLOCKED** until `brand_positioning` is approved by the Strategy Manager.
- Outreach sequences remain **BLOCKED** until both prospects and identity are ready.

### Step 8: Execute Tasks Using Antigravity Capabilities
For ready tasks, inspect the task packet:
```powershell
npx tsx src/server/cli.ts task:packet --company <companyId> --task <taskId>
```
Using the instructions in the task packet and the deliverable contracts in `.agents/skills/<agent-name>/SKILL.md`:
- Author the deliverable adhering strictly to the contract.
- Never fabricate fake user interviews, fake contact emails, or fake usage statistics.

### Step 9: Save Outputs & Submit to Local ORCHSTR Records
Save the markdown deliverable to `companies/<company-slug>/artifacts/<deliverable_name>.md`.
Submit the deliverable to ORCHSTR to transition the task to **Review** status:
```powershell
npx tsx src/server/cli.ts task:submit --company <companyId> --task <taskId> --file "companies/<company-slug>/artifacts/<deliverable_name>.md"
```

### Step 10: Executive Summary & Next Steps
Present a concise summary to the founder:
1. **Workspace Initialized**: Company name and slug.
2. **Completed Deliverables**: Deliverables produced and stored in artifacts.
3. **Pending Approvals**: Reviews awaiting manager signoff in the Approval Inbox.
4. **Current Bottleneck & Next Steps**: Unblocking instructions for the founder.
