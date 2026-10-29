import { Task, TaskDependency, CompanyContext, AgentDefinition } from './types.js';

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
  /**
   * Validates the task dependency graph and detects cycles.
   * Throws an error if a cycle or invalid reference is detected.
   */
  static validateGraph(tasks: Task[], dependencies: TaskDependency[]): { isValid: boolean; cycle?: string[] } {
    const taskMap = new Map<string, Task>();
    for (const t of tasks) {
      taskMap.set(t.id, t);
    }

    // Check that all dependency task references exist
    for (const dep of dependencies) {
      if (!taskMap.has(dep.task_id)) {
        throw new Error(`Invalid dependency: Task ${dep.task_id} does not exist in graph.`);
      }
      if (!taskMap.has(dep.depends_on_task_id)) {
        throw new Error(`Invalid dependency: Prerequisite Task ${dep.depends_on_task_id} does not exist in graph.`);
      }
    }

    // Build adjacency list: node -> array of nodes it depends on
    const adjList = new Map<string, string[]>();
    for (const t of tasks) {
      adjList.set(t.id, []);
    }
    for (const dep of dependencies) {
      adjList.get(dep.task_id)?.push(dep.depends_on_task_id);
    }

    // Cycle detection using 3-color DFS (0: unvisited, 1: visiting, 2: visited)
    const visited = new Map<string, number>();
    const recursionStack: string[] = [];

    const dfs = (nodeId: string): boolean => {
      visited.set(nodeId, 1);
      recursionStack.push(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (visited.get(neighbor) === 1) {
          // Found cycle
          recursionStack.push(neighbor);
          return true;
        }
        if (visited.get(neighbor) === 0 || !visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        }
      }

      visited.set(nodeId, 2);
      recursionStack.pop();
      return false;
    };

    for (const t of tasks) {
      if (!visited.has(t.id) || visited.get(t.id) === 0) {
        if (dfs(t.id)) {
          return { isValid: false, cycle: [...recursionStack] };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Evaluates readiness of a specific task against prerequisites, company context, and agent requirements.
   * Contradictory evidence and missing inputs are explicitly surfaced.
   */
  static evaluateTaskReadiness(
    task: Task,
    allTasks: Task[],
    dependencies: TaskDependency[],
    context: CompanyContext,
    agent: AgentDefinition
  ): TaskReadinessResult {
    const taskMap = new Map<string, Task>();
    for (const t of allTasks) {
      taskMap.set(t.id, t);
    }

    const taskPrereqDeps = dependencies.filter(d => d.task_id === task.id);
    const blockingDependencies: Array<{ taskId: string; title: string; status: string }> = [];
    const satisfiedDependencies: Array<{ taskId: string; title: string; status: string }> = [];

    for (const dep of taskPrereqDeps) {
      const prereq = taskMap.get(dep.depends_on_task_id);
      if (!prereq) {
        blockingDependencies.push({
          taskId: dep.depends_on_task_id,
          title: 'Unknown Task',
          status: 'missing'
        });
        continue;
      }

      // A prerequisite is considered satisfied only if approved or completed
      if (prereq.status === 'completed' || prereq.status === 'approved') {
        satisfiedDependencies.push({
          taskId: prereq.id,
          title: prereq.title,
          status: prereq.status
        });
      } else {
        blockingDependencies.push({
          taskId: prereq.id,
          title: prereq.title,
          status: prereq.status
        });
      }
    }

    // Check for missing inputs required by the agent
    const missingInputs: string[] = [];
    const providedInputs = { ...task.inputs };

    // Context availability
    const contextFields: Record<string, any> = {
      company_brief: context.brief,
      brief: context.brief,
      target_customer: context.target_customer,
      value_prop: context.value_prop,
      market_constraints: context.constraints,
      active_assumptions: context.assumptions
    };

    // Gather output keys provided by satisfied prerequisites
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
        // Special mapping for common cross-agent deliverables
        const isUpstreamDeliverableAvailable = satisfiedDependencies.some(d => {
          const prereq = taskMap.get(d.taskId);
          return prereq && (
            (requiredKey.includes('research') && prereq.assigned_agent_id === 'agent_customer_research') ||
            (requiredKey.includes('positioning') && prereq.assigned_agent_id === 'agent_brand_positioning') ||
            (requiredKey.includes('identity') && prereq.assigned_agent_id === 'agent_brand_identity') ||
            (requiredKey.includes('icp') && prereq.assigned_agent_id === 'agent_prospect_discovery')
          );
        });

        if (!isUpstreamDeliverableAvailable) {
          missingInputs.push(requiredKey);
        }
      }
    }

    // Surface contradictory evidence if recorded in assumptions or customer research
    const contradictoryEvidence: string[] = [];
    if (context.assumptions) {
      const invalidated = context.assumptions.filter(a => a.status === 'invalidated');
      for (const inv of invalidated) {
        contradictoryEvidence.push(`Invalidated strategic assumption: "${inv.statement}" (${inv.category})`);
      }
    }

    // Check upstream research outputs for flagged contradictions
    for (const dep of satisfiedDependencies) {
      const prereq = taskMap.get(dep.taskId);
      if (prereq?.outputs && Array.isArray(prereq.outputs.contradictory_evidence)) {
        for (const ce of prereq.outputs.contradictory_evidence) {
          contradictoryEvidence.push(`Upstream research contradiction from [${prereq.title}]: ${ce}`);
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

  /**
   * Topologically orders tasks for safe execution planning.
   */
  static getExecutionOrder(tasks: Task[], dependencies: TaskDependency[]): Task[] {
    const taskMap = new Map<string, Task>();
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const t of tasks) {
      taskMap.set(t.id, t);
      inDegree.set(t.id, 0);
      adj.set(t.id, []);
    }

    for (const dep of dependencies) {
      // dep.task_id depends on dep.depends_on_task_id
      // so edge is: depends_on_task_id -> task_id
      adj.get(dep.depends_on_task_id)?.push(dep.task_id);
      inDegree.set(dep.task_id, (inDegree.get(dep.task_id) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    const result: Task[] = [];
    while (queue.length > 0) {
      const currId = queue.shift()!;
      const task = taskMap.get(currId);
      if (task) result.push(task);

      const neighbors = adj.get(currId) || [];
      for (const neighbor of neighbors) {
        const newDeg = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }
}
