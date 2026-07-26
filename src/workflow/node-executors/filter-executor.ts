import type { NodeExecutor, ExecutorInput } from "./types"
import { okResult, collectVariables } from "./types"
import { evaluate, type Expression } from "../expression-evaluator"

/**
 * Filter node executor — passes items matching condition, drops others.
 * Config: { condition: Expression }
 */
export const filterExecutor: NodeExecutor = async (input: ExecutorInput) => {
  const { request, services } = input
  const vars = collectVariables(services.runContext)

  const cfg = request.config as Record<string, unknown> | undefined
  const condition = cfg?.condition as Expression | undefined
  if (!condition) {
    return okResult(request.executionId, { "out": vars })
  }

  if (evaluate(condition, vars)) {
    return okResult(request.executionId, { "out": vars })
  }

  return okResult(request.executionId, {})
}
