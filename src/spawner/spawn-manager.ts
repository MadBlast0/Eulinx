/**
 * P06-SPAWN-MANAGER — Spawn Manager
 *
 * The central orchestrator for Worker spawning. Ties together:
 * - Spawn Queue (P06-SPAWN-QUEUE)
 * - Spawn Policies / Admission (P06-SPAWN-POLICIES)
 * - Worker Factory / Creation (P06-SPAWN-WFACTORY)
 * - Task Factory (P06-SPAWN-TFACTORY)
 * - Session Factory (P06-SPAWN-SFACTORY)
 * - Dependency Resolution (P06-SPAWN-DEPS)
 * - Validation (P06-SPAWN-VALIDATE)
 * - Initialization (P06-SPAWN-INIT)
 * - Boot Pipeline (P06-SPAWN-BOOT)
 * - Resource Reservation (P06-SPAWN-RESERVE)
 * - Cleanup (P06-SPAWN-CLEANUP)
 * - Destruction (P06-SPAWN-DESTROY)
 * - Restart (P06-SPAWN-RESTART)
 * - Recovery (P06-SPAWN-RECOVERY)
 */

import type { IsoTimestamp } from "@/core/types"
import type {
  WorkerSpawnRequest,
  WorkerRole,
  SpawnMode,
  SpawnPriority,
  WorkerSpawnReadiness,
  RuntimeActorRef,
} from "./spawner-types"
import type {
  WorkerLifecycleRecord,
  WorkerTransition,
} from "./worker-lifecycle"
import type { WorkerState, WorkerTrigger } from "./worker-state"
import type { ValidationContext } from "./spawner-validation"
import type { AdmissionState, AdmissionDecision } from "./spawner-admission"
import type {
  WorkerCreationResult,
  ResolvedWorkerProfile,
  RoleRegistry,
} from "./worker-creation"
import type {
  CleanupActionKind,
  CleanupSummary,
} from "./worker-cleanup"
import type {
  RecoveryInput,
  FullRecoveryResult,
} from "./worker-recovery"
import { validateSpawnRequest, buildSpawnReadiness } from "./spawner-validation"
import { evaluateAdmission } from "./spawner-admission"
import { canTransition, isActorAllowed } from "./worker-state"
import { createLifecycleRecord } from "./worker-lifecycle"
import { resolveRole, narrowBudget, computeSandboxRoot, assignIdentity } from "./worker-creation"
import { buildCleanupPlan } from "./worker-cleanup"
import { runRecoveryPass } from "./worker-recovery"

// ---------------------------------------------------------------------------
// Spawn Manager Configuration
// ---------------------------------------------------------------------------

export interface SpawnManagerConfig {
  readonly maxSpawnQueue: number
  readonly defaultSpawnMode: SpawnMode
  readonly defaultPriority: SpawnPriority
  readonly launchTimeoutMs: number
}

export const DEFAULT_SPAWN_MANAGER_CONFIG: SpawnManagerConfig = {
  maxSpawnQueue: 100,
  defaultSpawnMode: "normal",
  defaultPriority: "normal",
  launchTimeoutMs: 30_000,
}

// ---------------------------------------------------------------------------
// Spawn Manager Events
// ---------------------------------------------------------------------------

export type SpawnManagerEventKind =
  | "worker.spawn_requested"
  | "worker.spawn_validating"
  | "worker.spawn_rejected"
  | "worker.record_created"
  | "worker.context_prepared"
  | "worker.process_starting"
  | "worker.process_started"
  | "worker.started"
  | "worker.spawn_failed"
  | "worker.cancel_requested"
  | "worker.terminated"
  | "worker.recovered"

