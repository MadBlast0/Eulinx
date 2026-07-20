/**
 * P16-WF-ADAPTER — Persistence Adapter (production)
 *
 * Persists workflow run state, node states, snapshots, and run contexts.
 * Backed by an in-memory store with optional localStorage persistence for
 * browser/Tauri webview contexts (mirroring src/state/persistence.ts).
 *
 * The store is the single write path; nothing bypasses it.
 */

import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import type { JsonValue } from "@/core/types"
import type {
  WorkflowRunId,
  NodeId,
  EdgeId,
  WorkflowRun,
  GraphSnapshot,
  NodeRuntimeState,
  NodeState,
} from "../workflow-types"
import { RunContext } from "../run-context"
import type { PersistenceAdapter as PersistenceAdapterIface } from "../workflow-engine"

interface PersistedSnapshot {
  readonly snapshotId: string
  readonly snapshot: GraphSnapshot
}

interface PersistedContext {
  readonly runId: string
  readonly context: {
    readonly runId: string
    readonly graphVersion: number
    readonly outputs: Record<string, unknown>
    readonly version: number
  }
}

export class PersistenceAdapter implements PersistenceAdapterIface {
  private runs = new Map<string, WorkflowRun>()
  private nodeStates = new Map<string, NodeRuntimeState>()
  private snapshots = new Map<string, PersistedSnapshot>()
  private contexts = new Map<string, PersistedContext>()
  private transitions = new Map<string, unknown[]>()

  private readonly storageKey: string | null

  constructor(options?: { storageKey?: string }) {
    this.storageKey = options?.storageKey ?? "eulinx:workflow_state"
    this.hydrate()
  }

  async saveRun(run: WorkflowRun): Promise<Result<void, string>> {
    this.runs.set(run.runId, run)
    this.flush()
    return ok(undefined)
  }

  async loadRun(runId: WorkflowRunId): Promise<Result<WorkflowRun | null, string>> {
    return ok(this.runs.get(runId) ?? null)
  }

  async loadSnapshot(snapshotId: string): Promise<Result<GraphSnapshot | null, string>> {
    return ok(this.snapshots.get(snapshotId)?.snapshot ?? null)
  }

  async saveNodeState(state: NodeRuntimeState): Promise<Result<void, string>> {
    const key = `${state.runId}:${state.nodeId}:${state.iterationIndex}`
    this.nodeStates.set(key, state)
    this.flush()
    return ok(undefined)
  }

  async loadNodeStates(runId: WorkflowRunId): Promise<Result<readonly NodeRuntimeState[], string>> {
    const states = [...this.nodeStates.values()].filter((s) => s.runId === runId)
    return ok(states)
  }

  async saveRunContext(context: RunContext): Promise<Result<void, string>> {
    const outputs: Record<string, JsonValue> = {}
    for (const [key, output] of context.outputs) {
      outputs[key] = output.value
    }
    const entry: PersistedContext = {
      runId: context.runId,
      context: {
        runId: context.runId,
        graphVersion: context.graphVersion,
        outputs,
        version: context.version,
      },
    }
    this.contexts.set(context.runId, entry)
    this.flush()
    return ok(undefined)
  }

  async loadRunContext(runId: WorkflowRunId): Promise<Result<RunContext | null, string>> {
    const entry = this.contexts.get(runId)
    if (!entry) return ok(null)
    const context = new RunContext(entry.context.runId, entry.context.graphVersion)
    for (const [key, value] of Object.entries(entry.context.outputs)) {
      const parsed = parseOutputKey(key)
      if (parsed) {
        const result = context.writeOutput(
          parsed.nodeId,
          parsed.portId,
          parsed.iterationIndex,
          value as JsonValue,
          "edge_restored" as EdgeId,
          JSON.stringify(value).length,
        )
        if (!result.ok) {
          return err(`Failed to restore run context output: ${result.error}`)
        }
      }
    }
    return ok(context)
  }

  async appendTransition(
    runId: WorkflowRunId,
    seq: number,
    nodeId: NodeId,
    iterationIndex: number,
    fromState: NodeState,
    toState: NodeState,
    reason: string,
  ): Promise<Result<void, string>> {
    const existing = this.transitions.get(runId) ?? []
    existing.push({ seq, nodeId, iterationIndex, fromState, toState, reason })
    this.transitions.set(runId, existing)
    this.flush()
    return ok(undefined)
  }

  // -------------------------------------------------------------------------
  // Internal persistence (localStorage in browser contexts)
  // -------------------------------------------------------------------------

  private hydrate(): void {
    if (typeof window === "undefined" || !this.storageKey) return
    try {
      const raw = window.localStorage.getItem(this.storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        runs: [string, WorkflowRun][]
        nodeStates: [string, NodeRuntimeState][]
        snapshots: [string, PersistedSnapshot][]
        contexts: [string, PersistedContext][]
        transitions: [string, unknown[]][]
      }
      this.runs = new Map(parsed.runs ?? [])
      this.nodeStates = new Map(parsed.nodeStates ?? [])
      this.snapshots = new Map(parsed.snapshots ?? [])
      this.contexts = new Map(parsed.contexts ?? [])
      this.transitions = new Map(parsed.transitions ?? [])
    } catch {
      // Corrupt store — start fresh
    }
  }

  private flush(): void {
    if (typeof window === "undefined" || !this.storageKey) return
    try {
      const payload = {
        runs: [...this.runs],
        nodeStates: [...this.nodeStates],
        snapshots: [...this.snapshots],
        contexts: [...this.contexts],
        transitions: [...this.transitions],
      }
      window.localStorage.setItem(this.storageKey, JSON.stringify(payload))
    } catch {
      // Persistence best-effort; ignore quota/serialize errors
    }
  }

  /** Register a snapshot so loadSnapshot can resolve it. */
  async saveSnapshot(snapshot: GraphSnapshot): Promise<Result<void, string>> {
    this.snapshots.set(snapshot.snapshotId, {
      snapshotId: snapshot.snapshotId,
      snapshot,
    })
    this.flush()
    return ok(undefined)
  }
}

function parseOutputKey(key: string): {
  nodeId: NodeId
  portId: string
  iterationIndex: number
} | null {
  const parts = key.split(":")
  if (parts.length < 3) return null
  const iteration = Number(parts[parts.length - 1])
  if (!Number.isFinite(iteration)) return null
  const nodeId = parts[0] as NodeId
  const portId = parts.slice(1, parts.length - 1).join(":")
  return { nodeId, portId, iterationIndex: iteration }
}
