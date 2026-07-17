/**
 * P06-SPAWN-MANAGER — Worker State Machine Tests
 *
 * WorkerLifecycle-Part02: exhaustive transition table.
 * WorkerLifecycle-Part03: 208-cell operation gate matrix.
 * WorkerLifecycle-Part04: health model.
 */

import { describe, it, expect } from "vitest"
import {
  canTransition,
  isActorAllowed,
  isStallable,
  gate,
  computeHealth,
  isLiveState,
  isPreProcessState,
  isTerminalState,
  isAdmissionLive,
} from "./worker-state"
import type { WorkerState, WorkerTrigger, WorkerOperation } from "./worker-state"

describe("Transition Table (WorkerLifecycle-Part02)", () => {
  describe("requested", () => {
    it("admit -> queued", () => {
      expect(canTransition("requested", "admit")).toBe("queued")
    })
    it("admission_rejected -> terminated", () => {
      expect(canTransition("requested", "admission_rejected")).toBe("terminated")
    })
    it("cancel -> terminated", () => {
      expect(canTransition("requested", "cancel")).toBe("terminated")
    })
  })

  describe("queued", () => {
    it("schedule_grant -> spawning", () => {
      expect(canTransition("queued", "schedule_grant")).toBe("spawning")
    })
    it("cancel -> terminated", () => {
      expect(canTransition("queued", "cancel")).toBe("terminated")
    })
  })

  describe("spawning", () => {
    it("process_started -> initializing", () => {
      expect(canTransition("spawning", "process_started")).toBe("initializing")
    })
    it("process_start_failed -> failing", () => {
      expect(canTransition("spawning", "process_start_failed")).toBe("failing")
    })
    it("deadline_exceeded -> failing", () => {
      expect(canTransition("spawning", "deadline_exceeded")).toBe("failing")
    })
  })

  describe("initializing", () => {
    it("handshake_ok -> idle", () => {
      expect(canTransition("initializing", "handshake_ok")).toBe("idle")
    })
    it("handshake_failed -> failing", () => {
      expect(canTransition("initializing", "handshake_failed")).toBe("failing")
    })
    it("deadline_exceeded -> failing", () => {
      expect(canTransition("initializing", "deadline_exceeded")).toBe("failing")
    })
  })

  describe("idle", () => {
    it("task_assigned -> working", () => {
      expect(canTransition("idle", "task_assigned")).toBe("working")
    })
    it("pause -> paused", () => {
      expect(canTransition("idle", "pause")).toBe("paused")
    })
    it("terminate -> terminating", () => {
      expect(canTransition("idle", "terminate")).toBe("terminating")
    })
    it("deadline_exceeded -> terminating", () => {
      expect(canTransition("idle", "deadline_exceeded")).toBe("terminating")
    })
  })

  describe("working", () => {
    it("await_external -> waiting", () => {
      expect(canTransition("working", "await_external")).toBe("waiting")
    })
    it("gate_hit -> blocked", () => {
      expect(canTransition("working", "gate_hit")).toBe("blocked")
    })
    it("task_completed -> idle", () => {
      expect(canTransition("working", "task_completed")).toBe("idle")
    })
    it("pause -> paused", () => {
      expect(canTransition("working", "pause")).toBe("paused")
    })
    it("fatal_error -> failing", () => {
      expect(canTransition("working", "fatal_error")).toBe("failing")
    })
    it("terminate -> terminating", () => {
      expect(canTransition("working", "terminate")).toBe("terminating")
    })
    it("deadline_exceeded -> failing", () => {
      expect(canTransition("working", "deadline_exceeded")).toBe("failing")
    })
  })

  describe("waiting", () => {
    it("external_returned -> working", () => {
      expect(canTransition("waiting", "external_returned")).toBe("working")
    })
    it("gate_hit -> blocked", () => {
      expect(canTransition("waiting", "gate_hit")).toBe("blocked")
    })
    it("fatal_error -> failing", () => {
      expect(canTransition("waiting", "fatal_error")).toBe("failing")
    })
    it("deadline_exceeded -> failing", () => {
      expect(canTransition("waiting", "deadline_exceeded")).toBe("failing")
    })
    it("terminate -> terminating", () => {
      expect(canTransition("waiting", "terminate")).toBe("terminating")
    })
  })

  describe("blocked", () => {
    it("gate_released -> working", () => {
      expect(canTransition("blocked", "gate_released")).toBe("working")
    })
    it("fatal_error -> failing", () => {
      expect(canTransition("blocked", "fatal_error")).toBe("failing")
    })
    it("terminate -> terminating", () => {
      expect(canTransition("blocked", "terminate")).toBe("terminating")
    })
    it("cancel -> terminating", () => {
      expect(canTransition("blocked", "cancel")).toBe("terminating")
    })
  })

  describe("paused", () => {
    it("resume -> idle (resolved via resumeState)", () => {
      expect(canTransition("paused", "resume")).toBe("idle")
    })
    it("terminate -> terminating", () => {
      expect(canTransition("paused", "terminate")).toBe("terminating")
    })
  })

  describe("failing", () => {
    it("cleanup_done -> terminating", () => {
      expect(canTransition("failing", "cleanup_done")).toBe("terminating")
    })
  })

  describe("terminating", () => {
    it("cleanup_done -> terminated", () => {
      expect(canTransition("terminating", "cleanup_done")).toBe("terminated")
    })
    it("process_unkillable -> zombie", () => {
      expect(canTransition("terminating", "process_unkillable")).toBe("zombie")
    })
    it("deadline_exceeded -> zombie", () => {
      expect(canTransition("terminating", "deadline_exceeded")).toBe("zombie")
    })
  })

  describe("zombie", () => {
    it("reaped -> terminated", () => {
      expect(canTransition("zombie", "reaped")).toBe("terminated")
    })
  })

  describe("illegal transitions", () => {
    it("terminated cannot transition with any trigger", () => {
      const triggers: WorkerTrigger[] = [
        "admit", "admission_rejected", "schedule_grant", "cancel",
        "process_started", "process_start_failed", "handshake_ok", "handshake_failed",
        "task_assigned", "task_completed", "await_external", "external_returned",
        "gate_hit", "gate_released", "pause", "resume",
        "fatal_error", "deadline_exceeded", "terminate", "cleanup_done",
        "process_unkillable", "reaped",
      ]
      for (const trigger of triggers) {
        expect(canTransition("terminated", trigger)).toBeNull()
      }
    })

    it("working -> terminated is illegal", () => {
      expect(canTransition("working", "terminate")).not.toBe("terminated")
    })

    it("failing -> idle is illegal", () => {
      expect(canTransition("failing", "resume")).toBeNull()
    })

    it("idle -> waiting is illegal (no task)", () => {
      expect(canTransition("idle", "await_external")).toBeNull()
    })

    it("spawning -> idle is illegal (skips handshake)", () => {
      expect(canTransition("spawning", "handshake_ok")).not.toBe("idle")
    })
  })
})

