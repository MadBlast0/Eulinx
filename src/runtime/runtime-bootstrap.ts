/**
 * P02-RUNTIME-BOOTSTRAP — Runtime Bootstrap
 *
 * Wires service definitions into the registry in the correct dependency order.
 * From RuntimeManager-Part02: service graph and startup phases.
 */

import type { RuntimeServiceDefinition, ServiceRegistry, ServiceState } from "./service-registry"
import { ok, type Result } from "@/core/result"
import { createLogger } from "@/core/logger"
import { EventBus } from "@/event-bus/event-bus"
import { PermissionManager } from "@/security/permission-manager"
import { MemoryManager } from "@/memory/memory-manager"
import { ArtifactManager } from "@/artifact/artifact-manager"
import { ToolRegistry } from "@/tools/tool-registry"
import { registerBuiltInDefinitions } from "@/tools/built-in"
import { Scheduler } from "@/scheduler/scheduler"
import type { WorkspaceId } from "@/core/types"
import { WorkspaceManager } from "@/runtime/services/workspace-manager"
import { LockManager } from "@/runtime/services/lock-manager"
import { ContextManager } from "@/runtime/services/context-manager"
import { ProcessLifecycle } from "@/runtime/services/process-lifecycle"
import { WorkerSpawner } from "@/runtime/services/worker-spawner"
import { ExecutionEngine } from "@/runtime/services/execution-engine"
import { MergeManager } from "@/runtime/services/merge-manager"
import { WorkflowManager } from "@/workflow/workflow-manager"
import type { WorkflowDefinition } from "@/workflow/workflow-manager"
import { TriggerEngine } from "@/workflow/triggers"
import type { ReadSnapshotFn, WebhookRegisterFn } from "@/workflow/triggers"
import type { PersistenceAdapter, WorkflowEventEmitter } from "@/workflow/workflow-engine"
import type {
  AdmissionRequest,
  AdmissionResponse,
  ExecutionRequest,
  WorkflowNodeResult,
  WorkflowRun,
  WorkflowRunId,
  NodeRuntimeState,
  GraphSnapshot,
} from "@/workflow/workflow-types"
import type { RunContext } from "@/workflow/run-context"
import type { RunTrigger } from "@/workflow/workflow-types"

const logger = createLogger("RuntimeBootstrap")

// ---------------------------------------------------------------------------
// In-memory workflow engine adapters (no Rust backend required).
// ---------------------------------------------------------------------------

class NoopEventEmitter implements WorkflowEventEmitter {
  emit(): void {}
}

class AllowAllScheduler {
  async admit(_request: AdmissionRequest): Promise<AdmissionResponse> {
    return { admitted: [], deferred: [], rejected: [] }
  }
}

class NoopExecutor {
  async execute(_request: ExecutionRequest): Promise<WorkflowNodeResult> {
    return {
      ok: true,
      executionId: "noop",
      outputs: {},
      metrics: { durationMs: 0, tokensUsed: 0, costUsd: 0, toolCalls: 0 },
    }
  }
  async status(): Promise<"completed"> {
    return "completed"
  }
  async cancel(): Promise<void> {}
}

class InMemoryPersistence implements PersistenceAdapter {
  private readonly runs = new Map<string, WorkflowRun>()
  private readonly snapshots = new Map<string, GraphSnapshot>()
  private readonly nodeStates = new Map<string, readonly NodeRuntimeState[]>()
  private readonly contexts = new Map<string, RunContext>()

  async saveRun(run: WorkflowRun): Promise<Result<void, string>> {
    this.runs.set(run.runId, run)
    return ok(undefined)
  }
  async loadRun(runId: WorkflowRunId): Promise<Result<WorkflowRun | null, string>> {
    return ok(this.runs.get(runId) ?? null)
  }
  async loadSnapshot(snapshotId: string): Promise<Result<GraphSnapshot | null, string>> {
    return ok(this.snapshots.get(snapshotId) ?? null)
  }
  async saveNodeState(state: NodeRuntimeState): Promise<Result<void, string>> {
    const key = state.runId
    const arr = (this.nodeStates.get(key) ?? []) as NodeRuntimeState[]
    arr.push(state)
    this.nodeStates.set(key, arr)
    return ok(undefined)
  }
  async loadNodeStates(runId: WorkflowRunId): Promise<Result<readonly NodeRuntimeState[], string>> {
    return ok(this.nodeStates.get(runId) ?? [])
  }
  async saveRunContext(context: RunContext): Promise<Result<void, string>> {
    this.contexts.set(context.runId, context)
    return ok(undefined)
  }
  async loadRunContext(runId: WorkflowRunId): Promise<Result<RunContext | null, string>> {
    return ok(this.contexts.get(runId) ?? null)
  }
  async appendTransition(): Promise<Result<void, string>> {
    return ok(undefined)
  }
}

