# ORCHSTR — AI-Native Company Operating System

**ORCHSTR** is an enterprise-grade AI-native company operating system designed to run an autonomous company from an initial startup idea through continuous operational iteration.

It integrates a **deterministic Directed Acyclic Graph (DAG) task planner**, **7 specialized agent deliverable contracts**, a **cryptographically-enforced human approval system**, a **shared memory & evidence ledger**, **native Google Antigravity IDE workflow integration**, and a **production-quality operational review engine** based on the Theory of Constraints.

---

## Architectural Principles & Guardrails

- **Zero-Model API Runtime Boundary**: ORCHSTR never makes calls to Gemini, OpenAI, Anthropic, OpenRouter, or other model APIs. Reasoning and execution are initiated by the user's installed **Google Antigravity** environment through native workspace skills, task packets, and the local CLI bridge.
- **Deterministic Orchestration Engine**: Built-in dependency-aware task planner that models tasks as a Directed Acyclic Graph (DAG), detects circular dependencies, calculates parallelizable readiness, blocks dependent tasks until prerequisites are completed and approved, and automatically unblocks downstream tasks upon manager signoff.
- **Server-Enforced Consequential Approvals**: Drafting and internal analysis proceed autonomously. Consequential external changes (sending outbound emails, publishing newsletters, spending money) require explicit founder approval enforced at the server action layer. Approvals feature SHA-256 payload checksum verification, stale request expiration, tamper detection, and replay protection.
- **Shared Memory & Evidence Provenance**: Maintains a canonical company brief, assumptions ledger, decision log, competitor/customer records, and an evidence ledger that explicitly categorizes inputs by provenance (`observed_fact`, `sourced_claim`, `hypothesis`, `recommendation`) and surfaces conflicting evidence for human resolution.
- **Production-Quality Operational Review**: Follows the continuous Operating Loop (**Build ➔ Sell ➔ Observe ➔ Support ➔ Learn ➔ Iterate**). Evaluates throughput bottlenecks via Theory of Constraints, establishes a single operating priority, and formulates a 2-week measurable experiment with an assigned owner and review date.
- **Process Resilience & High Availability**: Automated startup recovery of interrupted tasks, point-in-time timestamped database backups with `PRAGMA integrity_check`, and a structured logger that redacts secrets, tokens, and PII.
- **Strict Workspace Isolation**: Multi-tenant database design where all tables (`companies`, `company_context`, `tasks`, `task_dependencies`, `artifacts`, `decisions`, `approvals`, `evidence_ledger`, `activity_events`, `agent_runs`) are partitioned by `company_id`.

---

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite.
- **Styling**: Tailwind CSS with an obsidian/zinc dark theme palette (`#09090b`, `#0e0e12`, `#18181b`) and monospace typography accents.
- **Backend / API**: Node.js 24 + TypeScript (Express 5 REST API) in a unified repository workflow.
- **Database**: SQLite with persistent state via Node's native synchronous `node:sqlite` engine (`DatabaseSync`), configured with Write-Ahead Logging (WAL) and foreign keys.
- **Data Validation & Contracts**: Zod schemas for all domain entities, deliverable contracts, and API routes.
- **Testing**: Vitest for unit & integration testing; Playwright for end-to-end browser journeys.

---

## Organizational Governance & Seven Specialized Agents

### 1. Governance Roles
1. **Founder / CEO**: Final decision-maker governing cross-functional priorities, capital allocation, and consequential external actions.
2. **Strategy Manager**: Coordinates brand positioning and brand identity deliverables.
3. **Research Manager**: Coordinates customer discovery, hypothesis validation, and pain point taxonomy.
4. **Growth Manager**: Coordinates prospect discovery, outbound email campaigns, and thought-leadership publications.
5. **Product Manager**: Coordinates product telemetry, activation definitions, and funnel analytics.

### 2. Seven Specialized Agents & Deliverable Contracts

Each agent has a stable ID, formal Zod deliverable contract schema, clear department assignment, and strict operational guidelines:

