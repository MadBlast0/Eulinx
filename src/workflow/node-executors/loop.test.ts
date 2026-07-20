/**
 * P16-WF-EXEC — Loop Executor Tests
 */

import { describe, it, expect } from "vitest"
import { loopExecutor } from "./loop"
import type { ExecutorInput } from "./types"
import type { ExecutionRequest } from "../workflow-types"
import { RunContext } from "../run-context"

function makeInput(config: unknown, vars: Record<string, unknown> = {}): ExecutorInput {
  const context = new RunContext("run_1" as never, 1)
  for (const [portId, value] of Object.entries(vars)) {
    context.writeOutput("src" as never, portId, 0, value as never, "edge" as never, JSON.stringify(value).length)
  }
  const request: ExecutionRequest = {
    executionId: "exec_1",
    runId: "run_1" as never,
    nodeId: "loop_1" as never,
    iterationIndex: 0,
    attempt: 1,
    kind: "loop",
    config,
    inputs: {},
    workspaceId: "ws_1" as never,
    projectId: "p_1",
    sessionId: "s_1",
    ownerRef: { kind: "workflow_node", runId: "run_1", nodeId: "loop_1" },
    timeoutMs: 1000,
    deterministicSeed: "seed",
    mode: "normal",
  }
  return {
    request,
    services: { runContext: context, scheduler: {} as never, executor: {} as never, persistence: {} as never },
  }
}

describe("loopExecutor", () => {
  it("iterates over an array (for_each)", async () => {
    const input = makeInput(
      { mode: "for_each", source: "items" },
      { items: [1, 2, 3, 4] },
    )
    const result = await loopExecutor(input)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.outputs.count).toBe(4)
      expect(result.outputs.done).toBe(true)
      expect(Array.isArray(result.outputs.items)).toBe(true)
    }
  })

  it("breaks early via breakWhen", async () => {
    const input = makeInput(
      { mode: "for_each", source: "items", breakWhen: "value == 3" },
      { items: [1, 2, 3, 4, 5] },
    )
    const result = await loopExecutor(input)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.outputs.count).toBe(2)
      expect(result.outputs.breakIndex).toBe(2)
      expect(result.outputs.done).toBe(false)
    }
  })

  it("supports continue via continueWhen", async () => {
    const input = makeInput(
      { mode: "for_each", source: "items", continueWhen: "value == 2" },
      { items: [1, 2, 3] },
    )
    const result = await loopExecutor(input)
    expect(result.ok).toBe(true)
    if (result.ok) {
      // value 2 is skipped from accumulation
      expect(result.outputs.count).toBe(2)
    }
  })

  it("iterates N times with while mode and termination guard", async () => {
    const input = makeInput({ mode: "while", maxIterations: 3 })
    const result = await loopExecutor(input)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.outputs.count).toBe(3)
      expect(result.outputs.done).toBe(true)
    }
  })

  it("fails when source is not an array", async () => {
    const input = makeInput({ mode: "for_each", source: "items" }, { items: "not-array" })
    const result = await loopExecutor(input)
    expect(result.ok).toBe(false)
  })
})
