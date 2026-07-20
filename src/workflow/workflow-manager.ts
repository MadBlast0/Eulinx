/**
 * P16-WF-MANAGER — Workflow Manager
 *
 * High-level orchestrator for the workflow engine. Manages workflow
 * definition registration, run lifecycle, and provides the public API
 * for creating, running, pausing, resuming, and cancelling workflows.
 * From WorkflowEngine-Part01 §Responsibilities.
 */

import type { Result } from "@/core/result"
import { err } from "@/core/result"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type {
  WorkflowRunId,
  WorkflowRun,
  GraphSnapshot,
  NodeDefinition,
  EdgeDefinition,
  RunTrigger,
  WorkflowEngineConfig,
  WorkflowError,
  SnapshotId,
} from "./workflow-types"
import type { WorkflowTriggerConfig } from "./triggers/types"
import {
  WorkflowEngine,
  type SchedulerAdapter,
  type ExecutionEngineAdapter,
  type PersistenceAdapter,
  type WorkflowEventEmitter,
} from "./workflow-engine"

// ---------------------------------------------------------------------------
// Workflow Definition (authored graph)
// ---------------------------------------------------------------------------

export interface WorkflowDefinition {
  readonly workflowId: string
  readonly version: number
  readonly name: string
  readonly description: string
  readonly nodes: readonly NodeDefinition[]
  readonly edges: readonly EdgeDefinition[]
  readonly createdAt: string
  readonly updatedAt: string
  /** Optional declarative trigger that the TriggerEngine schedules. */
  readonly trigger?: WorkflowTriggerConfig
}

// ---------------------------------------------------------------------------
// Workflow Manager
// ---------------------------------------------------------------------------

export class WorkflowManager {
  private readonly logger: Logger
  private readonly engine: WorkflowEngine
  private readonly definitions = new Map<string, WorkflowDefinition>()

  constructor(
    scheduler: SchedulerAdapter,
    executor: ExecutionEngineAdapter,
    persistence: PersistenceAdapter,
    emitter: WorkflowEventEmitter,
    config?: Partial<WorkflowEngineConfig>,
  ) {
    this.logger = createLogger("WorkflowManager")
    this.engine = new WorkflowEngine(scheduler, executor, persistence, emitter, config)
  }

  // -------------------------------------------------------------------------
  // Register Workflow Definition
  // -------------------------------------------------------------------------

  registerWorkflow(definition: WorkflowDefinition): void {
    this.definitions.set(definition.workflowId, definition)
    this.logger.info(`Registered workflow: ${definition.workflowId} v${definition.version}`)
  }

  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.definitions.get(workflowId)
  }

  // -------------------------------------------------------------------------
  // Create Snapshot from Definition
  // -------------------------------------------------------------------------

  createSnapshot(definition: WorkflowDefinition): GraphSnapshot {
    const contentHash = this.computeContentHash(definition.nodes, definition.edges)
    return {
      snapshotId: `snap_${definition.workflowId}_${definition.version}` as SnapshotId,
      workflowId: definition.workflowId,
      workflowVersion: definition.version,
      nodes: definition.nodes,
      edges: definition.edges,
      createdAt: new Date().toISOString(),
      contentHash,
    }
  }

  // -------------------------------------------------------------------------
  // Run Workflow
  // -------------------------------------------------------------------------

  async runWorkflow(
    workflowId: string,
    trigger: RunTrigger,
    options?: {
      workspaceId?: string
      projectId?: string
      sessionId?: string
      mode?: "normal" | "dry_run" | "replay"
    },
  ): Promise<Result<WorkflowRun, WorkflowError>> {
    const definition = this.definitions.get(workflowId)
    if (!definition) {
      return err({
        kind: "graph_invalid",
        nodeIds: [],
        message: `Workflow not found: ${workflowId}`,
      })
    }

    const snapshot = this.createSnapshot(definition)

    const result = await this.engine.createRun(
      workflowId,
      definition.version,
      snapshot,
      trigger,
      (options?.workspaceId ?? "default") as any,
      options?.projectId ?? "default",
      options?.sessionId ?? "default",
      options?.mode ?? "normal",
    )

    if (result.ok) {
      this.logger.info(`Created run: ${result.value.runId} for workflow: ${workflowId}`)
    }

    return result
  }

  // -------------------------------------------------------------------------
  // Tick a Run
  // -------------------------------------------------------------------------

  async tickRun(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    return this.engine.tick(runId)
  }

  // -------------------------------------------------------------------------
  // Pause / Resume / Cancel
  // -------------------------------------------------------------------------

  async pauseRun(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    return this.engine.pauseRun(runId)
  }

  async resumeRun(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    return this.engine.resumeRun(runId)
  }

  async cancelRun(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    return this.engine.cancelRun(runId)
  }

  // -------------------------------------------------------------------------
  // Recovery
  // -------------------------------------------------------------------------

  async recoverRun(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    return this.engine.recoverRun(runId)
  }

  // -------------------------------------------------------------------------
  // Query
  // -------------------------------------------------------------------------

  getRun(runId: WorkflowRunId): WorkflowRun | undefined {
    return this.engine.getRun(runId)
  }

  getRunContext(runId: WorkflowRunId) {
    return this.engine.getContext(runId)
  }

  // -------------------------------------------------------------------------
  // Content Hash (WorkflowEngine-Part02 §contentHash)
  // -------------------------------------------------------------------------

  private computeContentHash(
    nodes: readonly NodeDefinition[],
    edges: readonly EdgeDefinition[],
  ): string {
    // Stable serialization: sort by id, deterministic JSON
    const sortedNodes = [...nodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId))
    const sortedEdges = [...edges].sort((a, b) => a.edgeId.localeCompare(b.edgeId))
    const payload = JSON.stringify({ nodes: sortedNodes, edges: sortedEdges })

    // Simple hash — in production use SHA-256
    let hash = 0
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return `hash_${Math.abs(hash).toString(16)}`
  }
}
