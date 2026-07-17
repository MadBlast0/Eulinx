/**
 * P01-CORE-BASE — Abstract Base Classes
 *
 * Minimal abstract bases that downstream services extend.
 * kept thin — composition is preferred over inheritance.
 */

import type { Result } from "./result"
import { CoreError, validationError } from "./error"
import type { Logger } from "./logger"
import { createLogger } from "./logger"
import type { RunState } from "./enums"

// ---------------------------------------------------------------------------
// Base Service
// ---------------------------------------------------------------------------

export abstract class BaseService {
  protected readonly logger: Logger
  readonly name: string

  constructor(name: string) {
    this.name = name
    this.logger = createLogger(name)
  }

  abstract initialize(): Promise<Result<void, CoreError>>
  abstract shutdown(): Promise<Result<void, CoreError>>

  get isInitialized(): boolean {
    return this._initialized
  }

  private _initialized = false

  protected markInitialized(): void {
    this._initialized = true
    this.logger.info(`${this.name} initialized`)
  }

  protected markShutdown(): void {
    this._initialized = false
    this.logger.info(`${this.name} shut down`)
  }
}

// ---------------------------------------------------------------------------
// Base State Machine
// ---------------------------------------------------------------------------

export class StateMachine<S extends string> {
  private _state: S
  private readonly transitions: Map<S, readonly S[]>
  private readonly onTransition?: (from: S, to: S) => void

  constructor(
    initial: S,
    transitions: Map<S, readonly S[]>,
    onTransition?: (from: S, to: S) => void,
  ) {
    this._state = initial
    this.transitions = transitions
    this.onTransition = onTransition
  }

  get state(): S {
    return this._state
  }

  canTransition(to: S): boolean {
    const allowed = this.transitions.get(this._state)
    return allowed !== undefined && (allowed as readonly string[]).includes(to)
  }

  transition(to: S): Result<S, CoreError> {
    if (!this.canTransition(to)) {
      return { ok: false, error: validationError("state", `Invalid transition from ${this._state} to ${to}`) }
    }
    const from = this._state
    this._state = to
    this.onTransition?.(from, to)
    return { ok: true, value: to }
  }

  reset(): void {
    const firstKey = this.transitions.keys().next().value
    if (firstKey !== undefined) {
      this._state = firstKey
    }
  }
}

// ---------------------------------------------------------------------------
// Base Entity (identifiable, timestamped)
// ---------------------------------------------------------------------------

export interface BaseEntity {
  readonly id: string
  readonly createdAt: string
  readonly updatedAt: string
}

export function createEntity<T extends { id: string }>(
  data: T,
): T & BaseEntity {
  const now = new Date().toISOString()
  return { ...data, createdAt: now, updatedAt: now }
}

export function updateEntity<T extends BaseEntity>(
  entity: T,
  changes: Partial<Omit<T, "id" | "createdAt">>,
): T {
  return { ...entity, ...changes, updatedAt: new Date().toISOString() }
}

// ---------------------------------------------------------------------------
// Base Event
// ---------------------------------------------------------------------------

export interface BaseEvent {
  readonly eventId: string
  readonly sequence: number
  readonly type: string
  readonly source: string
  readonly workspaceId: string
  readonly emittedAt: string
  readonly correlationId?: string
  readonly causationId?: string
  readonly replayGrade: boolean
}

// ---------------------------------------------------------------------------
// Base Worker State Machine
// ---------------------------------------------------------------------------

function createTransitions(entries: [RunState, RunState[]][]): Map<RunState, readonly RunState[]> {
  return new Map(entries)
}

export const WORKER_TRANSITIONS = createTransitions([
  ["created", ["initializing"]],
  ["initializing", ["idle", "destroyed"]],
  ["idle", ["planning", "working", "blocked", "destroyed"]],
  ["planning", ["working", "blocked", "idle", "destroyed"]],
  ["working", ["reviewing", "testing", "waiting", "blocked", "completed", "destroyed"]],
  ["waiting", ["working", "blocked", "destroyed"]],
  ["blocked", ["idle", "working", "destroyed"]],
  ["reviewing", ["testing", "coding", "working", "completed", "failed", "destroyed"]],
  ["testing", ["reviewing", "coding", "working", "completed", "failed", "destroyed"]],
  ["coding", ["reviewing", "testing", "working", "completed", "failed", "destroyed"]],
  ["researching", ["working", "planning", "blocked", "destroyed"]],
  ["completed", ["archived", "destroyed"]],
  ["archived", ["destroyed"]],
  ["failed", ["destroyed"]],
  ["destroyed", []],
])

export function createWorkerStateMachine(
  onTransition?: (from: RunState, to: RunState) => void,
): StateMachine<RunState> {
  return new StateMachine<RunState>("created", WORKER_TRANSITIONS, onTransition)
}
