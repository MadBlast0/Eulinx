/**
 * P16-WF — RunContext Tests
 */

import { describe, it, expect } from "vitest"
import { RunContext, outputKey } from "./run-context"
import type { NodeId, EdgeId, WorkflowRunId } from "./workflow-types"

describe("RunContext", () => {
  function makeContext(): RunContext {
    return new RunContext("run1" as WorkflowRunId, 1)
  }

  it("writes and reads output values", () => {
    const ctx = makeContext()
    const result = ctx.writeOutput(
      "A" as NodeId,
      "out",
      0,
      { greeting: "hello" },
      "e1" as EdgeId,
      20,
    )
    expect(result.ok).toBe(true)

    const value = ctx.readOutput("A" as NodeId, "out", 0)
    expect(value).toBeDefined()
    expect(value!.value).toEqual({ greeting: "hello" })
  })

  it("rejects duplicate writes (write-once)", () => {
    const ctx = makeContext()
    ctx.writeOutput("A" as NodeId, "out", 0, "first", "e1" as EdgeId, 5)
    const result = ctx.writeOutput("A" as NodeId, "out", 0, "second", "e1" as EdgeId, 6)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("context_write_conflict")
    }
  })

  it("allows writes to different ports", () => {
    const ctx = makeContext()
    const r1 = ctx.writeOutput("A" as NodeId, "out1", 0, "val1", "e1" as EdgeId, 4)
    const r2 = ctx.writeOutput("A" as NodeId, "out2", 0, "val2", "e2" as EdgeId, 4)
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
  })

  it("allows writes to different iteration indices", () => {
    const ctx = makeContext()
    const r1 = ctx.writeOutput("A" as NodeId, "out", 0, "iter0", "e1" as EdgeId, 5)
    const r2 = ctx.writeOutput("A" as NodeId, "out", 1, "iter1", "e1" as EdgeId, 5)
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
  })

  it("binds and resolves input", () => {
    const ctx = makeContext()
    ctx.writeOutput("A" as NodeId, "out", 0, 42, "e1" as EdgeId, 2)
    ctx.bindInput("B" as NodeId, "in", 0, {
      nodeId: "A" as NodeId,
      portId: "out",
      iterationIndex: 0,
    })

    const value = ctx.resolveInput("B" as NodeId, "in", 0)
    expect(value).toBe(42)
  })

  it("returns undefined for unbound input", () => {
    const ctx = makeContext()
    const value = ctx.resolveInput("B" as NodeId, "in", 0)
    expect(value).toBeUndefined()
  })

  it("hasOutput returns true after write", () => {
    const ctx = makeContext()
    expect(ctx.hasOutput("A" as NodeId, "out", 0)).toBe(false)
    ctx.writeOutput("A" as NodeId, "out", 0, "val", "e1" as EdgeId, 3)
    expect(ctx.hasOutput("A" as NodeId, "out", 0)).toBe(true)
  })

  it("tracks write log", () => {
    const ctx = makeContext()
    ctx.writeOutput("A" as NodeId, "out", 0, "val1", "e1" as EdgeId, 4)
    ctx.writeOutput("B" as NodeId, "out", 0, "val2", "e2" as EdgeId, 4)
    const log = ctx.getWriteLog()
    expect(log).toHaveLength(2)
    expect(log[0]!.edgeId).toBe("e1")
    expect(log[1]!.edgeId).toBe("e2")
  })

  it("increments version on each write", () => {
    const ctx = makeContext()
    expect(ctx.version).toBe(0)
    ctx.writeOutput("A" as NodeId, "out", 0, "v1", "e1" as EdgeId, 2)
    expect(ctx.version).toBe(1)
    ctx.writeOutput("A" as NodeId, "out2", 0, "v2", "e2" as EdgeId, 2)
    expect(ctx.version).toBe(2)
  })
})

describe("outputKey", () => {
  it("produces correct key format", () => {
    const key = outputKey("node1" as NodeId, "port1", 0)
    expect(key).toBe("node1:port1:0")
  })

  it("includes iteration index", () => {
    const key = outputKey("node1" as NodeId, "port1", 3)
    expect(key).toBe("node1:port1:3")
  })
})