export interface SpawnManagerEvent {
  readonly kind: SpawnManagerEventKind
  readonly requestId: string
  readonly workspaceId: string
  readonly sessionId: string
  readonly workerId?: string
  readonly actor: RuntimeActorRef
  readonly reason?: string
  readonly metadata?: Record<string, unknown>
  readonly createdAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Spawn Queue Entry
// ---------------------------------------------------------------------------

export interface SpawnQueueEntry {
  readonly request: WorkerSpawnRequest
  readonly admissionDecision: AdmissionDecision
  readonly receivedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Spawn Manager
// ---------------------------------------------------------------------------

export class SpawnManager {
  private readonly config: SpawnManagerConfig
  private readonly roleRegistry: RoleRegistry
  private readonly spawnQueue: SpawnQueueEntry[] = []
  private readonly activeWorkers: Map<string, WorkerLifecycleRecord> = new Map()
  private readonly workerRoleMap: Map<string, string> = new Map() // workerId -> roleId
  private readonly events: SpawnManagerEvent[] = []
  private readonly transitions: WorkerTransition[] = []
  private readonly idempotencyMap: Map<string, string> = new Map() // requestId -> workerId
  private readonly eventHandlers: Array<(event: SpawnManagerEvent) => void> = []

  constructor(config: Partial<SpawnManagerConfig> = {}, roleRegistry?: RoleRegistry) {
    this.config = { ...DEFAULT_SPAWN_MANAGER_CONFIG, ...config }
    this.roleRegistry = roleRegistry ?? new Map()
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Submit a spawn request to the queue.
   * WorkerSpawner-Part01: validates request, enqueues, returns readiness.
   */
  async submitSpawnRequest(
    request: WorkerSpawnRequest,
    validationContext: ValidationContext,
    admissionState: AdmissionState,
  ): Promise<WorkerSpawnReadiness> {
    this.emitEvent({
      kind: "worker.spawn_requested",
      requestId: request.id,
      workspaceId: request.workspaceId,
      sessionId: request.sessionId,
      actor: request.requestedBy,
      createdAt: this.now(),
    })

    // Check idempotency
    const existingWorkerId = this.idempotencyMap.get(request.id)
    if (existingWorkerId) {
      const existing = this.activeWorkers.get(existingWorkerId)
      if (existing) {
        return {
          requestId: request.id,
          ready: existing.state !== "terminated",
          blockedBy: [],
          warnings: [{ kind: "idempotent", message: `Request already processed, worker: ${existingWorkerId}` }],
        }
      }
    }

    // Check queue capacity
    if (this.spawnQueue.length >= this.config.maxSpawnQueue) {
      return {
        requestId: request.id,
        ready: false,
        blockedBy: [{ kind: "runtime_not_ready", message: "Spawn queue is full", recoverable: true }],
        warnings: [],
      }
    }

    // Validate
    this.emitEvent({
      kind: "worker.spawn_validating",
      requestId: request.id,
      workspaceId: request.workspaceId,
      sessionId: request.sessionId,
      actor: request.requestedBy,
      createdAt: this.now(),
    })

    const validationResult = validateSpawnRequest(
      {
        id: request.id,
        workspaceId: request.workspaceId,
        projectId: request.projectId,
        sessionId: request.sessionId,
        cliProfileId: request.cliProfileId,
        promptPackageId: request.promptPackageId,
        contextPackageId: request.contextPackageId,
        permissionProfileId: request.permissionProfileId,
        sandboxProfileId: request.sandboxProfileId,
        spawnMode: request.spawnMode,
        priority: request.priority,
        parentRef: request.parentWorkerId
          ? { kind: "worker", depth: 0 }
          : request.parentOrchestratorId
            ? { kind: "orchestrator", depth: 0 }
            : undefined,
      },
      validationContext,
    )

    if (!validationResult.valid) {
      this.emitEvent({
        kind: "worker.spawn_rejected",
        requestId: request.id,
        workspaceId: request.workspaceId,
        sessionId: request.sessionId,
        actor: request.requestedBy,
        reason: validationResult.failures[0]?.message ?? "Validation failed",
        createdAt: this.now(),
      })
      return buildSpawnReadiness(request.id, validationResult)
    }

    // Admission control
    const admissionDecision = evaluateAdmission(admissionState, request.priority)

    if (admissionDecision.verdict === "reject") {
      this.emitEvent({
        kind: "worker.spawn_rejected",
        requestId: request.id,
        workspaceId: request.workspaceId,
        sessionId: request.sessionId,
        actor: request.requestedBy,
        reason: `Admission rejected: ${admissionDecision.reason}`,
        createdAt: this.now(),
      })
      return {
        requestId: request.id,
        ready: false,
        blockedBy: [{
          kind: "budget_exceeded",
          message: `Admission rejected: ${admissionDecision.reason}`,
          recoverable: false,
        }],
        warnings: [],
      }
    }

    // Enqueue
    this.spawnQueue.push({
      request,
      admissionDecision,
      receivedAt: this.now(),
    })

    return {
      requestId: request.id,
      ready: admissionDecision.verdict === "admit",
      blockedBy: admissionDecision.verdict === "defer"
        ? [{ kind: "runtime_not_ready", message: `Deferred: ${admissionDecision.reason}`, recoverable: true }]
        : [],
      warnings: [],
    }
  }

  /**
   * Process the next item in the spawn queue.
   * Returns the created worker handle or null if queue is empty / processing failed.
   */
  async processNext(
    spawnRequest: WorkerSpawnRequest,
    roleId: string,
    _objective: string,
  ): Promise<WorkerCreationResult> {
    const now = this.now()

    // Resolve role
    const parentRole = spawnRequest.parentWorkerId
      ? this.resolveParentRole(spawnRequest.parentWorkerId)
      : undefined
    const roleResult = resolveRole(roleId, this.roleRegistry, parentRole)
    if (!roleResult.ok) {
      return {
        ok: false,
        error: {
          kind: roleResult.kind,
          requestId: spawnRequest.id,
          failedAtStep: 0,
          rolledBackSteps: [],
          message: roleResult.message,
          retryable: false,
          at: now,
        },
      }
    }

    const role = roleResult.role

    // Assign identity
    const identity = assignIdentity({
      parentRef: spawnRequest.parentWorkerId
        ? { kind: "worker", id: spawnRequest.parentWorkerId, depth: 0 }
        : undefined,
      rolePrefix: role.displayPrefix,
      siblingCount: this.countChildren(spawnRequest.parentWorkerId),
      idGenerator: () => `wkr_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    })

    // Narrow budget
    const budget = narrowBudget(role.defaultBudget)

    // Create lifecycle record
    const record = createLifecycleRecord({
      workerId: identity.workerId,
      workspaceId: spawnRequest.workspaceId,
      sessionId: spawnRequest.sessionId,
    })

    // Store
    this.activeWorkers.set(identity.workerId, record)
    this.workerRoleMap.set(identity.workerId, roleId)
    this.idempotencyMap.set(spawnRequest.id, identity.workerId)

    // Emit record created
    this.emitEvent({
      kind: "worker.record_created",
      requestId: spawnRequest.id,
      workspaceId: spawnRequest.workspaceId,
      sessionId: spawnRequest.sessionId,
      workerId: identity.workerId,
      actor: spawnRequest.requestedBy,
      createdAt: now,
    })

    // Emit context prepared
    this.emitEvent({
      kind: "worker.context_prepared",
      requestId: spawnRequest.id,
      workspaceId: spawnRequest.workspaceId,
      sessionId: spawnRequest.sessionId,
      workerId: identity.workerId,
      actor: spawnRequest.requestedBy,
      createdAt: now,
    })

    // Emit process starting
    this.emitEvent({
      kind: "worker.process_starting",
      requestId: spawnRequest.id,
      workspaceId: spawnRequest.workspaceId,
      sessionId: spawnRequest.sessionId,
      workerId: identity.workerId,
      actor: spawnRequest.requestedBy,
      createdAt: now,
    })

    // Build resolved profile (WorkerCreation-Part04)
    const resolved: ResolvedWorkerProfile = {
      workerId: identity.workerId,
      roleId: role.roleId,
      roleVersion: role.version,
      resolvedModel: {
        providerId: "default",
        modelId: role.defaultModelId,
        credentialRef: `cred_${identity.workerId}`,
        contextWindowTokens: 200_000,
        maxOutputTokens: 8_192,
        fallbackChain: [...role.fallbackModelIds],
        parameters: { temperature: 0.7, topP: 0.9, maxTokens: 8_192, stopSequences: [] },
      },
      resolvedPermissions: {
        grants: [],
        profileId: role.defaultPermissionProfileId,
        profileVersion: 1,
        escalationPolicy: "ask_user",
      },
      resolvedContext: {
        contextPackageId: spawnRequest.contextPackageId,
        promptTemplateId: role.promptTemplateId,
        promptTemplateVersion: 1,
        estimatedTokens: 0,
        sources: [],
        redactionsApplied: 0,
      },
      resolvedSandbox: {
        sandboxId: `sbx_${identity.workerId}`,
        sandboxRoot: computeSandboxRoot("/workspace/runtime", identity.workerId),
        strategy: role.sandboxStrategy,
        projectMountMode: role.sandboxStrategy === "isolated_temp" ? "none" : "read_only",
        networkPolicy: { mode: "none", allowedHosts: [] },
        envAllowlist: ["PATH", "HOME", "USERPROFILE", "TMPDIR", "TEMP", "LANG", "EULINX_WORKER_ID", "EULINX_SANDBOX_ROOT", "EULINX_EVENT_SOCKET"],
        cleanupPolicy: "on_terminate",
        quotaBytes: 1_073_741_824, // 1GB
      },
      resolvedTerminal: {
        terminalId: `term_${identity.workerId}`,
        ptyRows: 40,
        ptyCols: 120,
        shellPath: "/bin/bash",
        cliProfileId: role.cliProfileId,
        command: role.cliProfileId,
        args: ["--print", "--model", role.defaultModelId],
        cwd: computeSandboxRoot("/workspace/runtime", identity.workerId),
        scrollbackLines: 10_000,
        interactive: true,
      },
      resolvedBudget: budget,
      resolvedTimeouts: role.timeoutProfile,
      resolvedAt: now,
      resolverVersion: 1,
    }

    // Emit started
    this.emitEvent({
      kind: "worker.started",
      requestId: spawnRequest.id,
      workspaceId: spawnRequest.workspaceId,
      sessionId: spawnRequest.sessionId,
      workerId: identity.workerId,
      actor: spawnRequest.requestedBy,
      createdAt: now,
    })

    return { ok: true, worker: identity, resolved }
  }

  /**
   * Cancel a spawn request.
   */
  cancelSpawnRequest(
    requestId: string,
    actor: RuntimeActorRef,
  ): boolean {
    const idx = this.spawnQueue.findIndex(e => e.request.id === requestId)
    if (idx === -1) return false

    const entry = this.spawnQueue[idx]
    if (!entry) return false
    this.spawnQueue.splice(idx, 1)

    this.emitEvent({
      kind: "worker.cancel_requested",
      requestId,
      workspaceId: entry.request.workspaceId,
      sessionId: entry.request.sessionId,
      actor,
      reason: "Cancelled by user or system",
      createdAt: this.now(),
    })

    return true
  }

  /**
   * Terminate a running Worker.
   */
  terminateWorker(
    workerId: string,
    actor: RuntimeActorRef,
    reason: string,
  ): boolean {
    const record = this.activeWorkers.get(workerId)
    if (!record) return false

    // Try "cancel" first (valid for requested, queued, blocked)
    const cancelDest = canTransition(record.state, "cancel")
    if (cancelDest && isActorAllowed(record.state, "cancel")) {
      this.recordTransition(record, "cancel", actor, reason, cancelDest)
      return true
    }

    // Fall back to "terminate" (valid for idle, working, waiting, blocked, paused)
    const termDest = canTransition(record.state, "terminate")
    if (termDest && isActorAllowed(record.state, "terminate")) {
      this.recordTransition(record, "terminate", actor, reason, termDest)
      return true
    }

    return false
  }

  /**
   * Clean up a Worker (release resources, terminate process).
   */
  async cleanupWorker(workerId: string): Promise<CleanupSummary> {
    const start = Date.now()
    const record = this.activeWorkers.get(workerId)
    if (!record) {
      return { workerId, actionsExecuted: [], actionsFailed: [], success: false, durationMs: 0 }
    }

    const plan = buildCleanupPlan(record.state)
    const executed: CleanupActionKind[] = []
    const failed: CleanupActionKind[] = []

    for (const action of plan) {
      try {
        switch (action.kind) {
          case "cascade_to_children":
            for (const [wid, childRec] of this.activeWorkers) {
              if (wid !== workerId && childRec.parentWorkerId === workerId) {
                this.terminateWorker(wid, { kind: "runtime_service", id: "spawn_manager" }, `Cascade cleanup from ${workerId}`)
              }
            }
            break
          case "mark_record":
            ;(record as { state: WorkerState }).state = "terminated"
            ;(record as { updatedAt: IsoTimestamp }).updatedAt = this.now()
            break
          default:
            break
        }
        executed.push(action.kind)
      } catch {
        failed.push(action.kind)
      }
    }

    return {
      workerId,
      actionsExecuted: executed,
      actionsFailed: failed,
      success: failed.length === 0,
      durationMs: Date.now() - start,
    }
  }

  /**
   * Recover Workers after an app restart.
   */
  recoverWorkers(records: readonly RecoveryInput[]): FullRecoveryResult {
    return runRecoveryPass(records)
  }

  /**
   * Get a snapshot of the spawn queue.
   */
  getQueueSnapshot(): readonly SpawnQueueEntry[] {
    return [...this.spawnQueue]
  }

  /**
   * Get an active Worker's lifecycle record.
   */
  getWorker(workerId: string): WorkerLifecycleRecord | undefined {
    return this.activeWorkers.get(workerId)
  }

  /**
   * Count active Workers.
   */
  getActiveWorkerCount(): number {
    return this.activeWorkers.size
  }

  /**
   * Count Workers matching a predicate on state.
   */
  countWorkersByState(predicate: (state: WorkerState) => boolean): number {
    let count = 0
    for (const record of this.activeWorkers.values()) {
      if (predicate(record.state)) count++
    }
    return count
  }

  /**
   * Count Workers in a specific workspace.
   */
  countWorkersInWorkspace(workspaceId: string): number {
    let count = 0
    for (const record of this.activeWorkers.values()) {
      if (record.workspaceId === workspaceId) count++
    }
    return count
  }

  /**
   * Subscribe to spawn manager events.
   */
  onEvent(handler: (event: SpawnManagerEvent) => void): () => void {
    this.eventHandlers.push(handler)
    return () => {
      const idx = this.eventHandlers.indexOf(handler)
      if (idx >= 0) this.eventHandlers.splice(idx, 1)
    }
  }

  /**
   * Get all emitted events.
   */
  getEvents(): readonly SpawnManagerEvent[] {
    return [...this.events]
  }

  /**
   * Get all recorded transitions.
   */
  getTransitions(): readonly WorkerTransition[] {
    return [...this.transitions]
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private resolveParentRole(parentWorkerId: string): WorkerRole | undefined {
    const roleId = this.workerRoleMap.get(parentWorkerId)
    if (!roleId) return undefined
    return this.roleRegistry.get(roleId)
  }

  private recordTransition(
    record: WorkerLifecycleRecord,
    trigger: WorkerTrigger,
    actor: RuntimeActorRef,
    reason: string,
    destination: WorkerState,
  ): void {
    const from = record.state
    const now = this.now()

    const transition: WorkerTransition = {
      workerId: record.workerId,
      seq: record.transitionSeq + 1,
      from,
      to: destination,
      trigger,
      actor,
      reason,
      at: now,
    }

    // Update record
    ;(record as { state: WorkerState }).state = destination
    ;(record as { previousState?: WorkerState }).previousState = from
    ;(record as { transitionSeq: number }).transitionSeq = transition.seq
    ;(record as { updatedAt: IsoTimestamp }).updatedAt = now

    this.transitions.push(transition)

    // Emit state_changed event
    this.emitEvent({
      kind: "worker.terminated",
      requestId: "",
      workspaceId: record.workspaceId,
      sessionId: record.sessionId,
      workerId: record.workerId,
      actor,
      reason,
      createdAt: now,
    })
  }

  private countChildren(parentWorkerId?: string): number {
    if (!parentWorkerId) return 0
    let count = 0
    for (const record of this.activeWorkers.values()) {
      if (record.state !== "terminated" && (record as unknown as { parentWorkerId?: string }).parentWorkerId === parentWorkerId) {
        count++
      }
    }
    return count
  }

  private emitEvent(event: SpawnManagerEvent): void {
    this.events.push(event)
    for (const handler of this.eventHandlers) {
      try {
        handler(event)
      } catch {
        console.warn('eulinx: spawn-manager : unexpected error in catch block')
        // Event handlers must not throw
      }
    }
  }

  private now(): IsoTimestamp {
    return new Date().toISOString() as IsoTimestamp
  }
}
