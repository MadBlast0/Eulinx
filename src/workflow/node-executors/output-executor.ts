import type { NodeExecutor, ExecutorInput } from "./types"
import { okResult, readConfig, collectVariables } from "./types"

/**
 * Output node executor — marks the run complete and publishes the result.
 * Config: { resultField?: string }
 */
export const outputExecutor: NodeExecutor = async (input: ExecutorInput) => {
  const { request, services } = input
  const vars = collectVariables(services.runContext)
  const resultField = readConfig<string>(request.config, "resultField")

  const result = resultField ? vars[resultField] ?? vars : vars
  return okResult(request.executionId, { "result": result })
}
