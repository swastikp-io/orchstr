import { describe, it, expect } from 'vitest';
import { DependencyAwareTaskPlanner } from '../../server/domain/planner.js';
import { Task, TaskDependency, CompanyContext, AgentDefinition } from '../../server/domain/types.js';

describe('DependencyAwareTaskPlanner', () => {
  const dummyContext: CompanyContext = {
    id: 'ctx_test',
    company_id: 'comp_test',
    brief: 'Test company developing AI agents.',
    target_customer: 'Engineering leaders',
    value_prop: 'Automate team workflows',
    assumptions: [
      { id: 'asm_1', statement: 'Users prefer fast responses', confidence: 'high', status: 'validated', category: 'product' },
      { id: 'asm_2', statement: 'Users want black-box execution', confidence: 'low', status: 'invalidated', category: 'customer' }
    ],
    constraints: ['Must run locally'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const dummyAgent: AgentDefinition = {
    id: 'agent_test',
    name: 'Test Agent',
    role: 'Test Specialist',
    department: 'Engineering',
    purpose: 'Test purpose',
    instructions: 'Test instructions',
    required_inputs: ['brief', 'target_customer'],
    output_schema: '{}',
    acceptance_criteria: ['Criterion 1'],
    permitted_actions: ['test_action'],
    is_manager: false,
    created_at: new Date().toISOString()
  };

  it('validates a valid DAG without cycles', () => {
    const tasks: Task[] = [
      { id: 't1', company_id: 'c1', title: 'Task 1', description: '', assigned_agent_id: 'agent_test', department: 'Eng', status: 'completed', priority: 'medium', inputs: {}, acceptance_criteria: [], parallelizable: true, retry_count: 0, max_retries: 3, created_at: '', updated_at: '' },
      { id: 't2', company_id: 'c1', title: 'Task 2', description: '', assigned_agent_id: 'agent_test', department: 'Eng', status: 'queued', priority: 'medium', inputs: {}, acceptance_criteria: [], parallelizable: false, retry_count: 0, max_retries: 3, created_at: '', updated_at: '' }
    ];
    const deps: TaskDependency[] = [
      { id: 'd1', company_id: 'c1', task_id: 't2', depends_on_task_id: 't1', created_at: '' }
    ];

    const result = DependencyAwareTaskPlanner.validateGraph(tasks, deps);
    expect(result.isValid).toBe(true);
  });

  it('detects cycles in task dependencies and flags error', () => {
    const tasks: Task[] = [
      { id: 't1', company_id: 'c1', title: 'Task 1', description: '', assigned_agent_id: 'agent_test', department: 'Eng', status: 'queued', priority: 'medium', inputs: {}, acceptance_criteria: [], parallelizable: false, retry_count: 0, max_retries: 3, created_at: '', updated_at: '' },
      { id: 't2', company_id: 'c1', title: 'Task 2', description: '', assigned_agent_id: 'agent_test', department: 'Eng', status: 'queued', priority: 'medium', inputs: {}, acceptance_criteria: [], parallelizable: false, retry_count: 0, max_retries: 3, created_at: '', updated_at: '' }
    ];
    // t2 depends on t1, t1 depends on t2 -> Cycle!
    const deps: TaskDependency[] = [
      { id: 'd1', company_id: 'c1', task_id: 't2', depends_on_task_id: 't1', created_at: '' },
      { id: 'd2', company_id: 'c1', task_id: 't1', depends_on_task_id: 't2', created_at: '' }
    ];

    const result = DependencyAwareTaskPlanner.validateGraph(tasks, deps);
    expect(result.isValid).toBe(false);
    expect(result.cycle).toBeDefined();
  });

  it('correctly blocks a task if its prerequisite is not yet completed or approved', () => {
    const tasks: Task[] = [
      { id: 't1', company_id: 'c1', title: 'Prereq Task', description: '', assigned_agent_id: 'agent_test', department: 'Eng', status: 'running', priority: 'medium', inputs: {}, acceptance_criteria: [], parallelizable: false, retry_count: 0, max_retries: 3, created_at: '', updated_at: '' },
      { id: 't2', company_id: 'c1', title: 'Dependent Task', description: '', assigned_agent_id: 'agent_test', department: 'Eng', status: 'queued', priority: 'medium', inputs: {}, acceptance_criteria: [], parallelizable: false, retry_count: 0, max_retries: 3, created_at: '', updated_at: '' }
    ];
    const deps: TaskDependency[] = [
      { id: 'd1', company_id: 'c1', task_id: 't2', depends_on_task_id: 't1', created_at: '' }
    ];

    const readiness = DependencyAwareTaskPlanner.evaluateTaskReadiness(tasks[1], tasks, deps, dummyContext, dummyAgent);
    expect(readiness.isBlocked).toBe(true);
    expect(readiness.isReady).toBe(false);
    expect(readiness.blockingDependencies.length).toBe(1);
    expect(readiness.blockingDependencies[0].taskId).toBe('t1');
  });

  it('unblocks a task once all prerequisites are completed or approved', () => {
    const tasks: Task[] = [
      { id: 't1', company_id: 'c1', title: 'Prereq Task', description: '', assigned_agent_id: 'agent_test', department: 'Eng', status: 'completed', priority: 'medium', inputs: {}, outputs: { brief: 'Done' }, acceptance_criteria: [], parallelizable: false, retry_count: 0, max_retries: 3, created_at: '', updated_at: '' },
      { id: 't2', company_id: 'c1', title: 'Dependent Task', description: '', assigned_agent_id: 'agent_test', department: 'Eng', status: 'queued', priority: 'medium', inputs: {}, acceptance_criteria: [], parallelizable: false, retry_count: 0, max_retries: 3, created_at: '', updated_at: '' }
    ];
    const deps: TaskDependency[] = [
      { id: 'd1', company_id: 'c1', task_id: 't2', depends_on_task_id: 't1', created_at: '' }
    ];

    const readiness = DependencyAwareTaskPlanner.evaluateTaskReadiness(tasks[1], tasks, deps, dummyContext, dummyAgent);
    expect(readiness.isBlocked).toBe(false);
    expect(readiness.isReady).toBe(true);
    expect(readiness.satisfiedDependencies.length).toBe(1);
  });

  it('surfaces contradictory evidence from assumptions without silently resolving', () => {
    const tasks: Task[] = [
      { id: 't1', company_id: 'c1', title: 'Root Task', description: '', assigned_agent_id: 'agent_test', department: 'Eng', status: 'completed', priority: 'medium', inputs: {}, outputs: {}, acceptance_criteria: [], parallelizable: true, retry_count: 0, max_retries: 3, created_at: '', updated_at: '' }
    ];

    const readiness = DependencyAwareTaskPlanner.evaluateTaskReadiness(tasks[0], tasks, [], dummyContext, dummyAgent);
    expect(readiness.contradictoryEvidence.length).toBeGreaterThan(0);
    expect(readiness.contradictoryEvidence[0]).toContain('Invalidated strategic assumption');
  });

  it('computes correct topological execution ordering', () => {
    const tasks: Task[] = [
      { id: 't3', company_id: 'c1', title: 'Task 3', description: '', assigned_agent_id: 'agent_test', department: 'Eng', status: 'queued', priority: 'medium', inputs: {}, acceptance_criteria: [], parallelizable: false, retry_count: 0, max_retries: 3, created_at: '', updated_at: '' },
      { id: 't1', company_id: 'c1', title: 'Task 1', description: '', assigned_agent_id: 'agent_test', department: 'Eng', status: 'queued', priority: 'medium', inputs: {}, acceptance_criteria: [], parallelizable: false, retry_count: 0, max_retries: 3, created_at: '', updated_at: '' },
      { id: 't2', company_id: 'c1', title: 'Task 2', description: '', assigned_agent_id: 'agent_test', department: 'Eng', status: 'queued', priority: 'medium', inputs: {}, acceptance_criteria: [], parallelizable: false, retry_count: 0, max_retries: 3, created_at: '', updated_at: '' }
    ];
    // t1 -> t2 -> t3
    const deps: TaskDependency[] = [
      { id: 'd1', company_id: 'c1', task_id: 't2', depends_on_task_id: 't1', created_at: '' },
      { id: 'd2', company_id: 'c1', task_id: 't3', depends_on_task_id: 't2', created_at: '' }
    ];

    const order = DependencyAwareTaskPlanner.getExecutionOrder(tasks, deps);
    const orderIds = order.map(t => t.id);
    expect(orderIds).toEqual(['t1', 't2', 't3']);
  });
});
