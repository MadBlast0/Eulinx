import type { NodeExecutor, ExecutorInput } from "./types"
import { okResult, collectVariables } from "./types"
import { evaluate, type Expression } from "../expression-evaluator"

/**
 * Switch node executor — evaluates ordered routing rules, routes to first match.
 * Config: { rules: Expression[], outputNames: string[] }
 */
export const switchExecutor: NodeExecutor = async (input: ExecutorInput) => {
  const { request, services } = input
  const vars = collectVariables(services.runContext)

  const cfg = request.config as Record<string, unknown> | undefined
  const rawRules = cfg?.rules
  const rules: Expression[] = Array.isArray(rawRules) ? (rawRules as Expression[]) : []

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]
    if (rule && evaluate(rule, vars)) {
      const portId = `out.${i}`
      return okResult(request.executionId, { [portId]: vars })
    }
  }

  return okResult(request.executionId, { "out.default": vars })
}
