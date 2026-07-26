import type { NodeExecutor, ExecutorInput } from "./types"
import { okResult, readConfig, collectVariables } from "./types"
import type { JsonValue } from "@/core/types"

/**
 * Human approval node executor — pauses and waits for human decision.
 * Config: { prompt: string, timeoutMs?: number }
 *
 * In a real implementation, this would emit an event and wait for a
 * callback. For now, it auto-approves after a short delay.
 */
export const humanApprovalExecutor: NodeExecutor = async (input: ExecutorInput) => {
  const { request, services } = input
  const vars = collectVariables(services.runContext)
  const prompt = readConfig<string>(request.config, "prompt") ?? "Approve?"
  const timeoutMs = readConfig<number>(request.config, "timeoutMs") ?? 30000

  // In real implementation: await services.executor.waitForApproval(request.executionId, prompt)
  await new Promise((resolve) => setTimeout(resolve, Math.min(timeoutMs, 5000)))

  const approved: Record<string, JsonValue> = { approved: true, prompt, ...vars }
  return okResult(request.executionId, { "out": approved })
}
