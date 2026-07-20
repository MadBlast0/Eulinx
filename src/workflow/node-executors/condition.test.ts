/**
 * P16-WF-EXEC — Condition Executor Tests
 */

import { describe, it, expect } from "vitest"
import { conditionExecutor } from "./condition"
import type { ExecutorInput } from "./types"
import type { ExecutionRequest } from "../workflow-types"
import { RunContext } from "../run-context"

function makeRequest(config: unknown, inputs: Record<string, unknown> = {}): ExecutionRequest {
  return {
    executionId: "exec_1",
    runId: "run_1" as never,
    nodeId: "cond_1" as never,
    iterationIndex: 0,
    attempt: 1,
    kind: "condition",
    config,
    inputs: inputs as Record<string, never>,
    workspaceId: "ws_1" as never,
    projectId: "p_1",
    sessionId: "s_1",
    ownerRef: { kind: "workflow_node", runId: "run_1", nodeId: "cond_1" },
    timeoutMs: 1000,
    deterministicSeed: "seed",
    mode: "normal",
  }
}

function makeInput(config: unknown, vars: Record<string, unknown>): ExecutorInput {
  const context = new RunContext("run_1" as never, 1)
  for (const [portId, value] of Object.entries(vars)) {
    context.writeOutput("src" as never, portId, 0, value as never, "edge" as never, JSON.stringify(value).length)
  }
  return {
    request: makeRequest(config),
    services: {
      runContext: context,
      scheduler: {} as never,
      executor: {} as never,
      persistence: {} as never,
    },
  }
}

describe("conditionExecutor", () => {
  it("selects true branch when expression is truthy", async () => {
    const input = makeInput({ expression: "x > 5" }, { x: 10 })
    const result = await conditionExecutor(input)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.outputs.condition_result).toBe(true)
    }
  })

  it("selects false branch when expression is falsy", async () => {
    const input = makeInput({ expression: "x > 5" }, { x: 2 })
    const result = await conditionExecutor(input)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.outputs.condition_result).toBe(false)
    }
  })

  it("supports logical operators and nested vars", async () => {
    const input = makeInput(
      { expression: "(a == 1 && b == 2) || c" },
      { a: 1, b: 99, c: false },
    )
    const result = await conditionExecutor(input)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.outputs.condition_result).toBe(false)

    const input2 = makeInput(
      { expression: "(a == 1 && b == 2) || c" },
      { a: 1, b: 2, c: false },
    )
    const result2 = await conditionExecutor(input2)
    expect(result2.ok).toBe(true)
    if (result2.ok) expect(result2.outputs.condition_result).toBe(true)
  })

  it("fails on missing expression", async () => {
    const input = makeInput({}, {})
    const result = await conditionExecutor(input)
    expect(result.ok).toBe(false)
  })

  it("fails on invalid expression", async () => {
    const input = makeInput({ expression: "x >" }, { x: 1 })
    const result = await conditionExecutor(input)
    expect(result.ok).toBe(false)
  })
})
