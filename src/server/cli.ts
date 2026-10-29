import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '../db/connection.js';
import { OrchestrationEngine } from '../orchestration/orchestrator.js';
import { SharedMemoryManager } from '../memory/shared-memory.js';
import { ApprovalEngine } from './approvals/approval-engine.js';
import { SafeActionLayer } from './approvals/action-layer.js';
import { OperationalReviewService } from './services/review-service.js';
import { BackupService } from '../db/backup.js';
import { SafeLogger } from './services/logger.js';

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

const db = getDatabase();
const orchestrator = new OrchestrationEngine(db);
const memoryManager = new SharedMemoryManager(db);
const approvalEngine = new ApprovalEngine(db);
const actionLayer = new SafeActionLayer(approvalEngine);
const reviewService = new OperationalReviewService(db);
const backupService = new BackupService();

async function main() {
  try {
    switch (`${command}:${subcommand}`) {
      case 'workspace:create': {
        const name = getArg('--name') || 'Autonomous Venture';
        const idea = getArg('--idea') || 'AI-native operations platform';
        const industry = getArg('--industry') || 'Enterprise Software';

        const result = orchestrator.createCompany({
          name,
          industry,
          vision: `To lead category transformation in ${industry} through autonomous operations.`,
          brief: idea,
          target_customer: 'Enterprise Operations & Technical Leaders',
          value_prop: 'Autonomous, deterministic workflow execution with human-in-the-loop executive control.',
          assumptions: [
            {
              statement: 'Decision-makers require explicit managerial signoff before consequential actions execute.',
              confidence: 'high',
              status: 'validated',
              category: 'product'
            },
            {
              statement: 'Specialized agent contracts produce higher quality deliverables than open-ended chats.',
              confidence: 'high',
              status: 'validated',
              category: 'product'
            }
          ]
        });

        // Ensure file workspace exists
        const slug = result.company.slug;
        const compDir = path.join(process.cwd(), 'companies', slug);
        fs.mkdirSync(path.join(compDir, 'artifacts'), { recursive: true });
        fs.mkdirSync(path.join(compDir, 'tasks'), { recursive: true });
        fs.mkdirSync(path.join(compDir, 'reviews'), { recursive: true });

        fs.writeFileSync(
          path.join(compDir, 'company.json'),
          JSON.stringify(result, null, 2)
        );

        console.log(JSON.stringify({
          success: true,
          companyId: result.company.id,
          name: result.company.name,
          slug,
          workspacePath: `companies/${slug}`
        }, null, 2));
        break;
      }

      case 'workspace:list': {
        const companies = orchestrator.listCompanies();
        console.log(JSON.stringify(companies, null, 2));
        break;
      }

      case 'plan:generate': {
        const companyId = getArg('--company');
        if (!companyId) throw new Error('--company <id> required');

        // Generate 7-agent canonical task plan
        const p1 = orchestrator.createTask(companyId, {
          title: 'Customer Discovery & Pain Point Taxonomy',
          description: 'Extract customer pain points, quotes, and willingness-to-pay evidence.',
          assigned_agent_id: 'agent_customer_research',
          department: 'Research',
          priority: 'high',
          acceptance_criteria: ['Customer quotes', 'Evidence classification', 'Willingness to pay'],
          parallelizable: true
        });

        const p2 = orchestrator.createTask(companyId, {
          title: 'Category Brand Positioning & Wedge Strategy',
          description: 'Define category narrative, wedge market, and competitive moats.',
          assigned_agent_id: 'agent_brand_positioning',
          department: 'Strategy',
          priority: 'critical',
          acceptance_criteria: ['Standard positioning statement', 'Competitor contrast matrix'],
          dependencies: [p1.id]
        });

        const p3 = orchestrator.createTask(companyId, {
          title: 'Brand Identity Guidebook & Verbal Principles',
          description: 'Establish verbal voice rules, dos/donts, and dark theme design tokens.',
          assigned_agent_id: 'agent_brand_identity',
          department: 'Strategy',
          priority: 'medium',
          acceptance_criteria: ['Voice pillars', 'Color tokens', 'Creative briefs'],
          dependencies: [p2.id]
        });

        const p4 = orchestrator.createTask(companyId, {
          title: 'Ideal Customer Profile & Verified Target Accounts',
          description: 'Map buyer personas and qualify target accounts without fabricating contacts.',
          assigned_agent_id: 'agent_prospect_discovery',
          department: 'Growth',
          priority: 'high',
          acceptance_criteria: ['Verified company records', 'Buying signals'],
          dependencies: [p2.id],
          parallelizable: true
        });

        const p5 = orchestrator.createTask(companyId, {
          title: 'High-Converting Cold Outreach Campaign',
          description: 'Author 3-step outbound sequence using approved positioning and verified prospect evidence.',
          assigned_agent_id: 'agent_email_outreach',
          department: 'Growth',
          priority: 'high',
          acceptance_criteria: ['3-step cadence', 'Follow-up objection handling'],
          dependencies: [p4.id, p3.id]
        });

        const p6 = orchestrator.createTask(companyId, {
          title: 'Founding Launch Newsletter & Content Calendar',
          description: 'Draft the inaugural thought-leadership newsletter and 4-week editorial calendar.',
          assigned_agent_id: 'agent_marketing_newsletter',
          department: 'Growth',
          priority: 'medium',
          acceptance_criteria: ['Newsletter draft', 'Content calendar'],
          dependencies: [p2.id],
          parallelizable: true
        });

        const p7 = orchestrator.createTask(companyId, {
          title: 'Product Analytics & Telemetry Blueprint',
          description: 'Design event taxonomy, activation definitions, and measurable experiment proposals.',
          assigned_agent_id: 'agent_product_analytics',
          department: 'Product',
          priority: 'high',
          acceptance_criteria: ['Event taxonomy', 'Activation formula', 'Proposed experiment'],
          dependencies: [p1.id],
          parallelizable: true
        });

        console.log(JSON.stringify({
          success: true,
          companyId,
          tasksGenerated: [p1.id, p2.id, p3.id, p4.id, p5.id, p6.id, p7.id]
        }, null, 2));
        break;
      }

      case 'task:packet': {
        const companyId = getArg('--company');
        const taskId = getArg('--task');
        if (!companyId || !taskId) throw new Error('--company and --task required');

        const { packet, promptMarkdown } = orchestrator.getTaskPacket(companyId, taskId);
        console.log(promptMarkdown);
        break;
      }

      case 'task:submit': {
        const companyId = getArg('--company');
        const taskId = getArg('--task');
        const filePath = getArg('--file');
        const title = getArg('--title');
        if (!companyId || !taskId || !filePath) throw new Error('--company, --task, and --file required');

        const content = fs.readFileSync(filePath, 'utf-8');
        const res = orchestrator.executeTask(companyId, taskId, {
          mode: 'manual',
          artifactTitle: title || `${taskId} - Deliverable`,
          artifactContent: content
        });

        console.log(JSON.stringify({
          success: true,
          task: res.task,
          artifactId: res.artifact.id,
          approvalId: res.approvalRequest.id,
          status: 'submitted_for_review'
        }, null, 2));
        break;
      }

      case 'approval:approve': {
        const companyId = getArg('--company');
        const approvalId = getArg('--approval');
        const feedback = getArg('--feedback') || 'Approved by Executive Reviewer';
        if (!companyId || !approvalId) throw new Error('--company and --approval required');

        const res = orchestrator.submitApproval(companyId, approvalId, {
          status: 'approved',
          feedback
        });

        console.log(JSON.stringify({
          success: true,
          approvalId,
          taskCompleted: res.task.id,
          unblockedTasks: res.unblockedTaskIds
        }, null, 2));
        break;
      }

      case 'review:generate': {
        const companyId = getArg('--company');
        if (!companyId) throw new Error('--company required');

        const review = reviewService.generateReview(companyId);

        // Also save to companies/<slug>/reviews/ if exists
        const comp = orchestrator.getCompany(companyId);
        if (comp) {
          const revDir = path.join(process.cwd(), 'companies', comp.company.slug, 'reviews');
          fs.mkdirSync(revDir, { recursive: true });
          const filename = `review_${new Date().toISOString().split('T')[0]}.md`;
          fs.writeFileSync(path.join(revDir, filename), review.markdown_report);
        }

        console.log(review.markdown_report);
        break;
      }

      case 'backup:create': {
        const meta = backupService.createBackup();
        console.log(JSON.stringify(meta, null, 2));
        break;
      }

      default:
        console.log(`
ORCHSTR Local CLI Bridge
Usage:
  npx tsx src/server/cli.ts workspace:create --name <name> --idea <idea>
  npx tsx src/server/cli.ts workspace:list
  npx tsx src/server/cli.ts plan:generate --company <companyId>
  npx tsx src/server/cli.ts task:packet --company <companyId> --task <taskId>
  npx tsx src/server/cli.ts task:submit --company <companyId> --task <taskId> --file <path>
  npx tsx src/server/cli.ts approval:approve --company <companyId> --approval <id> --feedback <text>
  npx tsx src/server/cli.ts review:generate --company <companyId>
  npx tsx src/server/cli.ts backup:create
        `);
    }
  } catch (err: any) {
    SafeLogger.error(`CLI Command Failed: ${err.message}`, err);
    console.error(JSON.stringify({ error: err.message }, null, 2));
    process.exit(1);
  }
}

main();
