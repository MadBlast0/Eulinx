import type { NodeExecutor, ExecutorInput } from "./types"
import { okResult, readConfig } from "./types"
import type { JsonObject } from "@/core/types"

/**
 * Input node executor — seeds the RunContext with initial values from the trigger.
 * Config: { seedValues: JsonObject }
 */
export const inputExecutor: NodeExecutor = async (input: ExecutorInput) => {
  const { request } = input
  const seedValues = readConfig<JsonObject>(request.config, "seedValues") ?? {}
  return okResult(request.executionId, { "out": seedValues, ...seedValues })
}
