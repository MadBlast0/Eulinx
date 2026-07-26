/**
 * P16-WF-EXEC — Condition Executor Tests
 */

import { describe, it, expect } from "vitest"
import { conditionExecutor } from "./condition"
import type { ExecutorInput } from "./types"
import type { ExecutionRequest } from "../workflow-types"
import type { Expression } from "../expression-evaluator"
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
  describe("legacy string expression", () => {
    it("routes to out.true when expression is truthy", async () => {
      const input = makeInput({ expression: "x > 5" }, { x: 10 })
      const result = await conditionExecutor(input)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.outputs["out.true"]).toBeDefined()
        expect(result.outputs["out.false"]).toBeUndefined()
      }
    })

    it("routes to out.false when expression is falsy", async () => {
      const input = makeInput({ expression: "x > 5" }, { x: 2 })
      const result = await conditionExecutor(input)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.outputs["out.false"]).toBeDefined()
        expect(result.outputs["out.true"]).toBeUndefined()
      }
    })

    it("supports logical operators and nested vars", async () => {
      const input = makeInput(
        { expression: "(a == 1 && b == 2) || c" },
        { a: 1, b: 99, c: false },
      )
      const result = await conditionExecutor(input)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.outputs["out.false"]).toBeDefined()

      const input2 = makeInput(
        { expression: "(a == 1 && b == 2) || c" },
        { a: 1, b: 2, c: false },
      )
      const result2 = await conditionExecutor(input2)
      expect(result2.ok).toBe(true)
      if (result2.ok) expect(result2.outputs["out.true"]).toBeDefined()
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

  describe("structured expression", () => {
    const makeExpr = (overrides: Partial<Expression> = {}): Expression => ({
      conditions: [
        {
          id: "c1",
          leftValue: "$json.x",
          rightValue: "5",
          dataType: "number",
          operator: "greater_than",
        },
      ],
      combinator: "and",
      ...overrides,
    })

    it("routes to out.true when structured expression matches", async () => {
      const input = makeInput({ structuredExpression: makeExpr() }, { x: 10 })
      const result = await conditionExecutor(input)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.outputs["out.true"]).toBeDefined()
        expect(result.outputs["out.false"]).toBeUndefined()
      }
    })

    it("routes to out.false when structured expression does not match", async () => {
      const input = makeInput({ structuredExpression: makeExpr() }, { x: 2 })
      const result = await conditionExecutor(input)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.outputs["out.false"]).toBeDefined()
        expect(result.outputs["out.true"]).toBeUndefined()
      }
    })

    it("evaluates multiple conditions with and combinator", async () => {
      const expr: Expression = {
        conditions: [
          { id: "c1", leftValue: "$json.x", rightValue: "5", dataType: "number", operator: "greater_than" },
          { id: "c2", leftValue: "$json.y", rightValue: "10", dataType: "number", operator: "greater_than" },
        ],
        combinator: "and",
      }
      const input = makeInput({ structuredExpression: expr }, { x: 10, y: 20 })
      const result = await conditionExecutor(input)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.outputs["out.true"]).toBeDefined()

      const input2 = makeInput({ structuredExpression: expr }, { x: 10, y: 5 })
      const result2 = await conditionExecutor(input2)
      expect(result2.ok).toBe(true)
      if (result2.ok) expect(result2.outputs["out.false"]).toBeDefined()
    })

    it("evaluates multiple conditions with or combinator", async () => {
      const expr: Expression = {
        conditions: [
          { id: "c1", leftValue: "$json.x", rightValue: "5", dataType: "number", operator: "greater_than" },
          { id: "c2", leftValue: "$json.y", rightValue: "10", dataType: "number", operator: "greater_than" },
        ],
        combinator: "or",
      }
      const input = makeInput({ structuredExpression: expr }, { x: 2, y: 20 })
      const result = await conditionExecutor(input)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.outputs["out.true"]).toBeDefined()
    })

    it("supports string contains operator", async () => {
      const expr: Expression = {
        conditions: [
          { id: "c1", leftValue: "$json.name", rightValue: "hello", dataType: "string", operator: "contains" },
        ],
        combinator: "and",
      }
      const input = makeInput({ structuredExpression: expr }, { name: "say hello world" })
      const result = await conditionExecutor(input)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.outputs["out.true"]).toBeDefined()
    })

    it("supports boolean is_true operator", async () => {
      const expr: Expression = {
        conditions: [
          { id: "c1", leftValue: "$json.active", rightValue: "", dataType: "boolean", operator: "is_true" },
        ],
        combinator: "and",
      }
      const inputTrue = makeInput({ structuredExpression: expr }, { active: true })
      const resultTrue = await conditionExecutor(inputTrue)
      expect(resultTrue.ok).toBe(true)
      if (resultTrue.ok) expect(resultTrue.outputs["out.true"]).toBeDefined()

      const inputFalse = makeInput({ structuredExpression: expr }, { active: false })
      const resultFalse = await conditionExecutor(inputFalse)
      expect(resultFalse.ok).toBe(true)
      if (resultFalse.ok) expect(resultFalse.outputs["out.false"]).toBeDefined()
    })
  })

  describe("priority", () => {
    it("structuredExpression takes precedence over expression", async () => {
      const expr: Expression = {
        conditions: [
          { id: "c1", leftValue: "$json.x", rightValue: "100", dataType: "number", operator: "greater_than" },
        ],
        combinator: "and",
      }
      // x=10 fails the structured expression but "x > 5" would pass the string expression
      const input = makeInput(
        { structuredExpression: expr, expression: "x > 5" },
        { x: 10 },
      )
      const result = await conditionExecutor(input)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.outputs["out.false"]).toBeDefined()
    })
  })
})
