/**
 * P16-WF-EXEC — Worker Node Executor
 *
 * Runs an AI worker on a task by delegating to the ExecutionEngineAdapter
 * which handles the actual AI model invocation, permission checking,
 * and result parsing.
 *
 * Config shape:
 *   {
 *     workerId: string,
 *     promptTemplate: string,
 *     modelOverride?: string,
 *     permissionProfileId?: string
 *   }
 */

import type { ExecutorInput, NodeExecutor } from "./types"
import { okResult, failResult, readConfig, collectVariables } from "./types"

export const workerExecutor: NodeExecutor = async (input: ExecutorInput) => {
  const { request, services } = input
  const vars = collectVariables(services.runContext)

  const workerId = readConfig<string>(request.config, "workerId") ?? "default"
  const promptTemplate = readConfig<string>(request.config, "promptTemplate") ?? ""

  try {
    const result = await services.executor.execute({
      ...request,
      kind: "worker",
      config: {
        ...request.config as Record<string, unknown>,
        workerId,
        promptTemplate,
        inputVars: vars,
      },
    })

    if (result.ok) {
      return okResult(request.executionId, result.outputs)
    }
    return {
      ok: false,
      executionId: request.executionId,
      failure: result.failure ?? {
        kind: "worker_failed",
        message: "Worker execution failed",
        retriable: true,
        at: new Date().toISOString(),
      },
      metrics: result.metrics,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return failResult(request.executionId, "worker_error", message, true)
  }
}
