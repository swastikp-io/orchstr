# /orchstr Workflow

## Goal
Transform a startup idea into an operational autonomous company workspace, generate an agent task graph for the 7 specialists, and execute ready deliverables via the local ORCHSTR engine.

## Invocation
`/orchstr lets work on this business idea: [BUSINESS IDEA]`

## Execution Steps
1. Parse business idea and target customer.
2. Initialize or locate company workspace: `npx tsx src/server/cli.ts workspace:create --name "<name>" --idea "<idea>"`
3. Query company brief and current assumptions from `companies/<slug>/company.json`.
4. Ask focused questions if critical parameters are missing.
5. Generate the 7-agent task plan: `npx tsx src/server/cli.ts plan:generate --company <id>`
6. Respect DAG ordering (Research -> Positioning -> Identity / Prospects / Newsletters -> Outreach).
7. Execute ready tasks and save deliverables to `companies/<slug>/artifacts/`.
8. Submit deliverable: `npx tsx src/server/cli.ts task:submit --company <id> --task <taskId> --file <path>`
9. Notify founder of required approvals in the Approval Inbox.