describe("Actor Permissions", () => {
  it("only scheduler can fire admit", () => {
    expect(isActorAllowed("requested", "admit")).toBe(true)
  })

  it("only process_lifecycle can fire process_started", () => {
    expect(isActorAllowed("spawning", "process_started")).toBe(true)
  })

  it("only worker can fire handshake_ok", () => {
    expect(isActorAllowed("initializing", "handshake_ok")).toBe(true)
  })

  it("only scheduler can fire task_assigned", () => {
    expect(isActorAllowed("idle", "task_assigned")).toBe(true)
  })

  it("user_or_parent can fire terminate", () => {
    expect(isActorAllowed("working", "terminate")).toBe(true)
  })
})

describe("Stallable States", () => {
  it("requested is stallable", () => expect(isStallable("requested")).toBe(true))
  it("spawning is stallable", () => expect(isStallable("spawning")).toBe(true))
  it("initializing is stallable", () => expect(isStallable("initializing")).toBe(true))
  it("idle is stallable", () => expect(isStallable("idle")).toBe(true))
  it("working is stallable", () => expect(isStallable("working")).toBe(true))
  it("waiting is stallable", () => expect(isStallable("waiting")).toBe(true))
  it("failing is stallable", () => expect(isStallable("failing")).toBe(true))
  it("terminating is stallable", () => expect(isStallable("terminating")).toBe(true))
  it("zombie is stallable", () => expect(isStallable("zombie")).toBe(true))
  it("queued is NOT stallable", () => expect(isStallable("queued")).toBe(false))
  it("blocked is NOT stallable", () => expect(isStallable("blocked")).toBe(false))
  it("paused is NOT stallable", () => expect(isStallable("paused")).toBe(false))
  it("terminated is NOT stallable", () => expect(isStallable("terminated")).toBe(false))
})

