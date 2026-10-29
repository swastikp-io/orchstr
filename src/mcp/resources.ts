import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabaseSync } from 'node:sqlite';
import { OrchestrationEngine } from '../orchestration/orchestrator.js';
import { SharedMemoryManager } from '../memory/shared-memory.js';
import { OperationalReviewService } from '../server/services/review-service.js';

export function registerMcpResources(server: McpServer, db: DatabaseSync): void {
  const orchestrator = new OrchestrationEngine(db);
  const sharedMemory = new SharedMemoryManager(db);
  const reviewService = new OperationalReviewService(db);

  function getCompanyIds(): string[] {
    const companies = orchestrator.listCompanies();
    return companies.map(c => c.id);
  }

  // 1. Brief
  server.resource(
    'company-brief',
    new ResourceTemplate('orchstr://company/{id}/brief', {
      list: async () => ({
        resources: getCompanyIds().map(id => ({
          uri: `orchstr://company/${id}/brief`,
          name: `Company Brief (${id})`,
          mimeType: 'text/markdown'
        }))
      })
    }),
    async (uri, { id }) => {
      const companyId = Array.isArray(id) ? id[0] : id;
      const comp = orchestrator.getCompany(companyId);
      if (!comp) throw new Error(`Company ${companyId} not found.`);

      const text = `# ${comp.company.name} — Canonical Brief

**Industry:** ${comp.company.industry}  
**Vision:** ${comp.company.vision}  
**Target Customer:** ${comp.context.target_customer}  
**Value Proposition:** ${comp.context.value_prop}

## Strategic Brief
${comp.context.brief}

## Operating Constraints
${(comp.context.constraints || []).map(c => `- ${c}`).join('\n')}
`;
      return {
        contents: [{ uri: uri.href, text, mimeType: 'text/markdown' }]
      };
    }
  );

  // 2. Assumptions
  server.resource(
    'company-assumptions',
    new ResourceTemplate('orchstr://company/{id}/assumptions', {
      list: async () => ({
        resources: getCompanyIds().map(id => ({
          uri: `orchstr://company/${id}/assumptions`,
          name: `Company Assumptions Ledger (${id})`,
          mimeType: 'application/json'
        }))
      })
    }),
    async (uri, { id }) => {
      const companyId = Array.isArray(id) ? id[0] : id;
      const comp = orchestrator.getCompany(companyId);
      if (!comp) throw new Error(`Company ${companyId} not found.`);

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(comp.context.assumptions || [], null, 2),
          mimeType: 'application/json'
        }]
      };
    }
  );

  // 3. Decisions
  server.resource(
    'company-decisions',
    new ResourceTemplate('orchstr://company/{id}/decisions', {
      list: async () => ({
        resources: getCompanyIds().map(id => ({
          uri: `orchstr://company/${id}/decisions`,
          name: `Company Decision Log (${id})`,
          mimeType: 'application/json'
        }))
      })
    }),
    async (uri, { id }) => {
      const companyId = Array.isArray(id) ? id[0] : id;
      const decisions = orchestrator.listDecisions(companyId);

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(decisions, null, 2),
          mimeType: 'application/json'
        }]
      };
    }
  );

  // 4. Evidence
  server.resource(
    'company-evidence',
    new ResourceTemplate('orchstr://company/{id}/evidence', {
      list: async () => ({
        resources: getCompanyIds().map(id => ({
          uri: `orchstr://company/${id}/evidence`,
          name: `Company Evidence Ledger (${id})`,
          mimeType: 'application/json'
        }))
      })
    }),
    async (uri, { id }) => {
      const companyId = Array.isArray(id) ? id[0] : id;
      const memory = sharedMemory.getMemory(companyId);

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(memory.evidence_ledger, null, 2),
          mimeType: 'application/json'
        }]
      };
    }
  );

  // 5. Artifacts list
  server.resource(
    'company-artifacts',
    new ResourceTemplate('orchstr://company/{id}/artifacts', {
      list: async () => ({
        resources: getCompanyIds().map(id => ({
          uri: `orchstr://company/${id}/artifacts`,
          name: `Company Artifacts List (${id})`,
          mimeType: 'application/json'
        }))
      })
    }),
    async (uri, { id }) => {
      const companyId = Array.isArray(id) ? id[0] : id;
      const artifacts = orchestrator.listArtifacts(companyId);

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(artifacts.map(a => ({
            id: a.id,
            task_id: a.task_id,
            title: a.title,
            type: a.type,
            version: a.version,
            created_at: a.created_at
          })), null, 2),
          mimeType: 'application/json'
        }]
      };
    }
  );

  // 6. Single Artifact
  server.resource(
    'company-artifact-detail',
    new ResourceTemplate('orchstr://company/{id}/artifacts/{artifact_id}', {
      list: async () => {
        const resources: Array<{ uri: string; name: string; mimeType: string }> = [];
        for (const companyId of getCompanyIds()) {
          const arts = orchestrator.listArtifacts(companyId);
          for (const art of arts) {
            resources.push({
              uri: `orchstr://company/${companyId}/artifacts/${art.id}`,
              name: `Artifact: ${art.title} (${art.id})`,
              mimeType: 'text/markdown'
            });
          }
        }
        return { resources };
      }
    }),
    async (uri, { id, artifact_id }) => {
      const companyId = Array.isArray(id) ? id[0] : id;
      const artId = Array.isArray(artifact_id) ? artifact_id[0] : artifact_id;
      const artifacts = orchestrator.listArtifacts(companyId);
      const art = artifacts.find(a => a.id === artId);
      if (!art) throw new Error(`Artifact ${artId} not found in workspace ${companyId}.`);

      return {
        contents: [{
          uri: uri.href,
          text: art.content,
          mimeType: 'text/markdown'
        }]
      };
    }
  );

  // 7. Plan
  server.resource(
    'company-plan',
    new ResourceTemplate('orchstr://company/{id}/plan', {
      list: async () => ({
        resources: getCompanyIds().map(id => ({
          uri: `orchstr://company/${id}/plan`,
          name: `Company Task Plan DAG (${id})`,
          mimeType: 'application/json'
        }))
      })
    }),
    async (uri, { id }) => {
      const companyId = Array.isArray(id) ? id[0] : id;
      const tasks = orchestrator.listTasks(companyId);
      const deps = orchestrator.listTaskDependencies(companyId);

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({
            total_tasks: tasks.length,
            tasks,
            dependencies: deps
          }, null, 2),
          mimeType: 'application/json'
        }]
      };
    }
  );

  // 8. Review
  server.resource(
    'company-review',
    new ResourceTemplate('orchstr://company/{id}/review', {
      list: async () => ({
        resources: getCompanyIds().map(id => ({
          uri: `orchstr://company/${id}/review`,
          name: `Operational Review (${id})`,
          mimeType: 'text/markdown'
        }))
      })
    }),
    async (uri, { id }) => {
      const companyId = Array.isArray(id) ? id[0] : id;
      const report = reviewService.generateReview(companyId);

      return {
        contents: [{
          uri: uri.href,
          text: report.markdown_report,
          mimeType: 'text/markdown'
        }]
      };
    }
  );
}
