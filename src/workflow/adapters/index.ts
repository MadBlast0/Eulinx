/**
 * P16-WF-ADAPTER — Production adapter factory & barrel
 *
 * Wires the workflow engine to real runtime services:
 *   - SchedulerAdapter  -> Scheduler
 *   - ExecutionEngineAdapter -> ExecutionEngine
 *   - PersistenceAdapter -> in-memory + localStorage store
 *   - NodeExecutorRegistry -> per-kind executors
 *
 * The test-mock path remains available: callers can still construct
 * WorkflowEngine/WorkflowManager directly with mock adapters.
 */

import type { WorkflowEngineConfig } from "../workflow-types"
import {
  WorkflowEngine,
  type SchedulerAdapter as SchedulerAdapterIface,
  type ExecutionEngineAdapter as ExecutionEngineAdapterIface,
  type PersistenceAdapter as PersistenceAdapterIface,
  type WorkflowEventEmitter,
} from "../workflow-engine"
import { SchedulerAdapter } from "./scheduler-adapter"
import { ExecutionEngineAdapter } from "./execution-engine-adapter"
import { PersistenceAdapter } from "./persistence-adapter"
import { NodeExecutorRegistry, type NodeExecutorRegistryDeps } from "../node-executors"

export { SchedulerAdapter } from "./scheduler-adapter"
export { ExecutionEngineAdapter } from "./execution-engine-adapter"
export { PersistenceAdapter } from "./persistence-adapter"

export interface RealWorkflowWiring {
  scheduler: SchedulerAdapterIface
  executor: ExecutionEngineAdapterIface
  persistence: PersistenceAdapterIface
  engine: WorkflowEngine
}

/**
 * Build a WorkflowEngine backed by real runtime services.
 */
export function createRealWorkflowEngine(
  scheduler: ConstructorParameters<typeof SchedulerAdapter>[0],
  executionEngine: ConstructorParameters<typeof ExecutionEngineAdapter>[0],
  emitter: WorkflowEventEmitter,
  options?: {
    config?: Partial<WorkflowEngineConfig>
    storageKey?: string
    executorDeps?: NodeExecutorRegistryDeps
  },
): RealWorkflowWiring {
  const schedulerAdapter = new SchedulerAdapter(scheduler)
  const executionAdapter = new ExecutionEngineAdapter(executionEngine)
  const persistence = new PersistenceAdapter({ storageKey: options?.storageKey })

  const registry = options?.executorDeps
    ? new NodeExecutorRegistry({
        scheduler: schedulerAdapter,
        executor: executionAdapter,
        persistence,
        builderBackend: options.executorDeps.builderBackend,
        verification: options.executorDeps.verification,
        resolveArtifactContent: options.executorDeps.resolveArtifactContent,
        artifactManager: options.executorDeps.artifactManager,
        mergeManager: options.executorDeps.mergeManager,
        mcp: options.executorDeps.mcp,
      })
    : undefined

  const engine = new WorkflowEngine(
    schedulerAdapter,
    executionAdapter,
    persistence,
    emitter,
    options?.config,
    registry,
  )

  return {
    scheduler: schedulerAdapter,
    executor: executionAdapter,
    persistence,
    engine,
  }
}
