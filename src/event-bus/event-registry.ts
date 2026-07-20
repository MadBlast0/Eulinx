/**
 * P03-EVENT-REGISTRY — Event Schema Catalog
 *
 * From EventBus-Part02 §Naming Rules and EventAPI-Part01 §The Catalog Is Enumerated.
 * The event catalog is closed — a service MAY NOT emit an event type
 * that is not in this registry. Adding a new event requires adding it here first.
 */

import type { RuntimeServiceName, EventFamily } from "./event-types"
import { toEulinxUri } from "./event-types"

// ---------------------------------------------------------------------------
// Event schema definition
// ---------------------------------------------------------------------------

export type EventSchemaDefinition = {
  readonly type: string
  readonly family: EventFamily
  readonly replayGrade: boolean
  readonly description: string
  readonly publisher: RuntimeServiceName
  readonly highFrequency: boolean
}

// ---------------------------------------------------------------------------
// Event Registry
// ---------------------------------------------------------------------------

/**
 * Closed catalog of all event types in Eulinx.
 * An event type not registered here MUST NOT be emitted.
 */
export class EventRegistry {
  private readonly schemas = new Map<string, EventSchemaDefinition>()

  constructor() {
    this.registerDefaults()
  }

  /**
   * Register a new event type. Fails if the type already exists.
   */
  register(schema: EventSchemaDefinition): boolean {
    if (this.schemas.has(schema.type)) return false
    this.schemas.set(schema.type, schema)
    return true
  }

  /**
   * Check if an event type is registered.
   */
  has(type: string): boolean {
    return this.schemas.has(type)
  }

  /**
   * Get the schema for an event type.
   */
  get(type: string): EventSchemaDefinition | undefined {
    return this.schemas.get(type)
  }

  /**
   * Get all registered event types.
   */
  all(): ReadonlyArray<EventSchemaDefinition> {
    return Array.from(this.schemas.values())
  }

  /**
   * Get all event types for a given family.
   */
  byFamily(family: EventFamily): ReadonlyArray<EventSchemaDefinition> {
    return Array.from(this.schemas.values()).filter(
      (s) => s.family === family && !s.type.startsWith("Eulinx://"),
    )
  }

  /**
   * Get all replay-grade event types (short-form only, excludes URI aliases).
   */
  replayGradeTypes(): ReadonlyArray<EventSchemaDefinition> {
    return Array.from(this.schemas.values()).filter(
      (s) => s.replayGrade && !s.type.startsWith("Eulinx://"),
    )
  }

  /**
   * Get all high-frequency event types (short-form only, excludes URI aliases).
   */
  highFrequencyTypes(): ReadonlyArray<EventSchemaDefinition> {
    return Array.from(this.schemas.values()).filter(
      (s) => s.highFrequency && !s.type.startsWith("Eulinx://"),
    )
  }

  /**
   * Validate that an event type name follows the naming convention.
   */
  static validateEventName(type: string): boolean {
    const dotIndex = type.indexOf(".")
    if (dotIndex === -1) return false

    const family = type.substring(0, dotIndex)
    const fact = type.substring(dotIndex + 1)

    // Family must be valid
    const validFamilies = [
      "runtime", "worker", "execution", "artifact", "merge",
      "lock", "permission", "memory", "tool", "process",
      "plugin", "ui", "eventbus",
    ]
    if (!validFamilies.includes(family)) return false

    // Fact must be past tense (no present tense verbs)
    // Basic heuristic: should not end with common present-tense suffixes
    if (fact.includes("_")) {
      // snake_case is correct
      return true
    }

    return fact.length > 0
  }

