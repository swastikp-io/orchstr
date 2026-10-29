import { Task, TaskDependency } from '../shared/schemas/index.js';

export interface DependencyValidationResult {
  isValid: boolean;
  cycle?: string[];
  missingPrerequisites?: string[];
}

export class DependencyGraph {
  /**
   * Detects cycles in the task dependency DAG using 3-color DFS.
   */
  public static detectCycles(tasks: Task[], dependencies: TaskDependency[]): { hasCycle: boolean; cycle?: string[] } {
    const taskMap = new Map<string, Task>();
    for (const t of tasks) taskMap.set(t.id, t);

    const adj = new Map<string, string[]>();
    for (const t of tasks) adj.set(t.id, []);
    for (const dep of dependencies) {
      if (adj.has(dep.task_id)) {
        adj.get(dep.task_id)!.push(dep.depends_on_task_id);
      }
    }

    const visited = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
    const recursionStack: string[] = [];

    const dfs = (nodeId: string): boolean => {
      visited.set(nodeId, 1);
      recursionStack.push(nodeId);

      const neighbors = adj.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (visited.get(neighbor) === 1) {
          recursionStack.push(neighbor);
          return true;
        }
        if (!visited.has(neighbor) || visited.get(neighbor) === 0) {
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
          return { hasCycle: true, cycle: [...recursionStack] };
        }
      }
    }

    return { hasCycle: false };
  }

  /**
   * Topologically orders tasks for safe sequential or parallel execution.
   */
  public static topologicalSort(tasks: Task[], dependencies: TaskDependency[]): Task[] {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    const taskMap = new Map<string, Task>();

    for (const t of tasks) {
      taskMap.set(t.id, t);
      inDegree.set(t.id, 0);
      adj.set(t.id, []);
    }

    for (const dep of dependencies) {
      // dep.task_id depends on dep.depends_on_task_id
      adj.get(dep.depends_on_task_id)?.push(dep.task_id);
      inDegree.set(dep.task_id, (inDegree.get(dep.task_id) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const result: Task[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const task = taskMap.get(curr);
      if (task) result.push(task);

      for (const neighbor of adj.get(curr) || []) {
        const nextDeg = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, nextDeg);
        if (nextDeg === 0) queue.push(neighbor);
      }
    }

    return result;
  }
}
