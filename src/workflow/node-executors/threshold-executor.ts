import type { NodeExecutor, ExecutorInput } from "./types"
import { okResult, readConfig, collectVariables } from "./types"

/**
 * Threshold node executor — numeric comparison, routes to above/equal/below.
 * Config: { threshold: number }
 */
export const thresholdExecutor: NodeExecutor = async (input: ExecutorInput) => {
  const { request, services } = input
  const vars = collectVariables(services.runContext)

  const threshold = readConfig<number>(request.config, "threshold") ?? 0
  const value =
    typeof vars["value"] === "number"
      ? vars["value"]
      : typeof vars["in.value"] === "number"
        ? vars["in.value"]
        : 0

  if (value > threshold) {
    return okResult(request.executionId, { "out.above": value })
  } else if (value === threshold) {
    return okResult(request.executionId, { "out.equal": value })
  } else {
    return okResult(request.executionId, { "out.below": value })
  }
}
