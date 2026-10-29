import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SPECIALIZED_AGENTS } from '../agents/definitions/agents.js';

export function registerMcpPrompts(server: McpServer): void {
  // Master Orchestrator prompt: equivalent to /orchstr skill
  server.prompt(
    'orchstr',
    'AI-native Company Operating System master workflow: initialize workspace and run autonomous task execution loop.',
    {
      idea: z.string().describe('The startup idea, business thesis, or problem statement to work on'),
      name: z.string().optional().describe('Optional company name')
    },
    async ({ idea, name }) => {
      const companyName = name || 'NewCo';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are the executive operator of ORCHSTR, an AI-native company operating system.
We are building a new venture from scratch.

Venture Thesis:
"${idea}"
Proposed Name: ${companyName}

OPERATIONAL WORKFLOW:
1. Initialize Workspace:
   Call the \`init_company\` tool with name: "${companyName}", idea: "${idea}", and template: "founder-guide".
   Save the returned \`company_id\`.

2. The Autonomous Operating Loop:
   Loop continuously through ready tasks:
   a. Call \`get_next_task\` with \`company_id\`.
   b. If \`has_ready_task\` is false:
      - Inspect the remaining blocked or in-review tasks.
      - If tasks are waiting on human approvals, list the pending approvals and advise the human founder to review them in the dashboard or CLI.
      - Stop and summarize the company state.
   c. If \`has_ready_task\` is true:
      - Read the pre-loaded company brief, approved positioning, sourced evidence, acceptance criteria, and the task card (Founder Move, Watch Out, Checklist).
      - Do the deep reasoning for this specialist deliverable.
      - Construct the structured JSON deliverable strictly matching the assigned agent's contract schema.
      - Call \`submit_task\` with \`company_id\`, \`task_id\`, and \`payload\`.
      - If validation errors are returned, correct them immediately and resubmit in the same turn.
      - Upon acceptance, observe newly unblocked tasks and proceed to the next ready task.

GUARDRAILS:
- Zero fabricated data: never invent prospective leads, contact info, usage metrics, or revenue numbers. Cite verified sources or note missing data explicitly.
- Approvals stay human-only: you cannot approve or execute approvals. Consequential actions (like email sending or publishing) only call \`request_approval\`.
- All queries and actions are strictly scoped by \`company_id\`.

Begin by bootstrapping the company with \`init_company\`.`
            }
          }
        ]
      };
    }
  );

  // Register prompts for each of the 12 specialized agents
  for (const agent of SPECIALIZED_AGENTS) {
    const promptName = agent.id.replace('agent_', '').replace(/_/g, '-');
    server.prompt(
      promptName,
      `Instructions, contract schema, and operational playbook for ${agent.name} (${agent.department}).`,
      {
        company_id: z.string().describe('Company workspace ID'),
        task_id: z.string().optional().describe('Specific task ID if executing a task')
      },
      async ({ company_id, task_id }) => {
        let playbookNotes = '';
        if (agent.id === 'agent_email_outreach') {
          playbookNotes = `
PLAYBOOK: OUTBOUND CAMPAIGN SPECIALIST
- 7-day multi-touch cadence: Step 1 (email hook), Step 2 (+2d social touch/follow-up), Step 3 (+3d value add), Step 4 (+2d connection/soft walkaway).
- Only reference verified prospect evidence and approved positioning.
- Ensure inbox warmup verification (real domain, SPF, DKIM, DMARC).
- Consequential sending requires human approval and runs via safe simulation adapters.`;
        } else if (agent.id === 'agent_product_analytics') {
          playbookNotes = `
PLAYBOOK: PRODUCT ANALYTICS ARCHITECT
- Starter event taxonomy: signed_up, onboarding_completed, core_action_completed, trial_started, checkout_completed, subscription_upgraded, teammate_invited, support_ticket_opened.
- Continuous loop: find drop-off -> review session data -> talk to users -> testable hypothesis -> small intervention -> measure.
- Zero fabricated usage data; never track passwords, auth tokens, or private payment details.`;
        } else if (agent.id === 'agent_brand_positioning') {
          playbookNotes = `
PLAYBOOK: BRAND POSITIONING STRATEGIST
- Three-versions-of-the-customer exercise: (1) broad market, (2) reachable segment, (3) hyper-specific beachhead wedge.
- 5-part category story: Goal -> Obstacle -> Old way not good enough -> Better path -> Defensible outcome.`;
        } else if (agent.id === 'agent_unit_economics') {
          playbookNotes = `
PLAYBOOK: UNIT ECONOMICS SPECIALIST
- Deterministic formulas: Logo Churn = churned / starting; Lifetime = 1 / churn; ARPU = MRR / customers; LTV = ARPU * Lifetime; Gross-Margin LTV = LTV * margin; CAC = Spend / New Customers; Payback = CAC / (ARPU * margin).
- Never estimate or guess missing financial inputs: report them explicitly as missing.`;
        }

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are acting as the **${agent.name}** (${agent.role}) in ORCHSTR.
Department: **${agent.department}**
Workspace ID: \`${company_id}\`${task_id ? ` · Task ID: \`${task_id}\`` : ''}

MANDATE & PURPOSE:
${agent.purpose}

INSTRUCTIONS:
${agent.instructions}

ACCEPTANCE CRITERIA:
${agent.acceptance_criteria.map(c => `- ${c}`).join('\n')}

DELIVERABLE CONTRACT SCHEMA:
\`\`\`json
${typeof agent.output_schema === 'string' ? agent.output_schema : JSON.stringify(agent.output_schema, null, 2)}
\`\`\`
${playbookNotes}

To execute a task, gather company context using resources or \`get_next_task\`, formulate the deliverable according to the schema above, and call \`submit_task\`.`
              }
            }
          ]
        };
      }
    );
  }
}
