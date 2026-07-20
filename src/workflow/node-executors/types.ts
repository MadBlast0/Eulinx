/**
 * P16-WF-EXEC — Node Executor Infrastructure
 *
 * Per-kind execution for workflow nodes. Each executor receives an
 * ExecutionRequest plus a richer execution context (run context, adapters,
 * services) and returns a WorkflowNodeResult.
 *
 * Executors are pure-ish: they read inputs from the RunContext, perform the
 * kind-specific work, and return outputs. Skipping of non-taken branches is
 * the engine's responsibility (driven by the condition evaluator here).
 */

import type {
  ExecutionRequest,
  WorkflowNodeResult,
  NodeId,
} from "../workflow-types"
import type { JsonValue, ArtifactId } from "@/core/types"
import type { RunContext } from "../run-context"
import type { SchedulerAdapter, ExecutionEngineAdapter, PersistenceAdapter } from "../workflow-engine"
import type { ArtifactVerification } from "@/artifact/artifact-verify"
import type { ArtifactManager } from "@/artifact/artifact-manager"
import type { MergeManager } from "@/runtime/services/merge-manager"
import type { ArtifactId } from "@/core/types"

/**
 * The MCP tool provider interface that an MCP node executor depends on.
 * Implemented by the Plugin system + MCP task; the executor is real against
 * this interface even before the remote transport exists.
 */
export interface McpToolProvider {
  /** List tool names exposed by a given server. */
  listTools(server: string): Promise<readonly string[]>
  /** Invoke a tool on a server with JSON args, returning JSON output. */
  callTool(server: string, tool: string, args: Record<string, JsonValue>): Promise<JsonValue>
}

/** Services available to node executors. */
export interface ExecutorServices {
  readonly runContext: RunContext
  readonly scheduler: SchedulerAdapter
  readonly executor: ExecutionEngineAdapter
  readonly persistence: PersistenceAdapter
  readonly verification?: ArtifactVerification
  readonly artifactManager?: ArtifactManager
  readonly mergeManager?: MergeManager
  readonly mcp?: McpToolProvider
}

export interface ExecutorInput {
  readonly request: ExecutionRequest
  readonly services: ExecutorServices
}

export type NodeExecutor = (input: ExecutorInput) => Promise<WorkflowNodeResult>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function okResult(
  executionId: string,
  outputs: Record<string, JsonValue>,
): WorkflowNodeResult {
  return {
    ok: true,
    executionId,
    outputs,
    metrics: { durationMs: 0, tokensUsed: 0, costUsd: 0, toolCalls: 0 },
  }
}

export function failResult(
  executionId: string,
  kind: string,
  message: string,
  retriable = true,
): WorkflowNodeResult {
  return {
    ok: false,
    executionId,
    failure: {
      kind,
      message,
      retriable,
      at: new Date().toISOString(),
    },
    metrics: { durationMs: 0, tokensUsed: 0, costUsd: 0, toolCalls: 0 },
  }
}

/** Read a config field with narrowing. */
export function readConfig<T extends JsonValue>(
  config: unknown,
  key: string,
): T | undefined {
  if (config === null || typeof config !== "object" || Array.isArray(config)) return undefined
  const value = (config as Record<string, JsonValue>)[key]
  return value as T | undefined
}

/** Extract all `vars.*` style variables from the run context for evaluation. */
export function collectVariables(context: RunContext): Record<string, JsonValue> {
  const vars: Record<string, JsonValue> = {}
  for (const [key, output] of context.outputs) {
    // key format: nodeId:portId:iterationIndex
    const idx = key.lastIndexOf(":")
    if (idx === -1) continue
    const portAndNode = key.slice(0, idx)
    const nodeIdx = portAndNode.lastIndexOf(":")
    if (nodeIdx === -1) continue
    const nodeId = portAndNode.slice(0, nodeIdx)
    const portId = portAndNode.slice(nodeIdx + 1)
    vars[`${nodeId}.${portId}`] = output.value
    vars[portId] = output.value
  }
  return vars
}

export type { NodeId }
