/**
 * P16-WF-EXEC — Condition Node Executor
 *
 * Evaluates a real expression over RunContext variables. The engine uses the
 * resulting boolean to decide which outgoing branch to take; non-taken
 * branches are skipped based on the evaluated condition, not just upstream
 * success.
 *
 * Supports two config shapes:
 *   { expression: string }                          // legacy string expression
 *   { structuredExpression: Expression }             // n8n-style structured expression
 */

import type { WorkflowNodeResult } from "../workflow-types"
import {
  type ExecutorInput,
  type NodeExecutor,
  okResult,
  failResult,
  collectVariables,
  readConfig,
} from "./types"
import { evaluateExpression, ExpressionError } from "./expression"
import { evaluate as evaluateStructured, type Expression } from "../expression-evaluator"

export const conditionExecutor: NodeExecutor = async (
  input: ExecutorInput,
): Promise<WorkflowNodeResult> => {
  const { request, services } = input
  const flatVars = collectVariables(services.runContext)

  // Structured expression (n8n-style) takes priority
  const cfg = request.config as Record<string, unknown> | undefined
  const structuredExpr = cfg?.structuredExpression as Expression | undefined
  if (structuredExpr) {
    // Wrap in { json: vars } so $json.fieldName references resolve correctly
    const structuredCtx = { json: flatVars } as Record<string, unknown>
    let taken: boolean
    try {
      taken = evaluateStructured(structuredExpr, structuredCtx)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return failResult(request.executionId, "condition_eval_error", `Expression error: ${message}`)
    }
    return taken
      ? okResult(request.executionId, { "out.true": flatVars })
      : okResult(request.executionId, { "out.false": flatVars })
  }

  // Legacy string expression fallback
  const expression = readConfig<string>(request.config, "expression")

  if (typeof expression !== "string" || expression.trim().length === 0) {
    return failResult(request.executionId, "condition_no_expression", "Condition node missing expression")
  }

  let taken: boolean
  try {
    taken = evaluateExpression(expression, flatVars)
  } catch (error) {
    const message = error instanceof ExpressionError ? error.message : String(error)
    return failResult(request.executionId, "condition_eval_error", `Expression error: ${message}`)
  }

  return taken
    ? okResult(request.executionId, { "out.true": flatVars })
    : okResult(request.executionId, { "out.false": flatVars })
}
