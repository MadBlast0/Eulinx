/**
 * P16-WF-EXEC — Tool Node Executor
 *
 * Invokes a registered tool by delegating to the ExecutionEngineAdapter.
 * Enforces a configurable timeout to prevent runaway tool calls.
 *
 * Config shape:
 *   {
 *     toolId: string,
 *     timeoutMs?: number
 *   }
 */

import type { ExecutorInput, NodeExecutor } from "./types"
import { okResult, failResult, readConfig, collectVariables } from "./types"

export const toolExecutor: NodeExecutor = async (input: ExecutorInput) => {
  const { request, services } = input
  const vars = collectVariables(services.runContext)

  const toolId = readConfig<string>(request.config, "toolId")
  if (!toolId) {
    return failResult(request.executionId, "tool_not_found", "No toolId specified", false)
  }

  const timeoutMs = readConfig<number>(request.config, "timeoutMs") ?? 30000

  try {
    const result = await Promise.race([
      services.executor.execute({
        ...request,
        kind: "tool",
        config: {
          ...request.config as Record<string, unknown>,
          toolId,
          args: vars["in.args"] ?? vars["args"] ?? {},
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Tool execution timeout")), timeoutMs),
      ),
    ])

    if (result.ok) {
      return okResult(request.executionId, result.outputs)
    }
    return {
      ok: false,
      executionId: request.executionId,
      failure: result.failure ?? {
        kind: "tool_error",
        message: "Tool execution failed",
        retriable: true,
        at: new Date().toISOString(),
      },
      metrics: result.metrics,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const retriable = message.includes("timeout")
    return failResult(request.executionId, "tool_error", message, retriable)
  }
}
