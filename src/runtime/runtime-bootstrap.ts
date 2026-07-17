/**
 * P02-RUNTIME-BOOTSTRAP — Runtime Bootstrap
 *
 * Wires service definitions into the registry in the correct dependency order.
 * From RuntimeManager-Part02: service graph and startup phases.
 */

import type { RuntimeServiceDefinition, ServiceRegistry } from "./service-registry"
import { createLogger } from "@/core/logger"

const logger = createLogger("RuntimeBootstrap")

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

  logger.info(`Service registry bootstrapped (${CORE_SERVICE_DEFINITIONS.length} core services)`)
}