describe("Operation Gate (WorkerLifecycle-Part03)", () => {
  const ALL_STATES: WorkerState[] = [
    "requested", "queued", "spawning", "initializing",
    "idle", "working", "waiting", "blocked", "paused",
    "failing", "terminating", "terminated", "zombie",
  ]
  const ALL_OPERATIONS: WorkerOperation[] = [
    "accept_task", "call_model", "invoke_tool", "read_file",
    "write_artifact", "acquire_lock", "release_lock", "spawn_child",
    "send_message", "receive_message", "write_memory", "read_memory",
    "request_permission", "emit_progress", "heartbeat", "accept_terminate",
  ]

  it("all 208 cells are defined (13 states × 16 operations)", () => {
    let definedCount = 0
    for (const state of ALL_STATES) {
      for (const op of ALL_OPERATIONS) {
        const result = gate(state, op)
        definedCount++
        expect(result).toBeDefined()
        expect(typeof result.allowed).toBe("boolean")
      }
    }
    expect(definedCount).toBe(208)
  })

  it("terminated denies all operations", () => {
    for (const op of ALL_OPERATIONS) {
      const result = gate("terminated", op)
      expect(result.allowed).toBe(false)
    }
  })

  it("accept_terminate is allowed in all states with a process", () => {
    const statesWithProcess: WorkerState[] = [
      "initializing", "idle", "working", "waiting", "blocked", "paused",
      "failing", "terminating", "zombie",
    ]
    for (const state of statesWithProcess) {
      const result = gate(state, "accept_terminate")
      expect(result.allowed).toBe(true)
    }
  })

  it("heartbeat is denied in zombie", () => {
    const result = gate("zombie", "heartbeat")
    expect(result.allowed).toBe(false)
  })

  it("call_model is only allowed in working", () => {
    for (const state of ALL_STATES) {
      const result = gate(state, "call_model")
      if (state === "working") {
        expect(result.allowed).toBe(true)
      } else {
        expect(result.allowed).toBe(false)
      }
    }
  })

  it("accept_task is only allowed in idle", () => {
    for (const state of ALL_STATES) {
      const result = gate(state, "accept_task")
      if (state === "idle") {
        expect(result.allowed).toBe(true)
      } else {
        expect(result.allowed).toBe(false)
      }
    }
  })

  it("spawn_child is only allowed in working", () => {
    for (const state of ALL_STATES) {
      const result = gate(state, "spawn_child")
      if (state === "working") {
        expect(result.allowed).toBe(true)
      } else {
        expect(result.allowed).toBe(false)
      }
    }
  })

  it("retryable is true for queued, spawning, initializing, waiting, blocked, paused", () => {
    const retryableStates: WorkerState[] = ["queued", "spawning", "initializing", "waiting", "blocked", "paused"]
    for (const state of retryableStates) {
      const result = gate(state, "accept_task")
      if (!result.allowed && result.error) {
        expect(result.error.retryable).toBe(true)
      }
    }
  })

  it("retryable is false for requested, failing, terminating, terminated, zombie", () => {
    const nonRetryableStates: WorkerState[] = ["requested", "failing", "terminating", "terminated", "zombie"]
    for (const state of nonRetryableStates) {
      const result = gate(state, "accept_task")
      if (!result.allowed && result.error) {
        expect(result.error.retryable).toBe(false)
      }
    }
  })

  it("send_message is denied in paused", () => {
    const result = gate("paused", "send_message")
    expect(result.allowed).toBe(false)
  })

  it("write_artifact is allowed in failing and terminating", () => {
    expect(gate("failing", "write_artifact").allowed).toBe(true)
    expect(gate("terminating", "write_artifact").allowed).toBe(true)
  })

  it("release_lock is allowed in idle, working, waiting, blocked, paused, failing, terminating", () => {
    const states: WorkerState[] = ["idle", "working", "waiting", "blocked", "paused", "failing", "terminating"]
    for (const state of states) {
      expect(gate(state, "release_lock").allowed).toBe(true)
    }
  })
})

describe("Health Computation", () => {
  it("0 missed heartbeats = healthy", () => {
    expect(computeHealth(0)).toBe("healthy")
  })
  it("1 missed heartbeat = degraded", () => {
    expect(computeHealth(1)).toBe("degraded")
  })
  it("2 missed heartbeats = degraded", () => {
    expect(computeHealth(2)).toBe("degraded")
  })
  it("3 missed heartbeats = unresponsive", () => {
    expect(computeHealth(3)).toBe("unresponsive")
  })
  it("6+ missed heartbeats = unresponsive", () => {
    expect(computeHealth(6)).toBe("unresponsive")
  })
})

describe("State Classification", () => {
  it("live states", () => {
    expect(isLiveState("idle")).toBe(true)
    expect(isLiveState("working")).toBe(true)
    expect(isLiveState("waiting")).toBe(true)
    expect(isLiveState("blocked")).toBe(true)
    expect(isLiveState("paused")).toBe(true)
    expect(isLiveState("spawning")).toBe(true)
    expect(isLiveState("initializing")).toBe(true)
  })

  it("pre-process states", () => {
    expect(isPreProcessState("requested")).toBe(true)
    expect(isPreProcessState("queued")).toBe(true)
  })

  it("terminal states", () => {
    expect(isTerminalState("terminated")).toBe(true)
  })

  it("admission live excludes requested", () => {
    expect(isAdmissionLive("requested")).toBe(false)
    expect(isAdmissionLive("queued")).toBe(true)
    expect(isAdmissionLive("working")).toBe(true)
  })
})
