import type { NodeExecutor, ExecutorInput } from "./types"
import { okResult, readConfig, collectVariables } from "./types"
import type { JsonValue } from "@/core/types"

/**
 * Set node executor — sets/modifies fields on the data object.
 * Config: { fields: Record<string, JsonValue>, mode: "set" | "append" | "remove" }
 */
export const setExecutor: NodeExecutor = async (input: ExecutorInput) => {
  const { request, services } = input
  const vars = collectVariables(services.runContext)

  const fields = readConfig<Record<string, JsonValue>>(request.config, "fields") ?? {}
  const mode = readConfig<string>(request.config, "mode") ?? "set"

  const result = { ...vars }

  if (mode === "set" || mode === "append") {
    for (const [key, value] of Object.entries(fields)) {
      result[key] = value
    }
  } else if (mode === "remove") {
    const filtered: Record<string, JsonValue> = {}
    for (const [k, v] of Object.entries(result)) {
      if (!Object.keys(fields).includes(k)) {
        filtered[k] = v
      }
    }
    Object.assign(result, filtered)
  }

  return okResult(request.executionId, { "out": result, "out.value": result })
}
