/**
 * P06-SPAWN-MANAGER — Worker Lifecycle Tests
 */

import { describe, it, expect } from "vitest"
import { RECOVERY_TABLE, createLifecycleRecord } from "./worker-lifecycle"

describe("RECOVERY_TABLE", () => {
  it("covers all non-terminated states", () => {
    const expectedStates = [
      "requested", "queued", "spawning", "initializing",
      "idle", "working", "waiting", "blocked", "paused",
      "failing", "terminating", "zombie",
    ]
    for (const state of expectedStates) {
      expect(RECOVERY_TABLE.has(state as never)).toBe(true)
    }
  })

  it("requested -> re_admit", () => {
    const action = RECOVERY_TABLE.get("requested")
    expect(action?.action).toBe("re_admit")
  })

  it("queued -> re_enqueue", () => {
    const action = RECOVERY_TABLE.get("queued")
    expect(action?.action).toBe("re_enqueue")
  })

  it("spawning -> fatal_error", () => {
    const action = RECOVERY_TABLE.get("spawning")
    expect(action?.action).toBe("fatal_error")
  })

  it("idle -> fatal_error", () => {
    const action = RECOVERY_TABLE.get("idle")
    expect(action?.action).toBe("fatal_error")
  })

  it("working -> fatal_error", () => {
    const action = RECOVERY_TABLE.get("working")
    expect(action?.action).toBe("fatal_error")
  })

  it("failing -> cleanup_done", () => {
    const action = RECOVERY_TABLE.get("failing")
    expect(action?.action).toBe("cleanup_done")
  })

  it("terminating -> cleanup_done", () => {
    const action = RECOVERY_TABLE.get("terminating")
    expect(action?.action).toBe("cleanup_done")
  })

  it("zombie -> sweep", () => {
    const action = RECOVERY_TABLE.get("zombie")
    expect(action?.action).toBe("sweep")
  })

  it("terminated is not in the recovery table", () => {
    expect(RECOVERY_TABLE.has("terminated")).toBe(false)
  })
})

describe("createLifecycleRecord", () => {
  it("creates a record with requested state", () => {
    const record = createLifecycleRecord({
      workerId: "wkr_001",
      workspaceId: "ws_001",
      sessionId: "ses_001",
    })
    expect(record.workerId).toBe("wkr_001")
    expect(record.workspaceId).toBe("ws_001")
    expect(record.sessionId).toBe("ses_001")
    expect(record.state).toBe("requested")
    expect(record.transitionSeq).toBe(0)
    expect(record.missedHeartbeats).toBe(0)
    expect(record.health).toBe("unknown")
    expect(record.restartGeneration).toBe(0)
  })

  it("includes process and terminal IDs when provided", () => {
    const record = createLifecycleRecord({
      workerId: "wkr_001",
      workspaceId: "ws_001",
      sessionId: "ses_001",
      processId: "proc_001",
      terminalId: "term_001",
    })
    expect(record.processId).toBe("proc_001")
    expect(record.terminalId).toBe("term_001")
  })
})
