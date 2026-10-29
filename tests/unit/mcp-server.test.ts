import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('ORCHSTR MCP Server Integration (over stdio)', () => {
  const testDbPath = path.resolve('test-mcp-integration.db');
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    // Remove test DB if leftover
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);

    const serverScript = path.resolve('dist/mcp/server.js');
    if (!fs.existsSync(serverScript)) {
      throw new Error(`MCP build artifact not found at ${serverScript}. Run npm run mcp:build first.`);
    }

    transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverScript],
      env: {
        ...process.env,
        ORCHSTR_DB_PATH: testDbPath
      }
    });

    client = new Client({
      name: 'orchstr-test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await client.connect(transport);
  });

  afterAll(async () => {
    try {
      await client.close();
    } catch {
      // Ignore
    }
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  });

  it('lists registered tools and strictly enforces human-only approvals (no approve/reject tools)', async () => {
    const response = await client.listTools();
    const toolNames = response.tools.map(t => t.name);

    expect(toolNames).toContain('init_company');
    expect(toolNames).toContain('get_next_task');
    expect(toolNames).toContain('submit_task');
    expect(toolNames).toContain('request_approval');
    expect(toolNames).toContain('get_approval_status');
    expect(toolNames).toContain('list_pending_approvals');
    expect(toolNames).toContain('record_evidence');
    expect(toolNames).toContain('generate_operational_review');

    // Hard Rule: approvals stay human-only. No approve, reject, or execute approval tools!
    expect(toolNames).not.toContain('approve_approval');
    expect(toolNames).not.toContain('reject_approval');
    expect(toolNames).not.toContain('execute_approval');
    expect(toolNames).not.toContain('submit_approval');
  });

  it('lists registered resources and templates for companies', async () => {
    const response = await client.listResourceTemplates();
    const uris = response.resourceTemplates.map(r => r.uriTemplate);

    expect(uris).toContain('orchstr://company/{id}/brief');
    expect(uris).toContain('orchstr://company/{id}/assumptions');
    expect(uris).toContain('orchstr://company/{id}/decisions');
    expect(uris).toContain('orchstr://company/{id}/evidence');
    expect(uris).toContain('orchstr://company/{id}/artifacts');
    expect(uris).toContain('orchstr://company/{id}/plan');
  });

  it('lists registered prompts including orchstr and specialist agents', async () => {
    const response = await client.listPrompts();
    const promptNames = response.prompts.map(p => p.name);

    expect(promptNames).toContain('orchstr');
    expect(promptNames).toContain('brand-positioning');
    expect(promptNames).toContain('customer-research');
    expect(promptNames).toContain('email-outreach');
    expect(promptNames).toContain('unit-economics');
    expect(promptNames).toContain('website-build');
  });

  it('executes the core loop: init_company -> get_next_task -> submit_task with invalid then valid payload', async () => {
    // 1. init_company
    const initRes = await client.callTool({
      name: 'init_company',
      arguments: {
        name: 'NexusFlow Automation',
        idea: 'Autonomous warehouse inventory routing with sub-second reconciliations.',
        industry: 'Supply Chain Tech',
        target_customer: 'VP of Logistics at mid-market 3PLs'
      }
    });

    expect(initRes.isError).toBeFalsy();
    const initText = (initRes.content as any)[0].text;
    const initData = JSON.parse(initText);

    expect(initData.company_id).toBeDefined();
    expect(initData.company_name).toBe('NexusFlow Automation');
    expect(initData.plan_summary.total_tasks).toBeGreaterThan(0);
    expect(initData.first_ready_task).toBeDefined();

    const companyId = initData.company_id;

    // 2. get_next_task
    const nextRes = await client.callTool({
      name: 'get_next_task',
      arguments: { company_id: companyId }
    });

    expect(nextRes.isError).toBeFalsy();
    const nextData = JSON.parse((nextRes.content as any)[0].text);
    expect(nextData.has_ready_task).toBe(true);
    expect(nextData.task_id).toBeDefined();
    expect(nextData.card).toBeDefined();
    expect(nextData.card.checklist).toBeDefined();

    const taskId = nextData.task_id;
    const agentId = nextData.assigned_agent.id;

    // 3. submit_task with INVALID payload (must return readable Zod issues and isError: true)
    const invalidSubmitRes = await client.callTool({
      name: 'submit_task',
      arguments: {
        company_id: companyId,
        task_id: taskId,
        payload: {
          faulty_key: 'missing all required fields'
        }
      }
    });

    expect(invalidSubmitRes.isError).toBe(true);
    const errData = JSON.parse((invalidSubmitRes.content as any)[0].text);
    expect(errData.error).toContain('Validation failed');
    expect(errData.details.validation_issues.length).toBeGreaterThan(0);

    // 4. submit_task with VALID payload (Customer Research)
    const validPayload = {
      customer_language: [
        'Our inventory reconciliation currently takes 4 hours every morning.',
        'We lose at least 2 pallets a week due to phantom stockouts.'
      ],
      interview_questions: [
        'How many warehouse management systems do you currently sync manually?',
        'What happens when physical counts mismatch ERP ledgers?',
        'How much do third-party discrepancy chargebacks cost you monthly?'
      ],
      market_evidence: [
        {
          claim: 'Average 3PL facility loses 1.2% of GMV to inventory variance.',
          source: 'Logistics Benchmark Report 2025',
          confidence: 'high',
          evidence_type: 'sourced_claim'
        },
        {
          claim: 'Manual cycle counts take 22 labor hours weekly.',
          source: 'Site Visit Interview at Metro Logistics',
          confidence: 'high',
          evidence_type: 'observed_fact'
        }
      ],
      workarounds: [
        'Daily end-of-day export to Excel with manual VLOOKUP reconciliations.'
      ],
      competitor_map: [
        {
          competitor: 'Legacy WMS Inc',
          category: 'Enterprise Monolith',
          market_share_notes: 'Dominant in Tier 1 warehouses, but uncustomizable and slow.'
        }
      ],
      willingness_to_pay_signals: [
        {
          price_point: '$2,500/month per warehouse',
          value_driver: 'Preventing discrepancy chargebacks',
          source: 'Director of Ops at Apex Cargo'
        }
      ],
      unresolved_hypotheses: [
        {
          hypothesis: 'Logistics supervisors will adopt barcode scanning if sync latency is under 500ms.',
          test_method: 'Shadow shift during morning intake.',
          confidence: 'medium'
        }
      ]
    };

    const validSubmitRes = await client.callTool({
      name: 'submit_task',
      arguments: {
        company_id: companyId,
        task_id: taskId,
        payload: validPayload,
        title: 'Customer Discovery Dossier - NexusFlow'
      }
    });

    expect(validSubmitRes.isError).toBeFalsy();
    const submitData = JSON.parse((validSubmitRes.content as any)[0].text);
    expect(submitData.accepted).toBe(true);
    expect(submitData.artifact_id).toBeDefined();
    expect(submitData.next_ready_task).toBeDefined();
  });
});
