/**
 * P04-STATE-PERSIST — Persistence Layer (store/load)
 *
 * The persistence layer provides typed store/load operations for all
 * entity states. From RunStatePersistence-Part01: the durable bridge
 * between in-memory state and SQLite.
 *
 * From RunStatePersistence-Part02: the persist algorithm and tick coupling.
 * From RunStatePersistence-Part04: concurrency and checkpointing.
 *
 * The store is the single path for all state reads and writes.
 * No service may bypass this layer to write directly to SQLite.
 */

import type { WorkspaceId } from "@/core/types"
import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import { CoreError } from "@/core/error"
import type { Logger } from "@/core/logger"
import { createLogger } from "@/core/logger"
import type {
  PersistedEntity,
  StateStore,
} from "./state-types"
import type { PersistedRuntimeState } from "./runtime-state"
import type { PersistedWorkerState } from "./worker-state"
import type { PersistedSessionState } from "./session-state"
import type { PersistedWorkflowRun, PersistedNodeStep, PersistedRunContext } from "./workflow-state"
import type { PersistedArtifactState } from "./artifact-state"
import type { PersistedTaskState } from "./task-state"

// ---------------------------------------------------------------------------
// Entity kind discriminators
// ---------------------------------------------------------------------------

export type EntityKind =
  | "runtime_state"
  | "worker_state"
  | "session_state"
  | "workflow_run"
  | "node_step"
  | "run_context"
  | "artifact_state"
  | "task_state"

// ---------------------------------------------------------------------------
// Persistence error codes
// ---------------------------------------------------------------------------

export type PersistenceErrorCode =
  | "entity_not_found"
  | "version_conflict"
  | "transaction_failed"
  | "checksum_mismatch"
  | "store_unavailable"

// ---------------------------------------------------------------------------
// Persistence service
// ---------------------------------------------------------------------------

/**
 * The persistence service wraps a StateStore with typed operations
 * and transactional guarantees.
 *
 * From RunStatePersistence-Part01: persist_run_state writes run + steps +
 * context in one transaction. From RunStatePersistence-Part02: commit
 * before ticking onward.
 */
export class PersistenceService {
  private readonly logger: Logger

  constructor(private readonly store: StateStore) {
    this.logger = createLogger("PersistenceService")
  }

  // -----------------------------------------------------------------------
  // Runtime state
  // -----------------------------------------------------------------------

  async loadRuntimeState(id: string): Promise<Result<PersistedRuntimeState, CoreError>> {
    const entity = await this.store.load<PersistedRuntimeState>(id)
    if (!entity) {
      return err(new CoreError("session_not_found", `Runtime state not found: ${id}`))
    }
    return ok(entity)
  }