  /**
   * Register all default event types from the catalog.
   */
  private registerDefaults(): void {
    const defs: EventSchemaDefinition[] = [
      // Runtime
      { type: "runtime.started", family: "runtime", replayGrade: true, description: "Runtime started", publisher: "RuntimeManager", highFrequency: false },
      { type: "runtime.stopped", family: "runtime", replayGrade: true, description: "Runtime stopped", publisher: "RuntimeManager", highFrequency: false },
      { type: "runtime.state_changed", family: "runtime", replayGrade: true, description: "Runtime state changed", publisher: "RuntimeManager", highFrequency: false },
      { type: "runtime.service_health_changed", family: "runtime", replayGrade: true, description: "Service health changed", publisher: "RuntimeManager", highFrequency: false },
      { type: "runtime.workspace_bound", family: "runtime", replayGrade: true, description: "Workspace bound", publisher: "RuntimeManager", highFrequency: false },
      { type: "runtime.invariant_violated", family: "runtime", replayGrade: true, description: "Invariant violated", publisher: "RuntimeManager", highFrequency: false },

      // Worker
      { type: "worker.spawned", family: "worker", replayGrade: true, description: "Worker spawned", publisher: "WorkerSpawner", highFrequency: false },
      { type: "worker.ready", family: "worker", replayGrade: true, description: "Worker ready", publisher: "WorkerSpawner", highFrequency: false },
      { type: "worker.state_changed", family: "worker", replayGrade: true, description: "Worker state changed", publisher: "ExecutionEngine", highFrequency: false },
      { type: "worker.output_streamed", family: "worker", replayGrade: false, description: "Worker output streamed", publisher: "ExecutionEngine", highFrequency: true },
      { type: "worker.completed", family: "worker", replayGrade: true, description: "Worker completed", publisher: "ExecutionEngine", highFrequency: false },
      { type: "worker.failed", family: "worker", replayGrade: true, description: "Worker failed", publisher: "ExecutionEngine", highFrequency: false },
      { type: "worker.cancelled", family: "worker", replayGrade: true, description: "Worker cancelled", publisher: "ExecutionEngine", highFrequency: false },
      { type: "worker.terminated", family: "worker", replayGrade: true, description: "Worker terminated", publisher: "WorkerSpawner", highFrequency: false },

      // Execution
      { type: "execution.started", family: "execution", replayGrade: true, description: "Execution started", publisher: "ExecutionEngine", highFrequency: false },
      { type: "execution.node_queued", family: "execution", replayGrade: true, description: "Execution node queued", publisher: "Scheduler", highFrequency: false },
      { type: "execution.node_blocked", family: "execution", replayGrade: true, description: "Execution node blocked", publisher: "ExecutionEngine", highFrequency: false },
      { type: "execution.node_started", family: "execution", replayGrade: true, description: "Execution node started", publisher: "ExecutionEngine", highFrequency: false },
      { type: "execution.node_completed", family: "execution", replayGrade: true, description: "Execution node completed", publisher: "ExecutionEngine", highFrequency: false },
      { type: "execution.node_failed", family: "execution", replayGrade: true, description: "Execution node failed", publisher: "ExecutionEngine", highFrequency: false },
      { type: "execution.progress_reported", family: "execution", replayGrade: false, description: "Execution progress reported", publisher: "ExecutionEngine", highFrequency: true },
      { type: "execution.completed", family: "execution", replayGrade: true, description: "Execution completed", publisher: "ExecutionEngine", highFrequency: false },
      { type: "execution.failed", family: "execution", replayGrade: true, description: "Execution failed", publisher: "ExecutionEngine", highFrequency: false },
      { type: "execution.cancelled", family: "execution", replayGrade: true, description: "Execution cancelled", publisher: "ExecutionEngine", highFrequency: false },

      // Artifact
      { type: "artifact.created", family: "artifact", replayGrade: true, description: "Artifact created", publisher: "ArtifactManager", highFrequency: false },
      { type: "artifact.verified", family: "artifact", replayGrade: true, description: "Artifact verified", publisher: "ArtifactManager", highFrequency: false },
      { type: "artifact.rejected", family: "artifact", replayGrade: true, description: "Artifact rejected", publisher: "ArtifactManager", highFrequency: false },
      { type: "artifact.versioned", family: "artifact", replayGrade: true, description: "Artifact versioned", publisher: "ArtifactManager", highFrequency: false },
      { type: "artifact.indexed", family: "artifact", replayGrade: true, description: "Artifact indexed", publisher: "ArtifactManager", highFrequency: false },
      { type: "artifact.discarded", family: "artifact", replayGrade: true, description: "Artifact discarded", publisher: "ArtifactManager", highFrequency: false },

      // Merge
      { type: "merge.requested", family: "merge", replayGrade: true, description: "Merge requested", publisher: "MergeManager", highFrequency: false },
      { type: "merge.approval_required", family: "merge", replayGrade: true, description: "Merge approval required", publisher: "MergeManager", highFrequency: false },
      { type: "merge.approved", family: "merge", replayGrade: true, description: "Merge approved", publisher: "MergeManager", highFrequency: false },
      { type: "merge.rejected", family: "merge", replayGrade: true, description: "Merge rejected", publisher: "MergeManager", highFrequency: false },
      { type: "merge.conflict_detected", family: "merge", replayGrade: true, description: "Merge conflict detected", publisher: "MergeManager", highFrequency: false },
      { type: "merge.applied", family: "merge", replayGrade: true, description: "Merge applied", publisher: "MergeManager", highFrequency: false },
      { type: "merge.failed", family: "merge", replayGrade: true, description: "Merge failed", publisher: "MergeManager", highFrequency: false },
      { type: "merge.rolled_back", family: "merge", replayGrade: true, description: "Merge rolled back", publisher: "MergeManager", highFrequency: false },

      // Lock
      { type: "lock.requested", family: "lock", replayGrade: true, description: "Lock requested", publisher: "LockManager", highFrequency: false },
      { type: "lock.granted", family: "lock", replayGrade: true, description: "Lock granted", publisher: "LockManager", highFrequency: false },
      { type: "lock.queued", family: "lock", replayGrade: true, description: "Lock queued", publisher: "LockManager", highFrequency: false },
      { type: "lock.released", family: "lock", replayGrade: true, description: "Lock released", publisher: "LockManager", highFrequency: false },
      { type: "lock.denied", family: "lock", replayGrade: true, description: "Lock denied", publisher: "LockManager", highFrequency: false },
      { type: "lock.timed_out", family: "lock", replayGrade: true, description: "Lock timed out", publisher: "LockManager", highFrequency: false },
      { type: "lock.deadlock_detected", family: "lock", replayGrade: true, description: "Lock deadlock detected", publisher: "LockManager", highFrequency: false },

      // Permission
      { type: "permission.requested", family: "permission", replayGrade: true, description: "Permission requested", publisher: "PermissionManager", highFrequency: false },
      { type: "permission.prompt_shown", family: "permission", replayGrade: true, description: "Permission prompt shown", publisher: "PermissionManager", highFrequency: false },
      { type: "permission.granted", family: "permission", replayGrade: true, description: "Permission granted", publisher: "PermissionManager", highFrequency: false },
      { type: "permission.denied", family: "permission", replayGrade: true, description: "Permission denied", publisher: "PermissionManager", highFrequency: false },
      { type: "permission.revoked", family: "permission", replayGrade: true, description: "Permission revoked", publisher: "PermissionManager", highFrequency: false },
      { type: "permission.profile_applied", family: "permission", replayGrade: true, description: "Permission profile applied", publisher: "PermissionManager", highFrequency: false },

      // Memory
      { type: "memory.written", family: "memory", replayGrade: true, description: "Memory written", publisher: "MemoryManager", highFrequency: false },
      { type: "memory.summarized", family: "memory", replayGrade: true, description: "Memory summarized", publisher: "MemoryManager", highFrequency: false },
      { type: "memory.indexed", family: "memory", replayGrade: true, description: "Memory indexed", publisher: "MemoryManager", highFrequency: false },
      { type: "memory.search_performed", family: "memory", replayGrade: false, description: "Memory search performed", publisher: "MemoryManager", highFrequency: false },
      { type: "memory.evicted", family: "memory", replayGrade: true, description: "Memory evicted", publisher: "MemoryManager", highFrequency: false },

      // Tool
      { type: "tool.registered", family: "tool", replayGrade: true, description: "Tool registered", publisher: "ToolRegistry", highFrequency: false },
      { type: "tool.invoked", family: "tool", replayGrade: true, description: "Tool invoked", publisher: "ToolRegistry", highFrequency: false },
      { type: "tool.succeeded", family: "tool", replayGrade: true, description: "Tool succeeded", publisher: "ToolRegistry", highFrequency: false },
      { type: "tool.failed", family: "tool", replayGrade: true, description: "Tool failed", publisher: "ToolRegistry", highFrequency: false },
      { type: "tool.timed_out", family: "tool", replayGrade: true, description: "Tool timed out", publisher: "ToolRegistry", highFrequency: false },
      { type: "tool.blocked", family: "tool", replayGrade: true, description: "Tool blocked", publisher: "ToolRegistry", highFrequency: false },

      // Process
      { type: "process.started", family: "process", replayGrade: true, description: "Process started", publisher: "ProcessLifecycle", highFrequency: false },
      { type: "process.output_streamed", family: "process", replayGrade: false, description: "Process output streamed", publisher: "ProcessLifecycle", highFrequency: true },
      { type: "process.exited", family: "process", replayGrade: true, description: "Process exited", publisher: "ProcessLifecycle", highFrequency: false },
      { type: "process.killed", family: "process", replayGrade: true, description: "Process killed", publisher: "ProcessLifecycle", highFrequency: false },
      { type: "process.crashed", family: "process", replayGrade: true, description: "Process crashed", publisher: "ProcessLifecycle", highFrequency: false },
      { type: "process.restarted", family: "process", replayGrade: true, description: "Process restarted", publisher: "ProcessLifecycle", highFrequency: false },

      // Plugin
      { type: "plugin.loaded", family: "plugin", replayGrade: true, description: "Plugin loaded", publisher: "EventBus", highFrequency: false },
      { type: "plugin.unloaded", family: "plugin", replayGrade: true, description: "Plugin unloaded", publisher: "EventBus", highFrequency: false },
      { type: "plugin.subscribed", family: "plugin", replayGrade: true, description: "Plugin subscribed", publisher: "EventBus", highFrequency: false },
      { type: "plugin.errored", family: "plugin", replayGrade: true, description: "Plugin errored", publisher: "EventBus", highFrequency: false },
      { type: "plugin.quarantined", family: "plugin", replayGrade: true, description: "Plugin quarantined", publisher: "EventBus", highFrequency: false },

      // UI
      { type: "ui.view_opened", family: "ui", replayGrade: false, description: "UI view opened", publisher: "RuntimeManager", highFrequency: false },
      { type: "ui.user_action", family: "ui", replayGrade: false, description: "UI user action", publisher: "RuntimeManager", highFrequency: false },
      { type: "ui.notification_raised", family: "ui", replayGrade: false, description: "UI notification raised", publisher: "RuntimeManager", highFrequency: false },

      // EventBus self
      { type: "eventbus.subscriber_dropped_event", family: "eventbus", replayGrade: true, description: "Subscriber dropped event", publisher: "EventBus", highFrequency: false },
      { type: "eventbus.subscriber_panicked", family: "eventbus", replayGrade: true, description: "Subscriber panicked", publisher: "EventBus", highFrequency: false },
      { type: "eventbus.log_write_failed", family: "eventbus", replayGrade: true, description: "Log write failed", publisher: "EventBus", highFrequency: false },
      { type: "eventbus.backpressure_engaged", family: "eventbus", replayGrade: true, description: "Backpressure engaged", publisher: "EventBus", highFrequency: false },
    ]

    for (const def of defs) {
      this.schemas.set(def.type, def)
      // Register the canonical `Eulinx://<family>/<fact>` URI as an alias so
      // subscribers may publish/subscribe using either the short name or the
      // wire URI (EventAPI-Part01 §The Naming Scheme).
      const parts = def.type.split(".")
      if (parts.length >= 2) {
        const family = parts[0] as EventFamily
        const fact = parts[1]!
        const uri = toEulinxUri(family, fact)
        this.schemas.set(uri, { ...def, type: uri })
      }
    }
  }

  /**
   * Register a schema under BOTH the short `<family>.<fact>` name and its
   * canonical `Eulinx://` URI. Used by callers that build names dynamically.
   */
  registerAliased(schema: EventSchemaDefinition): boolean {
    const parts = schema.type.split(".")
    if (parts.length < 2) return this.register({ ...schema, type: schema.type })
    const family = parts[0] as EventFamily
    const fact = parts[1]!
    const uri = toEulinxUri(family, fact)
    const shortOk = this.register({ ...schema, type: schema.type })
    const uriOk = this.register({ ...schema, type: uri })
    return shortOk || uriOk
  }
}

// Singleton instance
let defaultRegistry: EventRegistry | null = null

export function getDefaultRegistry(): EventRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new EventRegistry()
  }
  return defaultRegistry
}
