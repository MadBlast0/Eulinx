import { describe, it, expect, vi } from "vitest"
import {
  RuntimeStateMachine,
  RUNTIME_ACCEPTING,
  RUNTIME_ACTIVE,
  RUNTIME_BLOCKED,
} from "./runtime-state"

describe("RuntimeStateMachine", () => {
  it("starts in uninitialized state", () => {
    const sm = new RuntimeStateMachine()
    expect(sm.state).toBe("uninitialized")
  })

  it("transitions from uninitialized to starting", () => {
    const sm = new RuntimeStateMachine()
    const result = sm.transition("starting")
    expect(result.ok).toBe(true)
    expect(sm.state).toBe("starting")
  })

  it("rejects invalid transitions", () => {
    const sm = new RuntimeStateMachine()
    const result = sm.transition("running")
    expect(result.ok).toBe(false)
    expect(sm.state).toBe("uninitialized")
  })

  it("follows full lifecycle: uninitialized → starting → ready → running", () => {
    const sm = new RuntimeStateMachine()
    expect(sm.transition("starting").ok).toBe(true)
    expect(sm.transition("ready").ok).toBe(true)
    expect(sm.transition("running").ok).toBe(true)
    expect(sm.state).toBe("running")
  })

  it("can pause and resume", () => {
    const sm = new RuntimeStateMachine()
    sm.transition("starting")
    sm.transition("ready")
    sm.transition("running")
    expect(sm.transition("paused").ok).toBe(true)
    expect(sm.state).toBe("paused")
    expect(sm.transition("running").ok).toBe(true)
    expect(sm.state).toBe("running")
  })

  it("can stop from running", () => {
    const sm = new RuntimeStateMachine()
    sm.transition("starting")
    sm.transition("ready")
    sm.transition("running")
    expect(sm.transition("stopping").ok).toBe(true)
    expect(sm.state).toBe("stopping")
    expect(sm.transition("stopped").ok).toBe(true)
    expect(sm.state).toBe("stopped")
  })

  it("can restart from stopped", () => {
    const sm = new RuntimeStateMachine()
    sm.transition("starting")
    sm.transition("ready")
    sm.transition("running")
    sm.transition("stopping")
    sm.transition("stopped")
    expect(sm.transition("starting").ok).toBe(true)
    expect(sm.state).toBe("starting")
  })

  it("enters recovery from running", () => {
    const sm = new RuntimeStateMachine()
    sm.transition("starting")
    sm.transition("ready")
    sm.transition("running")
    expect(sm.transition("recovery").ok).toBe(true)
    expect(sm.state).toBe("recovery")
  })

  it("calls onTransition callback", () => {
    const callback = vi.fn()
    const sm = new RuntimeStateMachine(callback)
    sm.transition("starting")
    expect(callback).toHaveBeenCalledWith("uninitialized", "starting")
  })

  it("reports canAcceptCommands correctly", () => {
    const sm = new RuntimeStateMachine()
    expect(sm.canAcceptCommands).toBe(false) // uninitialized
    sm.transition("starting")
    expect(sm.canAcceptCommands).toBe(false) // starting
    sm.transition("ready")
    expect(sm.canAcceptCommands).toBe(true) // ready
    sm.transition("running")
    expect(sm.canAcceptCommands).toBe(true) // running
    sm.transition("paused")
    expect(sm.canAcceptCommands).toBe(true) // paused
  })

  it("reports isActive correctly", () => {
    const sm = new RuntimeStateMachine()
    sm.transition("starting")
    sm.transition("ready")
    sm.transition("running")
    expect(sm.isActive).toBe(true)
    sm.transition("paused")
    expect(sm.isActive).toBe(false)
  })

  it("reports isBlocked correctly", () => {
    const sm = new RuntimeStateMachine()
    expect(sm.isBlocked).toBe(true) // uninitialized is blocked
    sm.transition("starting")
    expect(sm.isBlocked).toBe(true) // starting is blocked
    sm.transition("ready")
    expect(sm.isBlocked).toBe(false) // ready is not blocked
  })

  it("resets to initial state", () => {
    const sm = new RuntimeStateMachine()
    sm.transition("starting")
    sm.transition("ready")
    sm.transition("running")
    sm.reset()
    expect(sm.state).toBe("uninitialized")
  })

  it("canTransition returns correct boolean", () => {
    const sm = new RuntimeStateMachine()
    expect(sm.canTransition("starting")).toBe(true)
    expect(sm.canTransition("running")).toBe(false)
  })

  it("allows degraded → running transition", () => {
    const sm = new RuntimeStateMachine()
    sm.transition("starting")
    sm.transition("ready")
    sm.transition("running")
    sm.transition("degraded")
    expect(sm.state).toBe("degraded")
    expect(sm.transition("running").ok).toBe(true)
    expect(sm.state).toBe("running")
  })

  it("allows failed → recovery transition", () => {
    const sm = new RuntimeStateMachine()
    sm.transition("starting")
    sm.transition("failed")
    expect(sm.transition("recovery").ok).toBe(true)
    expect(sm.state).toBe("recovery")
  })
})

describe("RUNTIME_ACCEPTING", () => {
  it("includes ready, running, paused, degraded", () => {
    expect(RUNTIME_ACCEPTING).toContain("ready")
    expect(RUNTIME_ACCEPTING).toContain("running")
    expect(RUNTIME_ACCEPTING).toContain("paused")
    expect(RUNTIME_ACCEPTING).toContain("degraded")
  })
})

describe("RUNTIME_ACTIVE", () => {
  it("includes running and degraded", () => {
    expect(RUNTIME_ACTIVE).toContain("running")
    expect(RUNTIME_ACTIVE).toContain("degraded")
  })
})

describe("RUNTIME_BLOCKED", () => {
  it("includes uninitialized, starting, stopping, stopped, failed, recovery", () => {
    expect(RUNTIME_BLOCKED).toContain("uninitialized")
    expect(RUNTIME_BLOCKED).toContain("starting")
    expect(RUNTIME_BLOCKED).toContain("stopping")
    expect(RUNTIME_BLOCKED).toContain("stopped")
    expect(RUNTIME_BLOCKED).toContain("failed")
    expect(RUNTIME_BLOCKED).toContain("recovery")
  })
})
