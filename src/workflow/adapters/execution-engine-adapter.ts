/**
 * P16-WF-ADAPTER — Execution Engine Adapter (production)
 *
 * Wraps the real `ExecutionEngine` (src/runtime/services/execution-engine.ts)
 * to execute workflow node runs. The ExecutionEngine is a generic task
 * runner; this adapter encodes the ExecutionRequest into a task string and
 * resolves the WorkflowNodeResult from the queued execution.
 */

import type { ExecutionRequest, WorkflowNodeResult } from "../workflow-types"
import type { ExecutionEngineAdapter as ExecutionEngineAdapterIface } from "../workflow-engine"
import type { ExecutionEngine } from "@/runtime/services/execution-engine"
import type { ExecutionInfo, ExecutionState } from "@/runtime/services/types"
import type { ExecutionId } from "@/core/types"

export class ExecutionEngineAdapter implements ExecutionEngineAdapterIface {
  constructor(private readonly engine: ExecutionEngine) {}

  async execute(request: ExecutionRequest): Promise<WorkflowNodeResult> {
    const task = JSON.stringify({
      executionId: request.executionId,
      runId: request.runId,
      nodeId: request.nodeId,
      iterationIndex: request.iterationIndex,
      kind: request.kind,
    })

    const info = this.engine.execute(task)
    const executionId = info.executionId

    // Wait for the queued execution to complete. The ExecutionEngine completes
    // asynchronously via setTimeout; we poll its status until terminal.
    const finalState = await this.waitForCompletion(executionId)

    if (finalState === "failed") {
      return {
        ok: false,
        executionId: request.executionId,
        failure: {
          kind: "execution_engine_failed",
          message: "Execution engine reported failure",
          retriable: true,
          at: new Date().toISOString(),
        },
        metrics: { durationMs: 0, tokensUsed: 0, costUsd: 0, toolCalls: 0 },
      }
    }

    // The ExecutionEngine does not carry a typed result payload; production
    // wiring returns node outputs via the executor dispatch (node-executors).
    // Here we surface a successful no-op result so the engine state machine
    // continues. Real per-kind behavior is provided by NodeExecutor dispatch.
    return {
      ok: true,
      executionId: request.executionId,
      outputs: {},
      metrics: { durationMs: 0, tokensUsed: 0, costUsd: 0, toolCalls: 0 },
    }
  }

  async status(executionId: string): Promise<"running" | "completed" | "failed" | "unknown"> {
    const info = this.engine.getStatus(executionId as ExecutionId)
    if (!info) return "unknown"
    const state = info.state
    if (state === "completed") return "completed"
    if (state === "failed" || state === "cancelled") return "failed"
    return "running"
  }

  async cancel(executionId: string): Promise<void> {
    this.engine.cancel(executionId as ExecutionId)
  }

  private waitForCompletion(executionId: ExecutionId): Promise<ExecutionState> {
    return new Promise((resolve) => {
      const poll = (): void => {
        const info: ExecutionInfo | undefined = this.engine.getStatus(executionId)
        if (!info) return resolve("failed")
        if (info.state === "completed" || info.state === "failed" || info.state === "cancelled") {
          return resolve(info.state)
        }
        setTimeout(poll, 5)
      }
      poll()
    })
  }
}
