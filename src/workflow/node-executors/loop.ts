/**
 * P16-WF-EXEC — Loop Node Executor
 *
 * Implements iteration: for-each over an array in context, or while with a
 * termination guard. Accumulates per-iteration values, supports break
 * (early exit) and continue (skip an iteration). Uses the existing loop_back
 * edge semantics: the loop node computes the iteration plan and exposes
 * control outputs consumed by downstream body nodes.
 *
 * Config shape (for-each):
 *   {
 *     mode: "for_each",
 *     source: string,          // var name holding an array (vars.*)
 *     breakWhen?: string,      // expression; break if truthy (vars: index, value, item)
 *     continueWhen?: string,   // expression; skip accumulation if truthy
 *     maxIterations?: number   // safety cap
 *   }
 *
 * Config shape (while):
 *   {
 *     mode: "while",
 *     maxIterations: number,   // required termination guard
 *     breakWhen?: string       // expression; break if truthy (vars: index)
 *   }
 */

import type { JsonValue } from "@/core/types"
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

const DEFAULT_MAX_ITERATIONS = 1000

export const loopExecutor: NodeExecutor = async (
  input: ExecutorInput,
): Promise<WorkflowNodeResult> => {
  const { request } = input
  const config = request.config
  const mode = readConfig<string>(config, "mode") ?? "for_each"

  const maxIterationsRaw = readConfig<number>(config, "maxIterations")
  const maxIterations =
    typeof maxIterationsRaw === "number" && maxIterationsRaw > 0
      ? Math.floor(maxIterationsRaw)
      : DEFAULT_MAX_ITERATIONS

  const breakWhen = readConfig<string>(config, "breakWhen")
  const continueWhen = readConfig<string>(config, "continueWhen")

  const scope = collectVariables(input.services.runContext)

  const items: JsonValue[] = []
  let breakIndex: number | null = null
  let completedIterations = 0

  if (mode === "while") {
    let index = 0
    while (index < maxIterations) {
      const iterScope = { ...scope, index: index as JsonValue }
      if (breakWhen) {
        try {
          if (evaluateExpression(breakWhen, iterScope)) {
            breakIndex = index
            break
          }
        } catch (error) {
          return breakEvalError(request.executionId, error)
        }
      }
      items.push(index as JsonValue)
      completedIterations++
      index++
    }
  } else if (mode === "for_each") {
    const sourceName = readConfig<string>(config, "source")
    if (typeof sourceName !== "string") {
      return failResult(request.executionId, "loop_no_source", "for_each loop missing source var")
    }
    const source = scope[sourceName]
    if (!Array.isArray(source)) {
      return failResult(
        request.executionId,
        "loop_source_not_array",
        `Loop source "${sourceName}" is not an array`,
      )
    }

    let index = 0
    for (const element of source) {
      if (index >= maxIterations) {
        breakIndex = index
        break
      }
      const iterScope: Record<string, JsonValue> = {
        ...scope,
        index: index as JsonValue,
        value: element,
        item: element,
      }
      if (continueWhen) {
        try {
          if (evaluateExpression(continueWhen, iterScope)) {
            index++
            continue
          }
        } catch (error) {
          return breakEvalError(request.executionId, error)
        }
      }
      if (breakWhen) {
        try {
          if (evaluateExpression(breakWhen, iterScope)) {
            breakIndex = index
            break
          }
        } catch (error) {
          return breakEvalError(request.executionId, error)
        }
      }
      items.push(element)
      completedIterations++
      index++
    }
  } else {
    return failResult(request.executionId, "loop_unknown_mode", `Unknown loop mode: ${mode}`)
  }

  return okResult(request.executionId, {
    items: items as JsonValue,
    count: items.length as JsonValue,
    completedIterations: completedIterations as JsonValue,
    breakIndex: (breakIndex ?? -1) as JsonValue,
    done: (breakIndex === null) as JsonValue,
  })
}

function breakEvalError(executionId: string, error: unknown): WorkflowNodeResult {
  const message = error instanceof ExpressionError ? error.message : String(error)
  return failResult(executionId, "loop_eval_error", `Loop expression error: ${message}`)
}
