/**
 * P16-WF-EXEC — Orchestrator Node Executor
 *
 * Plans or replans the workflow by delegating to the ExecutionEngineAdapter.
 * When allowDynamicMutation is true, may emit a mutationRequest.
 *
 * Config shape:
 *   {
 *     orchestratorId: string,
 *     strategy: string,
 *     allowDynamicMutation: boolean
 *   }
 */

import type { ExecutorInput, NodeExecutor } from "./types"
import { okResult, failResult, readConfig, collectVariables } from "./types"

export const orchestratorExecutor: NodeExecutor = async (input: ExecutorInput) => {
  const { request, services } = input
  const vars = collectVariables(services.runContext)

  const orchestratorId = readConfig<string>(request.config, "orchestratorId") ?? "default"
  const strategy = readConfig<string>(request.config, "strategy") ?? "sequential"

  try {
    const result = await services.executor.execute({
      ...request,
      kind: "orchestrator",
      config: {
        ...request.config as Record<string, unknown>,
        orchestratorId,
        strategy,
        goal: vars["in.goal"] ?? vars["goal"] ?? "",
      },
    })

    if (result.ok) {
      return okResult(request.executionId, result.outputs)
    }
    return {
      ok: false,
      executionId: request.executionId,
      failure: result.failure ?? {
        kind: "orchestrator_failed",
        message: "Planning failed",
        retriable: true,
        at: new Date().toISOString(),
      },
      metrics: result.metrics,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return failResult(request.executionId, "orchestrator_error", message, true)
  }
}