| Agent ID | Name & Role | Deliverable Contract Focus | Acceptance Review Criteria |
| :--- | :--- | :--- | :--- |
| `agent_brand_positioning` | **Brand Positioning Strategist** | Customer problem, ideal customer profile (ICP), wedge market, competitive alternatives, differentiation, positioning statement, messaging pillars. | Validated customer problem, differentiated wedge, distinct messaging pillars. |
| `agent_brand_identity` | **Brand Identity Architect** | Brand story, personality, verbal voice principles, visual direction (colors, typography), identity rules, creative asset briefs. Consumes approved positioning. | Cohesive brand story, clear voice guidelines, action-oriented asset briefs. |
| `agent_customer_research` | **Customer Research Specialist** | Customer language, interview guides, market evidence, current workarounds, competitor landscape, willingness-to-pay signals, unresolved hypotheses. Sourced evidence and confidence tags. | Sourced market evidence, verified customer quotes, testable hypotheses. |
| `agent_prospect_discovery` | **Prospect Discovery Specialist** | Verified company/contact records, source URLs, buying signals, qualification rationale, confidence ratings, and exclusion reasons. **Zero fabricated leads or hallucinated contacts.** | Sourced URLs, verifiable buying signals, justified qualification criteria. |
| `agent_email_outreach` | **Outbound Campaign Specialist** | Personalized sequences, follow-ups, message rationales, draft statuses. Strictly references approved positioning and verified prospect evidence. | References approved positioning, uses real prospect signals, clear call-to-actions. |
| `agent_marketing_newsletter` | **Content & Newsletter Strategist** | Campaign briefs, newsletter editions, content calendars, distribution channel hypotheses, and success metrics. | Narrative alignment with approved positioning, clear hook, distribution hypotheses. |
| `agent_product_analytics` | **Product Analytics Architect** | Event taxonomy, activation and retention definitions, funnel drop-off analysis, observed friction, proposed product experiments. **Zero invented usage numbers.** | Clean event naming taxonomy, measurable activation criteria, testable experiment backlog. |

---

## Google Antigravity Integration & Workflows

ORCHSTR integrates with the user's installed Google Antigravity environment via workspace-native skills and workflows:

### Workspace Skills (`.agents/skills/`)
- **`orchstr`** (`.agents/skills/orchstr/SKILL.md`): Exposes the `/orchstr` slash command in the Antigravity chat UI:
  ```text
  /orchstr lets work on this business idea: [BUSINESS IDEA]
  ```
  Parses startup proposals, initializes the company workspace, establishes the canonical brief and assumptions, generates the dependency-aware task plan, prepares task packets, and provides a structured execution summary.
- **7 Specialist Skills**:
  - `brand-positioning`
  - `brand-identity`
  - `customer-research`
  - `prospect-discovery`
  - `email-outreach`
  - `marketing-newsletters`
  - `product-analytics`

### Workspace Workflows (`.agents/workflows/`)
- **`orchstr.md`**: Provides backward-compatible workflow discovery for Antigravity runners.

### Local CLI Bridge (`src/server/cli.ts`)
Antigravity subagents or automated workflows can interact directly with the local ORCHSTR operating system without an HTTP server:
```bash
# Create a company workspace
npx tsx src/server/cli.ts workspace:create --name "ApexFlow Systems" --industry "Supply Chain" --brief "Autonomous supply chain operating system." --target "VP Supply Chain" --value "Prevent Tier-2 stockouts"

# Generate deterministic task plan
npx tsx src/server/cli.ts plan:generate --company comp_123

# Export actionable task packet
npx tsx src/server/cli.ts task:packet --company comp_123 --task task_456

# Submit Antigravity deliverable
npx tsx src/server/cli.ts task:submit --company comp_123 --task task_456 --title "Customer Research Dossier" --file ./output.md

# Review & approve consequential action
npx tsx src/server/cli.ts approval:approve --approval appr_789 --reviewer "Founder / CEO"

# Generate operational review report
npx tsx src/server/cli.ts review:generate --company comp_123

# Create timestamped database backup
npx tsx src/server/cli.ts backup:create
```

