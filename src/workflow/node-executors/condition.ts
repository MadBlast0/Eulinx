/**
 * P16-WF-EXEC — Condition Node Executor
 *
 * Evaluates a real expression over RunContext variables. The engine uses the
 * resulting boolean to decide which outgoing branch to take; non-taken
 * branches are skipped based on the evaluated condition, not just upstream
 * success.
 *
 * Config shape:
 *   { expression: string }  // evaluated against vars.*
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

export const conditionExecutor: NodeExecutor = async (
  input: ExecutorInput,
): Promise<WorkflowNodeResult> => {
  const { request, services } = input
  const expression = readConfig<string>(request.config, "expression")

  if (typeof expression !== "string" || expression.trim().length === 0) {
    return failResult(request.executionId, "condition_no_expression", "Condition node missing expression")
  }

  const scope = collectVariables(services.runContext)

  let taken: boolean
  try {
    taken = evaluateExpression(expression, scope)
  } catch (error) {
    const message = error instanceof ExpressionError ? error.message : String(error)
    return failResult(request.executionId, "condition_eval_error", `Expression error: ${message}`)
  }

  return okResult(request.executionId, {
    condition_result: taken,
    expression,
  })
}
