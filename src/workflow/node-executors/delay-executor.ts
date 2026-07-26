import type { NodeExecutor, ExecutorInput } from "./types"
import { okResult, readConfig, collectVariables } from "./types"

/**
 * Delay node executor — waits for a specified duration.
 * Config: { durationMs: number }
 */
export const delayExecutor: NodeExecutor = async (input: ExecutorInput) => {
  const { request, services } = input
  const vars = collectVariables(services.runContext)
  const durationMs = readConfig<number>(request.config, "durationMs") ?? 1000

  await new Promise((resolve) => setTimeout(resolve, Math.min(durationMs, 300000)))

  return okResult(request.executionId, { "out": vars })
}