---

## Server-Enforced Human Approval System

Consequential actions require explicit human approval enforced in the backend action layer:

1. **Cryptographic Checksum Verification**: Every approval request computes a SHA-256 hash of the action payload (`task_id`, `action_type`, `payload`, `affected_resources`). If the payload is modified while pending, execution is rejected and re-approval is required.
2. **Replay Protection**: Completed approvals record `executed_at` and `execution_result`. Subsequent execution attempts are blocked to prevent duplicate side effects.
3. **Stale Request Expiration**: Pending approvals carry an expiration window (default: 72 hours). Stale requests are automatically marked `expired`.
4. **Safe Simulation Adapters**: In this phase, external actions (`send_outbound_emails`, `publish_newsletter`) run through safe simulation adapters returning clearly marked `{ simulated: true }` responses.

---

## Production-Quality Operational Review

Accessible via the **Operational Review** tab in the dashboard or `GET /api/companies/:id/review`:

- **Operating Loop Phase Tracking**: Evaluates the company against **Build ➔ Sell ➔ Observe ➔ Support ➔ Learn ➔ Iterate**.
- **Theory of Constraints Bottleneck Analysis**: Identifies whether the current constraint is in Strategy, Research, Growth, or Execution throughput.
- **Single Priority Recommendation**: Cuts through cognitive overload by prescribing exactly one highest-leverage priority.
- **Two-Week Measurable Experiment**: Formulates a testable hypothesis, concrete intervention, single metric, assigned owner, and 14-day review deadline.
- **Core Operating Metrics**: Task completion rates, blocked dependency delays, approval turnaround SLA, artifact revision history, untested hypothesis counts, and sourced research coverage.

---

## Process Resilience & Database Backups

- **Interrupted Task Recovery**: On server startup (`src/server/index.ts`), the scheduler queries for tasks left in `running` status due to abnormal termination or power loss and safely resets them to `queued` with structured warning logs.
- **Automated Point-in-Time Backups**: `src/db/backup.ts` creates timestamped SQLite backups into `.backups/`, verifies SQLite integrity via `PRAGMA integrity_check`, and supports verified restore operations.
- **Secret-Redacting Logger**: `src/server/services/logger.ts` redacts API keys, bearer tokens, passwords, authorization headers, and email addresses from application logs.

---

## Walkthrough: Seed Data & Multi-Stage Workflow

The repository ships with two pre-seeded workspaces:
1. **ApexFlow Systems** (*Autonomous Supply Chain Resilience Operating System*):
   - **Customer Research**: Completed with verified dossier.
   - **Brand Positioning**: In **Review** awaiting Strategy Manager signoff.
   - **Brand Identity**, **Prospect Discovery**, **Marketing Newsletter**: **Blocked** awaiting approved positioning.
   - **Email Outreach**: **Blocked** awaiting both Prospect Discovery and Brand Identity.
   - **Product Analytics**: **Queued** (parallelizable root task).
2. **BioPulse Health** (*Decentralized Clinical Trials Infrastructure*): Demonstrates strict multi-tenant workspace isolation.

### Step-by-Step Approval & Unblocking Flow:
1. Open `http://localhost:3000` (or `3001` in production).
2. In the top navigation, click **Approval Inbox**.
3. Select the pending request for **Brand Positioning & Competitor Wedge**.
4. Review the deliverable against the acceptance criteria checklist.
5. Provide review feedback and click **Approve & Complete Task**.
6. Switch to the **Task Board**:
   - Brand Positioning transitions to **Completed**.
   - Dependent tasks (**Brand Identity**, **Prospect Discovery**, **Marketing Newsletter**) are **automatically unblocked from Blocked to Queued**!

---

## Getting Started

### Prerequisites
- Node.js `>= 22.5.0` (Node 24 recommended, featuring native `node:sqlite`).
- npm `>= 10` or pnpm `>= 9`.

### 1. Installation
```bash
git clone https://github.com/swastikpatel0305/orchstr.git
cd orchstr
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```
*(Contains environment variable keys only, zero secrets).*

