import type { NodeExecutor, ExecutorInput } from "./types"
import { okResult, failResult, readConfig, collectVariables } from "./types"
import type { JsonValue } from "@/core/types"

/**
 * Code node executor — runs a sandboxed JS expression.
 * Config: { code: string }
 *
 * SECURITY: The code runs in a limited scope. Only `input` and `JSON` are available.
 */
export const codeExecutor: NodeExecutor = async (input: ExecutorInput) => {
  const { request, services } = input
  const vars = collectVariables(services.runContext)

  const code = readConfig<string>(request.config, "code")
  if (!code) {
    return failResult(request.executionId, "code_missing", "No code expression provided", false)
  }

  try {
    const fn = new Function("input", "JSON", `return (${code})`)
    const result = fn(vars, JSON) as JsonValue
    return okResult(request.executionId, { "out": result, "out.result": result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return failResult(request.executionId, "code_error", `Code execution failed: ${message}`, false)
  }
}
