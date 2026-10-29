import { Task, TaskDependency, CompanyContext, AgentDefinition } from '../shared/schemas/index.js';
import { DependencyGraph } from './dependencies.js';

export interface TaskReadinessResult {
  taskId: string;
  isReady: boolean;
  isBlocked: boolean;
  blockingDependencies: Array<{ taskId: string; title: string; status: string }>;
  satisfiedDependencies: Array<{ taskId: string; title: string; status: string }>;
  missingInputs: string[];
  contradictoryEvidence: string[];
}

export class DependencyAwareTaskPlanner {
  public static validateGraph(tasks: Task[], dependencies: TaskDependency[]): { isValid: boolean; cycle?: string[] } {
    const taskMap = new Map<string, Task>();
    for (const t of tasks) taskMap.set(t.id, t);

    for (const dep of dependencies) {
      if (!taskMap.has(dep.task_id)) {
        throw new Error(`Invalid dependency: Task ${dep.task_id} does not exist in graph.`);
      }
      if (!taskMap.has(dep.depends_on_task_id)) {
        throw new Error(`Invalid dependency: Prerequisite Task ${dep.depends_on_task_id} does not exist in graph.`);
      }
    }

    const { hasCycle, cycle } = DependencyGraph.detectCycles(tasks, dependencies);
    return { isValid: !hasCycle, cycle };
  }

  public static evaluateTaskReadiness(
    task: Task,
    allTasks: Task[],
    dependencies: TaskDependency[],
    context: CompanyContext,
    agent: AgentDefinition
  ): TaskReadinessResult {
    const taskMap = new Map<string, Task>();
    for (const t of allTasks) taskMap.set(t.id, t);

    const taskPrereqDeps = dependencies.filter(d => d.task_id === task.id);
    const blockingDependencies: Array<{ taskId: string; title: string; status: string }> = [];
    const satisfiedDependencies: Array<{ taskId: string; title: string; status: string }> = [];

    for (const dep of taskPrereqDeps) {
      const prereq = taskMap.get(dep.depends_on_task_id);
      if (!prereq) {
        blockingDependencies.push({ taskId: dep.depends_on_task_id, title: 'Unknown Task', status: 'missing' });
        continue;
      }

      if (prereq.status === 'completed' || prereq.status === 'approved') {
        satisfiedDependencies.push({ taskId: prereq.id, title: prereq.title, status: prereq.status });
      } else {
        blockingDependencies.push({ taskId: prereq.id, title: prereq.title, status: prereq.status });
      }
    }

    // Check for missing inputs
    const missingInputs: string[] = [];
    const providedInputs = { ...task.inputs };

    const contextFields: Record<string, any> = {
      company_brief: context.brief,
      brief: context.brief,
      target_customer: context.target_customer,
      value_prop: context.value_prop,
      market_constraints: context.constraints,
      active_assumptions: context.assumptions
    };

    const upstreamOutputs: Record<string, any> = {};
    for (const dep of satisfiedDependencies) {
      const prereq = taskMap.get(dep.taskId);
      if (prereq?.outputs) {
        Object.assign(upstreamOutputs, prereq.outputs);
      }
    }

    for (const requiredKey of agent.required_inputs) {
      const hasInInputs = providedInputs[requiredKey] !== undefined;
      const hasInContext = contextFields[requiredKey] !== undefined && contextFields[requiredKey] !== '';
      const hasInUpstream = upstreamOutputs[requiredKey] !== undefined;

      if (!hasInInputs && !hasInContext && !hasInUpstream) {
        const isDeliverableSatisfied = satisfiedDependencies.some(d => {
          const prereq = taskMap.get(d.taskId);
          return prereq && (
            (requiredKey.includes('research') && prereq.assigned_agent_id === 'agent_customer_research') ||
            (requiredKey.includes('positioning') && prereq.assigned_agent_id === 'agent_brand_positioning') ||
            (requiredKey.includes('identity') && prereq.assigned_agent_id === 'agent_brand_identity') ||
            (requiredKey.includes('icp') && prereq.assigned_agent_id === 'agent_prospect_discovery')
          );
        });

        if (!isDeliverableSatisfied) {
          missingInputs.push(requiredKey);
        }
      }
    }

    // Surface contradictory evidence
    const contradictoryEvidence: string[] = [];
    if (context.assumptions) {
      const invalidated = context.assumptions.filter(a => a.status === 'invalidated');
      for (const inv of invalidated) {
        contradictoryEvidence.push(`Invalidated assumption: "${inv.statement}" (${inv.category})`);
      }
    }

    for (const dep of satisfiedDependencies) {
      const prereq = taskMap.get(dep.taskId);
      if (prereq?.outputs && Array.isArray(prereq.outputs.contradictory_evidence)) {
        for (const ce of prereq.outputs.contradictory_evidence) {
          contradictoryEvidence.push(`Contradiction from [${prereq.title}]: ${ce}`);
        }
      }
    }

    const isBlocked = blockingDependencies.length > 0;
    const isReady = !isBlocked;

    return {
      taskId: task.id,
      isReady,
      isBlocked,
      blockingDependencies,
      satisfiedDependencies,
      missingInputs,
      contradictoryEvidence
    };
  }

  public static getExecutionOrder(tasks: Task[], dependencies: TaskDependency[]): Task[] {
    return DependencyGraph.topologicalSort(tasks, dependencies);
  }

  public static calculateParallelizableTasks(tasks: Task[], dependencies: TaskDependency[]): Task[] {
    const blockedIds = new Set<string>();
    for (const dep of dependencies) {
      blockedIds.add(dep.task_id);
    }
    return tasks.filter(t => t.parallelizable && !blockedIds.has(t.id));
  }
}