### 3. Initialize & Seed Database
```bash
npm run seed
```

### 4. Development Workflow
Run both backend server and Vite client concurrently:
```bash
npm run dev
```
- Client: `http://localhost:3000`
- API Server: `http://localhost:3001`
- Health Endpoint: `http://localhost:3001/api/health`

### 5. Production Build & Server
```bash
npm run build
npm start
```
The server serves both the compiled React frontend from `dist/` and the Express 5 REST API from a single unified process.

---

## Testing

### Unit & Integration Tests (Vitest)
Executes 20 tests across 6 test suites validating the DAG planner, orchestrator, approval engine, shared memory review gates, operational review service, and database backup/recovery:
```bash
npm run test
```

### End-to-End Tests (Playwright)
Executes 6 critical browser tests in Chromium validating full founder journey (idea -> workspace -> task -> packet -> simulate -> artifact -> review -> decision), company isolation, tab navigation, and approval unblocking:
```bash
npm run test:e2e
```

---

## Repository Layout

```
orchstr/
├── .agents/
│   ├── skills/
│   │   ├── orchstr/SKILL.md          # /orchstr slash command skill
│   │   ├── brand-positioning/
│   │   ├── brand-identity/
│   │   ├── customer-research/
│   │   ├── prospect-discovery/
│   │   ├── email-outreach/
│   │   ├── marketing-newsletters/
│   │   └── product-analytics/
│   └── workflows/
│       └── orchstr.md                # Backward-compatible Antigravity workflow
├── src/
│   ├── agents/
│   │   ├── contracts/                # Formal Zod deliverable contracts
│   │   ├── definitions/              # 7 Specialized Agent definitions
│   │   └── managers/                 # 5 Governance Manager roles
│   ├── components/
│   │   ├── activity/                 # ActivityFeed
│   │   ├── approvals/                # ApprovalInbox
│   │   ├── artifacts/                # ArtifactBrowser
│   │   ├── directory/                # AgentDirectory
│   │   ├── layout/                   # Navbar, TabNav
│   │   ├── overview/                 # CompanyOverview, Modals
│   │   ├── packet/                   # AntigravityPacketViewer
│   │   ├── review/                   # OperationalReviewTab
│   │   └── tasks/                    # TaskBoard, Modals
│   ├── db/
│   │   ├── connection.ts             # SQLite connection (WAL, foreign keys)
│   │   ├── schema.ts                 # Normalized DDL table definitions
│   │   ├── seed.ts                   # Seed data generator
│   │   └── backup.ts                 # Backup, restore & integrity service
│   ├── memory/
│   │   ├── shared-memory.ts          # Shared memory, evidence ledger & gates
│   │   └── types.ts
│   ├── orchestration/
│   │   ├── planner.ts                # Dependency-aware DAG planner
│   │   ├── orchestrator.ts           # Deterministic Orchestration Engine
│   │   ├── scheduler.ts              # Interrupted task recovery scheduler
│   │   └── execution-adapter.ts      # Antigravity Task Packet generator
│   ├── server/
│   │   ├── approvals/                # ApprovalEngine & SafeActionLayer
│   │   ├── routes/                   # api-router.ts
│   │   ├── services/                 # review-service.ts, logger.ts
│   │   ├── app.ts                    # Express 5 App
│   │   ├── cli.ts                    # Local CLI bridge
│   │   └── index.ts                  # Server entrypoint
│   ├── shared/
│   │   └── schemas/                  # Shared Zod schemas & interfaces
│   ├── api.ts                        # Frontend REST API client
│   ├── App.tsx                       # Main application shell
│   └── types.ts                      # Frontend TypeScript types
├── tests/
│   ├── unit/                         # 6 Vitest test suites (20 tests)
│   └── e2e/                          # 2 Playwright test suites (6 tests)
├── .env.example
├── playwright.config.ts
├── tailwind.config.js
├── vite.config.ts
└── vitest.config.ts
```

---

## License
MIT
