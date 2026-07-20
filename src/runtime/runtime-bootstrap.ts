/**
 * P02-RUNTIME-BOOTSTRAP — Runtime Bootstrap
 *
 * Wires service definitions into the registry in the correct dependency order.
 * From RuntimeManager-Part02: service graph and startup phases.
 */

import type { RuntimeServiceDefinition, ServiceRegistry, ServiceState } from "./service-registry"
import { createLogger } from "@/core/logger"
import { EventBus } from "@/event-bus/event-bus"
import { PermissionManager } from "@/security/permission-manager"
import { MemoryManager } from "@/memory/memory-manager"
import { ArtifactManager } from "@/artifact/artifact-manager"
import { ToolRegistry } from "@/tools/tool-registry"
import { Scheduler } from "@/scheduler/scheduler"
import type { WorkspaceId } from "@/core/types"
import { WorkspaceManager } from "@/runtime/services/workspace-manager"
import { LockManager } from "@/runtime/services/lock-manager"
import { ContextManager } from "@/runtime/services/context-manager"
import { ProcessLifecycle } from "@/runtime/services/process-lifecycle"
import { WorkerSpawner } from "@/runtime/services/worker-spawner"
import { ExecutionEngine } from "@/runtime/services/execution-engine"
import { MergeManager } from "@/runtime/services/merge-manager"

const logger = createLogger("RuntimeBootstrap")

// ---------------------------------------------------------------------------
// Lightweight adapter for services without real implementations yet.
// Provides start()/stop()/getState() lifecycle and logs through EventBus.
// Replace with a proper implementation when the module exists.
// ---------------------------------------------------------------------------

class ServiceAdapter {
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
  registry.setInstance("ContextManager", new ContextManager(eventBus))

  // -----------------------------------------------------------------------
  // Phase 4 — Capability Services
  // -----------------------------------------------------------------------
  registry.setInstance("ToolRegistry", new ToolRegistry())
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

  logger.info(`Service registry bootstrapped (${CORE_SERVICE_DEFINITIONS.length} core services)`)
}
