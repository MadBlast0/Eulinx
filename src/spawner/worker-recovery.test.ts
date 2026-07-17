/**
 * P06-SPAWN-RECOVERY — Worker Recovery Tests
 */

import { describe, it, expect } from "vitest"
import {
  determineRecoveryAction,
  runRecoveryPass,
  evaluateEscapedProcess,
  createRecoveryEvent,
} from "./worker-recovery"
import type { RecoveryInput } from "./worker-recovery"

describe("determineRecoveryAction", () => {
  it("re-admits requested workers", () => {
    const result = determineRecoveryAction({ workerId: "wkr_001", state: "requested", restartGeneration: 0 })
    expect(result.action).toBe("re_admit")
    expect(result.incrementGeneration).toBe(true)
    expect(result.setHealthUnknown).toBe(true)
  })

  it("re-enqueues queued workers", () => {
    const result = determineRecoveryAction({ workerId: "wkr_001", state: "queued", restartGeneration: 0 })
    expect(result.action).toBe("re_enqueue")
    expect(result.incrementGeneration).toBe(true)
  })

  it("marks spawning workers as fatal_error", () => {
    const result = determineRecoveryAction({ workerId: "wkr_001", state: "spawning", restartGeneration: 0, osPid: 1234 })
    expect(result.action).toBe("fatal_error")
    expect(result.triggerFatalError).toBe(true)
    expect(result.requiresSweep).toBe(true)
  })

  it("marks idle workers as fatal_error", () => {
    const result = determineRecoveryAction({ workerId: "wkr_001", state: "idle", restartGeneration: 0 })
    expect(result.action).toBe("fatal_error")
  })

  it("marks working workers as fatal_error", () => {
    const result = determineRecoveryAction({ workerId: "wkr_001", state: "working", restartGeneration: 0 })
    expect(result.action).toBe("fatal_error")
  })

  it("marks waiting workers as fatal_error", () => {
    const result = determineRecoveryAction({ workerId: "wkr_001", state: "waiting", restartGeneration: 0 })
    expect(result.action).toBe("fatal_error")
  })

  it("marks blocked workers as fatal_error", () => {
    const result = determineRecoveryAction({ workerId: "wkr_001", state: "blocked", restartGeneration: 0 })
    expect(result.action).toBe("fatal_error")
  })

  it("marks paused workers as fatal_error", () => {
    const result = determineRecoveryAction({ workerId: "wkr_001", state: "paused", restartGeneration: 0 })
    expect(result.action).toBe("fatal_error")
  })

  it("resumes failing workers with cleanup_done", () => {
    const result = determineRecoveryAction({ workerId: "wkr_001", state: "failing", restartGeneration: 0 })
    expect(result.action).toBe("cleanup_done")
    expect(result.newState).toBe("terminating")
  })

  it("resumes terminating workers with cleanup_done", () => {
    const result = determineRecoveryAction({ workerId: "wkr_001", state: "terminating", restartGeneration: 0 })
    expect(result.action).toBe("cleanup_done")
    expect(result.newState).toBe("terminating")
  })

  it("sweeps zombie workers", () => {
    const result = determineRecoveryAction({ workerId: "wkr_001", state: "zombie", restartGeneration: 0, osPid: 1234 })
    expect(result.action).toBe("sweep")
    expect(result.requiresSweep).toBe(true)
  })

  it("skips terminated workers", () => {
    const result = determineRecoveryAction({ workerId: "wkr_001", state: "terminated", restartGeneration: 0 })
    expect(result.action).toBe("skip")
    expect(result.incrementGeneration).toBe(false)
  })
})

describe("runRecoveryPass", () => {
  it("processes workers in workerId order", () => {
    const inputs: RecoveryInput[] = [
      { workerId: "wkr_003", state: "working", restartGeneration: 0 },
      { workerId: "wkr_001", state: "idle", restartGeneration: 0 },
      { workerId: "wkr_002", state: "queued", restartGeneration: 0 },
    ]
    const result = runRecoveryPass(inputs)
    expect(result.survivors[0]?.workerId).toBe("wkr_001")
    expect(result.survivors[1]?.workerId).toBe("wkr_002")
    expect(result.survivors[2]?.workerId).toBe("wkr_003")
  })

  it("counts recovered workers correctly", () => {
    const inputs: RecoveryInput[] = [
      { workerId: "wkr_001", state: "working", restartGeneration: 0 },
      { workerId: "wkr_002", state: "terminated", restartGeneration: 0 },
      { workerId: "wkr_003", state: "idle", restartGeneration: 0 },
    ]
    const result = runRecoveryPass(inputs)
    expect(result.recoveredCount).toBe(2) // working and idle, not terminated
  })

  it("returns empty result for empty input", () => {
    const result = runRecoveryPass([])
    expect(result.survivors).toHaveLength(0)
    expect(result.recoveredCount).toBe(0)
  })

  it("detects when sweep is required", () => {
    const inputs: RecoveryInput[] = [
      { workerId: "wkr_001", state: "spawning", restartGeneration: 0, osPid: 1234 },
    ]
    const result = runRecoveryPass(inputs)
    expect(result.sweepRequired).toBe(true)
  })
})

describe("evaluateEscapedProcess", () => {
  it("returns skip when no osPid", () => {
    const result = evaluateEscapedProcess({ workerId: "wkr_001", osPid: 0 }, false)
    expect(result.action).toBe("skip")
  })

  it("returns clean when process does not exist", () => {
    const result = evaluateEscapedProcess({ workerId: "wkr_001", osPid: 1234 }, false)
    expect(result.action).toBe("clean")
  })

  it("returns pid_reused when command line doesn't match", () => {
    const result = evaluateEscapedProcess(
      { workerId: "wkr_001", osPid: 1234, sandboxRoot: "/workspace/workers/wkr_001/" },
      true,
      "some other process",
    )
    expect(result.action).toBe("pid_reused")
  })

  it("returns escapee when command line matches", () => {
    const result = evaluateEscapedProcess(
      { workerId: "wkr_001", osPid: 1234, sandboxRoot: "/workspace/workers/wkr_001/" },
      true,
      "claude --cwd /workspace/workers/wkr_001/ --print",
    )
    expect(result.action).toBe("escapee")
    expect(result.verified).toBe(true)
  })

  it("returns escapee when no sandbox root to verify", () => {
    const result = evaluateEscapedProcess(
      { workerId: "wkr_001", osPid: 1234 },
      true,
    )
    expect(result.action).toBe("escapee")
  })
})

describe("createRecoveryEvent", () => {
  it("creates recovery event with all fields", () => {
    const event = createRecoveryEvent({
      workerId: "wkr_001",
      workspaceId: "ws_001",
      restartGeneration: 1,
      stateBeforeRestart: "working",
      stateAfterRecovery: "terminated",
      osPidFound: true,
    })
    expect(event.type).toBe("worker.recovered")
    expect(event.workerId).toBe("wkr_001")
    expect(event.workspaceId).toBe("ws_001")
    expect(event.restartGeneration).toBe(1)
    expect(event.stateBeforeRestart).toBe("working")
    expect(event.stateAfterRecovery).toBe("terminated")
    expect(event.osPidFound).toBe(true)
    expect(event.at).toBeDefined()
  })
})
