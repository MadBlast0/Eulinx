/**
 * P16-WF — RunContext (Data Passing Between Nodes)
 *
 * The per-run, keyed, write-once value store. Nodes write only their declared
 * output ports; downstream nodes read only through declared input ports.
 * From WorkflowEngine-Part05 §Definition, §The Binding Algorithm.
 */

import type {
  NodeId,
  PortValueRef,
  PortValueType,
  EdgeId,
  WorkflowRunId,
} from "./workflow-types"
import type { JsonValue } from "@/core/types"

// ---------------------------------------------------------------------------
// Output Key (WorkflowEngine-Part05 §OutputKey)
// ---------------------------------------------------------------------------

export interface OutputKey {
  readonly nodeId: NodeId
  readonly portId: string
  readonly iterationIndex: number
}

export function outputKey(nodeId: NodeId, portId: string, iterationIndex: number): string {
  return `${nodeId}:${portId}:${iterationIndex}`
}

// ---------------------------------------------------------------------------
// Input Key (WorkflowEngine-Part05 §InputKey)
// ---------------------------------------------------------------------------

export interface InputKey {
  readonly nodeId: NodeId
  readonly portId: string
  readonly iterationIndex: number
}

// ---------------------------------------------------------------------------
// Output Value (WorkflowEngine-Part05 §OutputValue)
// ---------------------------------------------------------------------------

export interface OutputValue {
  readonly value: JsonValue
  readonly producedAt: string
  readonly viaEdgeId: EdgeId
  readonly typeCheck: { readonly valid: boolean; readonly errors: readonly string[] }
}

// ---------------------------------------------------------------------------
// Resolved Binding (WorkflowEngine-Part05 §ResolvedBinding)
// ---------------------------------------------------------------------------

export interface ResolvedBinding {
  readonly resolvedAt: string
  readonly sourceOutput: OutputKey
  readonly transformId?: string
}

// ---------------------------------------------------------------------------
// Write Log Entry (WorkflowEngine-Part05 §writes)
// ---------------------------------------------------------------------------

export interface RunContextWriteLog {
  readonly key: string
  readonly valueRef: PortValueRef
  readonly edgeId: EdgeId
  readonly writtenAt: string
}

// ---------------------------------------------------------------------------
// RunContext (WorkflowEngine-Part05 §Definition)
// ---------------------------------------------------------------------------

export class RunContext {
  readonly runId: WorkflowRunId
  readonly graphVersion: number

  readonly outputs = new Map<string, OutputValue>()
  readonly bindings = new Map<string, ResolvedBinding>()
  readonly writes: RunContextWriteLog[] = []
  version = 0

  constructor(runId: WorkflowRunId, graphVersion: number) {
    this.runId = runId
    this.graphVersion = graphVersion
  }

  /**
   * Write a node's output port value to the context.
   * Fails if the key has already been written (write-once invariant).
   */
  writeOutput(
    nodeId: NodeId,
    portId: string,
    iterationIndex: number,
    value: JsonValue,
    viaEdgeId: EdgeId,
    sizeBytes: number,
  ): { ok: true; ref: PortValueRef } | { ok: false; error: string } {
    const key = outputKey(nodeId, portId, iterationIndex)

    if (this.outputs.has(key)) {
      return { ok: false, error: `context_write_conflict: key already written: ${key}` }
    }

    const outputValue: OutputValue = {
      value,
      producedAt: new Date().toISOString(),
      viaEdgeId,
      typeCheck: { valid: true, errors: [] },
    }
    this.outputs.set(key, outputValue)

    const ref: PortValueRef = {
      storageKey: key,
      valueType: "json" as PortValueType,
      sizeBytes,
    }

    this.writes.push({
      key,
      valueRef: ref,
      edgeId: viaEdgeId,
      writtenAt: outputValue.producedAt,
    })

    this.version++
    return { ok: true, ref }
  }

  /**
   * Read an output value by key.
   */
  readOutput(nodeId: NodeId, portId: string, iterationIndex: number): OutputValue | undefined {
    const key = outputKey(nodeId, portId, iterationIndex)
    return this.outputs.get(key)
  }

  /**
   * Bind a downstream input port to a resolved value.
   */
  bindInput(
    nodeId: NodeId,
    portId: string,
    iterationIndex: number,
    sourceOutput: OutputKey,
    transformId?: string,
  ): void {
    const key = `${nodeId}:${portId}:${iterationIndex}`
    this.bindings.set(key, {
      resolvedAt: new Date().toISOString(),
      sourceOutput,
      transformId,
    })
  }

  /**
   * Resolve a downstream node's input port value.
   * Returns the value from the source output that the binding points to.
   */
  resolveInput(nodeId: NodeId, portId: string, iterationIndex: number): JsonValue | undefined {
    const bindKey = `${nodeId}:${portId}:${iterationIndex}`
    const binding = this.bindings.get(bindKey)
    if (!binding) return undefined

    const srcKey = outputKey(
      binding.sourceOutput.nodeId,
      binding.sourceOutput.portId,
      binding.sourceOutput.iterationIndex,
    )
    return this.outputs.get(srcKey)?.value
  }

  /**
   * Check if a key has been written.
   */
  hasOutput(nodeId: NodeId, portId: string, iterationIndex: number): boolean {
    const key = outputKey(nodeId, portId, iterationIndex)
    return this.outputs.has(key)
  }

  /**
   * Get a snapshot of all writes for replay.
   */
  getWriteLog(): readonly RunContextWriteLog[] {
    return this.writes
  }
}