// ---------------------------------------------------------------------------
// Lightweight adapter for services without real implementations yet.
// Provides start()/stop()/getState() lifecycle and logs through EventBus.
// Replace with a proper implementation when the module exists.
// ---------------------------------------------------------------------------

export class ServiceAdapter {
  protected state: ServiceState = "registered"
  protected readonly log: ReturnType<typeof createLogger>

  constructor(name: string, _eventBus?: EventBus) {
    this.log = createLogger(name)
  }

  async start(): Promise<void> {
    this.state = "running"
    this.log.info("Started (adapter — no real implementation)")
  }

  async stop(): Promise<void> {
    this.state = "stopped"
    this.log.info("Stopped (adapter — no real implementation)")
  }

  getState(): ServiceState {
    return this.state
  }
}

// ---------------------------------------------------------------------------
// Core service definitions (5 phases from spec)
// ---------------------------------------------------------------------------

export const CORE_SERVICE_DEFINITIONS: readonly RuntimeServiceDefinition[] = [
  // Phase 1 — Core Infrastructure
  { id: "EventBus", name: "EventBus", required: true, phase: 1, dependencies: [] },

  // Phase 2 — Safety Services
  { id: "WorkspaceManager", name: "WorkspaceManager", required: true, phase: 2, dependencies: ["EventBus"] },
  { id: "PermissionManager", name: "PermissionManager", required: true, phase: 2, dependencies: ["EventBus"] },
  { id: "LockManager", name: "LockManager", required: true, phase: 2, dependencies: ["EventBus"] },

  // Phase 3 — Data Services
  { id: "MemoryManager", name: "MemoryManager", required: false, phase: 3, dependencies: ["WorkspaceManager"] },
  { id: "ArtifactManager", name: "ArtifactManager", required: true, phase: 3, dependencies: ["WorkspaceManager"] },
  { id: "ContextManager", name: "ContextManager", required: false, phase: 3, dependencies: ["WorkspaceManager", "MemoryManager"] },

  // Phase 4 — Capability Services
  { id: "ToolRegistry", name: "ToolRegistry", required: true, phase: 4, dependencies: ["PermissionManager", "ArtifactManager"] },
  { id: "ProcessLifecycle", name: "ProcessLifecycle", required: true, phase: 4, dependencies: ["EventBus", "LockManager"] },
  { id: "WorkerSpawner", name: "WorkerSpawner", required: true, phase: 4, dependencies: ["ProcessLifecycle", "ContextManager", "PermissionManager"] },

  // Phase 5 — Execution Services
  { id: "Scheduler", name: "Scheduler", required: true, phase: 5, dependencies: ["WorkerSpawner", "EventBus"] },
  { id: "ExecutionEngine", name: "ExecutionEngine", required: true, phase: 5, dependencies: ["Scheduler", "PermissionManager"] },
  { id: "MergeManager", name: "MergeManager", required: true, phase: 5, dependencies: ["ArtifactManager", "LockManager", "PermissionManager"] },
  { id: "WorkflowManager", name: "WorkflowManager", required: false, phase: 5, dependencies: ["EventBus"] },
  { id: "TriggerEngine", name: "TriggerEngine", required: false, phase: 5, dependencies: ["WorkflowManager", "EventBus"] },
]

// ---------------------------------------------------------------------------
// Bootstrap function
// ---------------------------------------------------------------------------

