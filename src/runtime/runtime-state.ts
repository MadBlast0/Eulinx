/**
 * P02-RUNTIME-STATE — Runtime State Machine
 *
 * Deterministic state machine governing the RuntimeManager lifecycle.
 * States from RuntimeManager-Part01: uninitialized → starting → ready → running → paused → degraded → stopping → stopped → failed → recovery.
 */

import { StateMachine } from "@/core/base"
import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import { CoreError } from "@/core/error"

// ---------------------------------------------------------------------------
// Runtime state types
// ---------------------------------------------------------------------------

export type RuntimeState =
  | "uninitialized"
  | "starting"
  | "ready"
  | "running"
  | "paused"
  | "degraded"
  | "stopping"
  | "stopped"
  | "failed"
  | "recovery"

/** States where the runtime can accept new commands. */
export const RUNTIME_ACCEPTING: readonly RuntimeState[] = [
  "ready",
  "running",
  "paused",
  "degraded",
] as const

/** States where the runtime is actively executing work. */
export const RUNTIME_ACTIVE: readonly RuntimeState[] = [
  "running",
  "degraded",
] as const

/** States where execution must not proceed. */
export const RUNTIME_BLOCKED: readonly RuntimeState[] = [
  "uninitialized",
  "starting",
  "stopping",
  "stopped",
  "failed",
  "recovery",
] as const

// ---------------------------------------------------------------------------
// Transition table
// ---------------------------------------------------------------------------

const RUNTIME_TRANSITIONS: Map<RuntimeState, readonly RuntimeState[]> = new Map([
  ["uninitialized", ["starting", "failed"]],
  ["starting", ["ready", "degraded", "failed"]],
  ["ready", ["running", "paused", "stopping", "degraded"]],
  ["running", ["paused", "degraded", "stopping", "failed", "recovery"]],
  ["paused", ["running", "stopping", "degraded"]],
  ["degraded", ["running", "stopping", "failed", "recovery"]],
  ["stopping", ["stopped", "failed"]],
  ["stopped", ["starting"]],
  ["failed", ["recovery", "starting", "stopped"]],
  ["recovery", ["running", "degraded", "failed", "stopping"]],
])

// ---------------------------------------------------------------------------
// Runtime state machine
// ---------------------------------------------------------------------------

export class RuntimeStateMachine {
  private readonly machine: StateMachine<RuntimeState>
  private readonly listeners: Array<(from: RuntimeState, to: RuntimeState) => void> = []

  constructor(onTransition?: (from: RuntimeState, to: RuntimeState) => void) {
    this.machine = new StateMachine<RuntimeState>(
      "uninitialized",
      RUNTIME_TRANSITIONS,
      (from, to) => {
        onTransition?.(from, to)
        for (const listener of this.listeners) {
          listener(from, to)
        }
      },
    )
  }

  get state(): RuntimeState {
    return this.machine.state
  }

  canTransition(to: RuntimeState): boolean {
    return this.machine.canTransition(to)
  }

  transition(to: RuntimeState): Result<RuntimeState, CoreError> {
    const result = this.machine.transition(to)
    if (!result.ok) {
      return err(new CoreError("validation_error", result.error.message))
    }
    return ok(result.value)
  }

  onTransition(listener: (from: RuntimeState, to: RuntimeState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const idx = this.listeners.indexOf(listener)
      if (idx >= 0) this.listeners.splice(idx, 1)
    }
  }

  reset(): void {
    this.machine.reset()
  }

  /** Whether the runtime can accept new commands in its current state. */
  get canAcceptCommands(): boolean {
    return (RUNTIME_ACCEPTING as readonly RuntimeState[]).includes(this.state)
  }

  /** Whether the runtime is actively executing work. */
  get isActive(): boolean {
    return (RUNTIME_ACTIVE as readonly RuntimeState[]).includes(this.state)
  }

  /** Whether the runtime is in a blocked state. */
  get isBlocked(): boolean {
    return (RUNTIME_BLOCKED as readonly RuntimeState[]).includes(this.state)
  }
}