  async saveRuntimeState(state: PersistedRuntimeState): Promise<Result<void, CoreError>> {
    const errors = this.validateEntity(state)
    if (errors.length > 0) {
      return err(new CoreError("validation_error", `Invalid runtime state: ${errors.join(", ")}`))
    }
    await this.store.save(state)
    this.logger.debug(`Saved runtime state: ${state.id} (seq=${state.seq})`)
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Worker state
  // -----------------------------------------------------------------------

  async loadWorkerState(id: string): Promise<Result<PersistedWorkerState, CoreError>> {
    const entity = await this.store.load<PersistedWorkerState>(id)
    if (!entity) {
      return err(new CoreError("worker_not_found", `Worker state not found: ${id}`))
    }
    return ok(entity)
  }

  async saveWorkerState(state: PersistedWorkerState): Promise<Result<void, CoreError>> {
    const errors = this.validateEntity(state)
    if (errors.length > 0) {
      return err(new CoreError("validation_error", `Invalid worker state: ${errors.join(", ")}`))
    }
    await this.store.save(state)
    this.logger.debug(`Saved worker state: ${state.id} (seq=${state.seq})`)
    return ok(undefined)
  }

  async loadWorkerStatesByWorkspace(
    workspaceId: WorkspaceId,
  ): Promise<Result<readonly PersistedWorkerState[], CoreError>> {
    const entities = await this.store.queryByWorkspace<PersistedWorkerState>(
      workspaceId,
      "worker_state",
    )
    return ok(entities)
  }

  // -----------------------------------------------------------------------
  // Session state
  // -----------------------------------------------------------------------

  async loadSessionState(id: string): Promise<Result<PersistedSessionState, CoreError>> {
    const entity = await this.store.load<PersistedSessionState>(id)
    if (!entity) {
      return err(new CoreError("session_not_found", `Session state not found: ${id}`))
    }
    return ok(entity)
  }

  async saveSessionState(state: PersistedSessionState): Promise<Result<void, CoreError>> {
    const errors = this.validateEntity(state)
    if (errors.length > 0) {
      return err(new CoreError("validation_error", `Invalid session state: ${errors.join(", ")}`))
    }
    await this.store.save(state)
    this.logger.debug(`Saved session state: ${state.id} (seq=${state.seq})`)
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Workflow run
  // -----------------------------------------------------------------------

  async loadWorkflowRun(runId: string): Promise<Result<PersistedWorkflowRun, CoreError>> {
    const entity = await this.store.load<PersistedWorkflowRun>(runId)
    if (!entity) {
      return err(new CoreError("task_not_found", `Workflow run not found: ${runId}`))
    }
    return ok(entity)
  }

  async saveWorkflowRun(run: PersistedWorkflowRun): Promise<Result<void, CoreError>> {
    const errors = this.validateEntity(run)
    if (errors.length > 0) {
      return err(new CoreError("validation_error", `Invalid workflow run: ${errors.join(", ")}`))
    }
    await this.store.save(run)
    this.logger.debug(`Saved workflow run: ${run.runId} (seq=${run.seq})`)
    return ok(undefined)
  }

  /**
   * Persist run state: run + steps + context in one transaction.
   * From RunStatePersistence-Part01: "persist_run_state commits before the engine ticks onward."
   * From RunStatePersistence-Part02: tick coupling guarantee.
   */
  async persistRunState(
    run: PersistedWorkflowRun,
    steps: readonly PersistedNodeStep[],
    context: PersistedRunContext,
  ): Promise<Result<void, CoreError>> {
    const entities: PersistedEntity[] = [run, ...steps, context]
    const allErrors: string[] = []
    for (const entity of entities) {
      const errors = this.validateEntity(entity)
      allErrors.push(...errors)
    }
    if (allErrors.length > 0) {
      return err(new CoreError("validation_error", `Invalid run state: ${allErrors.join(", ")}`))
    }
    await this.store.saveAll(entities)
    this.logger.debug(
      `Persisted run state: run=${run.runId} steps=${steps.length} seq=${run.seq}`,
    )
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Node steps
  // -----------------------------------------------------------------------

  async loadNodeStep(runId: string, nodeId: string): Promise<Result<PersistedNodeStep, CoreError>> {
    const entity = await this.store.load<PersistedNodeStep>(`${runId}:${nodeId}`)
    if (!entity) {
      return err(new CoreError("task_not_found", `Node step not found: ${runId}:${nodeId}`))
    }
    return ok(entity)
  }

  async saveNodeStep(step: PersistedNodeStep): Promise<Result<void, CoreError>> {
    await this.store.save(step)
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Run context
  // -----------------------------------------------------------------------

  async loadRunContext(runId: string): Promise<Result<PersistedRunContext, CoreError>> {
    const entity = await this.store.load<PersistedRunContext>(`ctx:${runId}`)
    if (!entity) {
      return err(new CoreError("task_not_found", `Run context not found: ${runId}`))
    }
    return ok(entity)
  }

  async saveRunContext(context: PersistedRunContext): Promise<Result<void, CoreError>> {
    await this.store.save(context)
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Workflow runs by workspace
  // -----------------------------------------------------------------------

  async loadWorkflowRunsByWorkspace(
    workspaceId: WorkspaceId,
  ): Promise<Result<readonly PersistedWorkflowRun[], CoreError>> {
    const entities = await this.store.queryByWorkspace<PersistedWorkflowRun>(
      workspaceId,
      "workflow_run",
    )
    return ok(entities)
  }

  // -----------------------------------------------------------------------
  // Artifact state
  // -----------------------------------------------------------------------

  async loadArtifactState(id: string): Promise<Result<PersistedArtifactState, CoreError>> {
    const entity = await this.store.load<PersistedArtifactState>(id)
    if (!entity) {
      return err(new CoreError("artifact_not_found", `Artifact state not found: ${id}`))
    }
    return ok(entity)
  }

  async saveArtifactState(state: PersistedArtifactState): Promise<Result<void, CoreError>> {
    const errors = this.validateEntity(state)
    if (errors.length > 0) {
      return err(new CoreError("validation_error", `Invalid artifact state: ${errors.join(", ")}`))
    }
    await this.store.save(state)
    this.logger.debug(`Saved artifact state: ${state.id} (seq=${state.seq})`)
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Task state
  // -----------------------------------------------------------------------

  async loadTaskState(id: string): Promise<Result<PersistedTaskState, CoreError>> {
    const entity = await this.store.load<PersistedTaskState>(id)
    if (!entity) {
      return err(new CoreError("task_not_found", `Task state not found: ${id}`))
    }
    return ok(entity)
  }

  async saveTaskState(state: PersistedTaskState): Promise<Result<void, CoreError>> {
    const errors = this.validateEntity(state)
    if (errors.length > 0) {
      return err(new CoreError("validation_error", `Invalid task state: ${errors.join(", ")}`))
    }
    await this.store.save(state)
    this.logger.debug(`Saved task state: ${state.id} (seq=${state.seq})`)
    return ok(undefined)
  }

  async loadTaskStatesByWorkspace(
    workspaceId: WorkspaceId,
  ): Promise<Result<readonly PersistedTaskState[], CoreError>> {
    const entities = await this.store.queryByWorkspace<PersistedTaskState>(
      workspaceId,
      "task_state",
    )
    return ok(entities)
  }

  // -----------------------------------------------------------------------
  // Batch operations
  // -----------------------------------------------------------------------

  /**
   * Save multiple entities in a single transaction.
   * From RunStatePersistence-Part01: write run + steps + context in one transaction.
   */
  async saveBatch(entities: readonly PersistedEntity[]): Promise<Result<void, CoreError>> {
    const allErrors: string[] = []
    for (const entity of entities) {
      const errors = this.validateEntity(entity)
      allErrors.push(...errors)
    }
    if (allErrors.length > 0) {
      return err(new CoreError("validation_error", `Invalid batch: ${allErrors.join(", ")}`))
    }
    await this.store.saveAll([...entities])
    this.logger.debug(`Saved batch of ${entities.length} entities`)
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  private validateEntity(entity: PersistedEntity): readonly string[] {
    if (!entity.id) return ["Entity id is required"]
    if (!entity.workspaceId) return ["Workspace id is required"]
    if (!entity.metadata) return ["Metadata is required"]
    return []
  }
}

// ---------------------------------------------------------------------------
// In-memory store (for testing)
// ---------------------------------------------------------------------------

/**
 * A simple in-memory store implementation for testing.
 * Not for production use — production uses Rust SQLx via Tauri IPC.
 */
export class InMemoryStateStore implements StateStore {
  private readonly entities = new Map<string, PersistedEntity>()

  async load<T extends PersistedEntity>(id: string): Promise<T | null> {
    return (this.entities.get(id) as T | undefined) ?? null
  }

  async save<T extends PersistedEntity>(entity: T): Promise<void> {
    this.entities.set(entity.id, entity)
  }

  async saveAll<T extends PersistedEntity>(entities: T[]): Promise<void> {
    for (const entity of entities) {
      this.entities.set(entity.id, entity)
    }
  }

  async delete(id: string): Promise<void> {
    this.entities.delete(id)
  }

  async queryByWorkspace<T extends PersistedEntity>(
    workspaceId: WorkspaceId,
    _kind: string,
  ): Promise<T[]> {
    const results: T[] = []
    for (const entity of this.entities.values()) {
      if (entity.workspaceId === workspaceId) {
        results.push(entity as T)
      }
    }
    return results
  }

  /** Clear all entities (for testing). */
  clear(): void {
    this.entities.clear()
  }

  /** Get entity count (for testing). */
  get size(): number {
    return this.entities.size
  }
}