export function bootstrapServiceRegistry(
  registry: ServiceRegistry,
  extraDefinitions?: readonly RuntimeServiceDefinition[],
): void {
  logger.info("Bootstrapping service registry")

  for (const definition of CORE_SERVICE_DEFINITIONS) {
    registry.register(definition)
  }

  if (extraDefinitions) {
    for (const definition of extraDefinitions) {
      registry.register(definition)
    }
  }

  // -----------------------------------------------------------------------
  // Phase 1 — Core Infrastructure
  // -----------------------------------------------------------------------
  const eventBus = new EventBus()
  registry.setInstance("EventBus", eventBus)

  // -----------------------------------------------------------------------
  // Phase 2 — Safety Services
  // -----------------------------------------------------------------------
  registry.setInstance("WorkspaceManager", new WorkspaceManager(eventBus))
  registry.setInstance("PermissionManager", new PermissionManager())
  registry.setInstance("LockManager", new LockManager(eventBus))

  // -----------------------------------------------------------------------
  // Phase 3 — Data Services
  // -----------------------------------------------------------------------
  registry.setInstance("MemoryManager", new MemoryManager())
  registry.setInstance(
    "ArtifactManager",
    new ArtifactManager("__bootstrap__" as unknown as WorkspaceId),
  )
  const memoryManager = registry.getInstance<MemoryManager>("MemoryManager")
  registry.setInstance("ContextManager", new ContextManager(eventBus, memoryManager ?? undefined))

  // -----------------------------------------------------------------------
  // Phase 4 — Capability Services
  // -----------------------------------------------------------------------
  registry.setInstance("ToolRegistry", new ToolRegistry())
  // Register all built-in tool definitions
  const toolRegistry = registry.getInstance<ToolRegistry>("ToolRegistry")
  if (toolRegistry) {
    registerBuiltInDefinitions(toolRegistry)
  }
  const processLifecycle = new ProcessLifecycle(eventBus)
  registry.setInstance("ProcessLifecycle", processLifecycle)
  registry.setInstance("WorkerSpawner", new WorkerSpawner(processLifecycle, eventBus))

  // -----------------------------------------------------------------------
  // Phase 5 — Execution Services
  // -----------------------------------------------------------------------
  registry.setInstance("Scheduler", new Scheduler())
  registry.setInstance("ExecutionEngine", new ExecutionEngine(eventBus))
  const lockManager = registry.getInstance<LockManager>("LockManager")
  const artifactManager = registry.getInstance<ArtifactManager>("ArtifactManager")
  if (lockManager && artifactManager) {
    registry.setInstance("MergeManager", new MergeManager(artifactManager, lockManager, eventBus))
  }

  // Workflow + Trigger engine (Phase 5 — optional)
  const workflowManager = new WorkflowManager(
    new AllowAllScheduler(),
    new NoopExecutor(),
    new InMemoryPersistence(),
    new NoopEventEmitter(),
  )
  registry.setInstance("WorkflowManager", workflowManager)

  const triggerEngine = new TriggerEngine({
    run: (workflowId: string, trigger: RunTrigger) => {
      const def = workflowManager.getWorkflow(workflowId)
      if (!def) return Promise.resolve(undefined)
      return workflowManager.runWorkflow(workflowId, trigger).then(() => undefined)
    },
  })
  registry.setInstance("TriggerEngine", triggerEngine)

  logger.info(`Service registry bootstrapped (${CORE_SERVICE_DEFINITIONS.length} core services)`)
}

// ---------------------------------------------------------------------------
// Workflow trigger bootstrap
//
// Builds a WorkflowManager (in-memory adapters) and a TriggerEngine wired to
// it, then starts producers for every definition that declares a `trigger`.
// Dependency-light: file polling and webhook registration are injected.
// ---------------------------------------------------------------------------

export interface WorkflowTriggerBootstrap {
  readonly manager: WorkflowManager
  readonly engine: TriggerEngine
  /** Register a definition and immediately start its trigger (if any). */
  register(definition: WorkflowDefinition, readSnapshot?: ReadSnapshotFn, webhookRegister?: WebhookRegisterFn): void
  /** Stop all producers. */
  stopAll(): void
}

export function createWorkflowTriggerBootstrap(
  readSnapshot?: ReadSnapshotFn,
  webhookRegister?: WebhookRegisterFn,
): WorkflowTriggerBootstrap {
  const manager = new WorkflowManager(
    new AllowAllScheduler(),
    new NoopExecutor(),
    new InMemoryPersistence(),
    new NoopEventEmitter(),
  )

  const engine = new TriggerEngine({
    run: (workflowId: string, trigger: RunTrigger) => {
      const def = manager.getWorkflow(workflowId)
      if (!def) return Promise.resolve(undefined)
      return manager.runWorkflow(workflowId, trigger).then(() => undefined)
    },
    readSnapshot,
    webhookRegister,
  })

  return {
    manager,
    engine,
    register(definition, rs, wh) {
      manager.registerWorkflow(definition)
      if (definition.trigger) {
        engine.register(definition.workflowId, definition.trigger)
      }
      void rs
      void wh
    },
    stopAll() {
      engine.stopAll()
    },
  }
}
