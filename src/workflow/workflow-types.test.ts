/**
 * P16-WF — Workflow Types Tests
 */

import { describe, it, expect } from "vitest"
import {
  isNodeTerminal,
  isRunTerminal,
  NODE_STATE_TERMINAL,
  RUN_STATE_TERMINAL,
} from "./workflow-types"

describe("isNodeTerminal", () => {
  it("returns true for succeeded", () => {
    expect(isNodeTerminal("succeeded")).toBe(true)
  })

  it("returns true for failed", () => {
    expect(isNodeTerminal("failed")).toBe(true)
  })

  it("returns true for skipped", () => {
    expect(isNodeTerminal("skipped")).toBe(true)
  })

  it("returns true for cancelled", () => {
    expect(isNodeTerminal("cancelled")).toBe(true)
  })

  it("returns false for pending", () => {
    expect(isNodeTerminal("pending")).toBe(false)
  })

  it("returns false for ready", () => {
    expect(isNodeTerminal("ready")).toBe(false)
  })

  it("returns false for running", () => {
    expect(isNodeTerminal("running")).toBe(false)
  })
})

describe("isRunTerminal", () => {
  it("returns true for succeeded", () => {
    expect(isRunTerminal("succeeded")).toBe(true)
  })

  it("returns true for failed", () => {
    expect(isRunTerminal("failed")).toBe(true)
  })

  it("returns true for cancelled", () => {
    expect(isRunTerminal("cancelled")).toBe(true)
  })

  it("returns false for running", () => {
    expect(isRunTerminal("running")).toBe(false)
  })

  it("returns false for paused", () => {
    expect(isRunTerminal("paused")).toBe(false)
  })

  it("returns false for created", () => {
    expect(isRunTerminal("created")).toBe(false)
  })
})

describe("terminal state arrays", () => {
  it("NODE_STATE_TERMINAL contains exactly 4 states", () => {
    expect(NODE_STATE_TERMINAL).toHaveLength(4)
  })

  it("RUN_STATE_TERMINAL contains exactly 3 states", () => {
    expect(RUN_STATE_TERMINAL).toHaveLength(3)
  })
})
