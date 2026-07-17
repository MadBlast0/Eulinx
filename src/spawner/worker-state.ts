/**
 * P06-SPAWN-MANAGER — Worker State Machine
 *
 * WorkerLifecycle-Part01: 13 Worker states with deterministic transitions.
 * WorkerLifecycle-Part02: Complete transition table and trigger enum.
 * WorkerLifecycle-Part03: Operation gate (13 states × 16 operations = 208 cells).
 * WorkerLifecycle-Part04: Timeouts, heartbeats, and health model.
 */

// ---------------------------------------------------------------------------
// Worker State (WorkerLifecycle-Part01 §Worker States)
// ---------------------------------------------------------------------------

export type WorkerState =
  | "requested"
  | "queued"
  | "spawning"
  | "initializing"
  | "idle"
  | "working"
  | "waiting"
  | "blocked"
  | "paused"
  | "failing"
  | "terminating"
  | "terminated"
  | "zombie"

// ---------------------------------------------------------------------------
// Worker Trigger (WorkerLifecycle-Part02 §Trigger Enum)
// ---------------------------------------------------------------------------

export type WorkerTrigger =
  | "admit"
  | "admission_rejected"
  | "schedule_grant"
  | "cancel"
  | "process_started"
  | "process_start_failed"
  | "handshake_ok"
  | "handshake_failed"
  | "task_assigned"
  | "task_completed"
  | "await_external"
  | "external_returned"
  | "gate_hit"
  | "gate_released"
  | "pause"
  | "resume"
  | "fatal_error"
  | "deadline_exceeded"
  | "terminate"
  | "cleanup_done"
  | "process_unkillable"
  | "reaped"

// ---------------------------------------------------------------------------
// Worker Health (WorkerLifecycle-Part04 §Health Model)
// ---------------------------------------------------------------------------

export type WorkerHealth = "healthy" | "degraded" | "unresponsive" | "unknown"

// ---------------------------------------------------------------------------
// Worker Failure Cause (WorkerLifecycle-Part04 §Failure Causes)
// ---------------------------------------------------------------------------

export type WorkerFailureCause =
  | "process_start_failed"
  | "handshake_failed"
  | "handshake_timeout"
  | "heartbeat_lost"
  | "work_deadline_exceeded"
  | "wait_deadline_exceeded"
  | "model_call_failed"
  | "tool_call_failed"
  | "budget_exhausted"
  | "permission_revoked"
  | "sandbox_violation"
  | "corrupt_lifecycle_record"
  | "pause_queue_overflow"
  | "parent_terminated"
  | "process_crashed"
  | "unknown"

// ---------------------------------------------------------------------------
// Transition Table (WorkerLifecycle-Part02 §The Transition Table)
// ---------------------------------------------------------------------------

type TransitionKey = `${WorkerState}:${WorkerTrigger}`

const TRANSITION_TABLE: ReadonlyMap<TransitionKey, WorkerState> = new Map([
  // requested
  ["requested:admit", "queued"],
  ["requested:admission_rejected", "terminated"],
  ["requested:cancel", "terminated"],

  // queued
  ["queued:schedule_grant", "spawning"],
  ["queued:cancel", "terminated"],

  // spawning
  ["spawning:process_started", "initializing"],
  ["spawning:process_start_failed", "failing"],
  ["spawning:deadline_exceeded", "failing"],

  // initializing
  ["initializing:handshake_ok", "idle"],
  ["initializing:handshake_failed", "failing"],
  ["initializing:deadline_exceeded", "failing"],

  // idle
  ["idle:task_assigned", "working"],
  ["idle:pause", "paused"],
  ["idle:terminate", "terminating"],
  ["idle:deadline_exceeded", "terminating"],

  // working
  ["working:await_external", "waiting"],
  ["working:gate_hit", "blocked"],
  ["working:task_completed", "idle"],
  ["working:pause", "paused"],
  ["working:fatal_error", "failing"],
  ["working:terminate", "terminating"],
  ["working:deadline_exceeded", "failing"],

  // waiting
  ["waiting:external_returned", "working"],
  ["waiting:gate_hit", "blocked"],
  ["waiting:fatal_error", "failing"],
  ["waiting:deadline_exceeded", "failing"],
  ["waiting:terminate", "terminating"],

  // blocked
  ["blocked:gate_released", "working"],
  ["blocked:fatal_error", "failing"],
  ["blocked:terminate", "terminating"],
  ["blocked:cancel", "terminating"],

  // paused
  ["paused:resume", "idle"], // resolved dynamically via resumeState
  ["paused:terminate", "terminating"],

  // failing
  ["failing:cleanup_done", "terminating"],

  // terminating
  ["terminating:cleanup_done", "terminated"],
  ["terminating:process_unkillable", "zombie"],
  ["terminating:deadline_exceeded", "zombie"],

  // zombie
  ["zombie:reaped", "terminated"],
])

// ---------------------------------------------------------------------------
// Actor Permissions per Transition (WorkerLifecycle-Part02 §ACTOR column)
// ---------------------------------------------------------------------------

type ActorKind = "any" | "scheduler" | "process_lifecycle" | "worker" | "runtime_service" | "user_or_parent" | "watchdog" | "lifecycle_engine" | "termination_engine" | "zombie_reaper"

const ACTOR_TABLE: ReadonlyMap<TransitionKey, ActorKind> = new Map([
  ["requested:admit", "scheduler"],
  ["requested:admission_rejected", "scheduler"],
  ["requested:cancel", "user_or_parent"],
  ["queued:schedule_grant", "scheduler"],
  ["queued:cancel", "user_or_parent"],
  ["spawning:process_started", "process_lifecycle"],
  ["spawning:process_start_failed", "process_lifecycle"],
  ["spawning:deadline_exceeded", "watchdog"],
  ["initializing:handshake_ok", "worker"],
  ["initializing:handshake_failed", "worker"],
  ["initializing:deadline_exceeded", "watchdog"],
  ["idle:task_assigned", "scheduler"],
  ["idle:pause", "user_or_parent"],
  ["idle:terminate", "user_or_parent"],
  ["idle:deadline_exceeded", "watchdog"],
  ["working:await_external", "worker"],
  ["working:gate_hit", "runtime_service"],
  ["working:task_completed", "worker"],
  ["working:pause", "user_or_parent"],
  ["working:fatal_error", "worker"],
  ["working:terminate", "user_or_parent"],
  ["working:deadline_exceeded", "watchdog"],
  ["waiting:external_returned", "runtime_service"],
  ["waiting:gate_hit", "runtime_service"],
  ["waiting:fatal_error", "runtime_service"],
  ["waiting:deadline_exceeded", "watchdog"],
  ["waiting:terminate", "user_or_parent"],
  ["blocked:gate_released", "runtime_service"],
  ["blocked:fatal_error", "runtime_service"],
  ["blocked:terminate", "user_or_parent"],
  ["blocked:cancel", "user_or_parent"],
  ["paused:resume", "user_or_parent"],
  ["paused:terminate", "user_or_parent"],
  ["failing:cleanup_done", "lifecycle_engine"],
  ["terminating:cleanup_done", "termination_engine"],
  ["terminating:process_unkillable", "process_lifecycle"],
  ["terminating:deadline_exceeded", "watchdog"],
  ["zombie:reaped", "zombie_reaper"],
])

// ---------------------------------------------------------------------------
// Pure Lookup Functions
// ---------------------------------------------------------------------------

/**
 * Pure lookup: given a state and trigger, return the destination state or null.
 * WorkerLifecycle-Part02: "Implement the transition table as data."
 */
export function canTransition(from: WorkerState, trigger: WorkerTrigger): WorkerState | null {
  const key: TransitionKey = `${from}:${trigger}`
  return TRANSITION_TABLE.get(key) ?? null
}

/**
 * Check whether a specific actor kind is allowed to fire this trigger.
 */
export function isActorAllowed(from: WorkerState, trigger: WorkerTrigger): boolean {
  const key: TransitionKey = `${from}:${trigger}`
  const allowed = ACTOR_TABLE.get(key)
  return allowed !== undefined
}

// ---------------------------------------------------------------------------
// Stallable States (WorkerLifecycle-Part04 §Stallable States)
// ---------------------------------------------------------------------------

const STALLABLE_STATES: ReadonlySet<WorkerState> = new Set([
  "requested",
  "spawning",
  "initializing",
  "idle",
  "working",
  "waiting",
  "failing",
  "terminating",
  "zombie",
])

export function isStallable(state: WorkerState): boolean {
  return STALLABLE_STATES.has(state)
}

// ---------------------------------------------------------------------------
// Worker Operation Gate (WorkerLifecycle-Part03 §Operation Matrix)
// ---------------------------------------------------------------------------

export type WorkerOperation =
  | "accept_task"
  | "call_model"
  | "invoke_tool"
  | "read_file"
  | "write_artifact"
  | "acquire_lock"
  | "release_lock"
  | "spawn_child"
  | "send_message"
  | "receive_message"
  | "write_memory"
  | "read_memory"
  | "request_permission"
  | "emit_progress"
  | "heartbeat"
  | "accept_terminate"

type GateMatrixKey = `${WorkerState}:${WorkerOperation}`

// Y = permitted, N = rejected
const GATE_MATRIX: ReadonlyMap<GateMatrixKey, "Y" | "N"> = new Map([
  // requested
  ["requested:accept_task", "N"],
  ["requested:call_model", "N"],
  ["requested:invoke_tool", "N"],
  ["requested:read_file", "N"],
  ["requested:write_artifact", "N"],
  ["requested:acquire_lock", "N"],
  ["requested:release_lock", "N"],
  ["requested:spawn_child", "N"],
  ["requested:send_message", "N"],
  ["requested:receive_message", "N"],
  ["requested:write_memory", "N"],
  ["requested:read_memory", "N"],
  ["requested:request_permission", "N"],
  ["requested:emit_progress", "N"],
  ["requested:heartbeat", "N"],
  ["requested:accept_terminate", "N"],

  // queued
  ["queued:accept_task", "N"],
  ["queued:call_model", "N"],
  ["queued:invoke_tool", "N"],
  ["queued:read_file", "N"],
  ["queued:write_artifact", "N"],
  ["queued:acquire_lock", "N"],
  ["queued:release_lock", "N"],
  ["queued:spawn_child", "N"],
  ["queued:send_message", "N"],
  ["queued:receive_message", "N"],
  ["queued:write_memory", "N"],
  ["queued:read_memory", "N"],
  ["queued:request_permission", "N"],
  ["queued:emit_progress", "N"],
  ["queued:heartbeat", "N"],
  ["queued:accept_terminate", "N"],

  // spawning
  ["spawning:accept_task", "N"],
  ["spawning:call_model", "N"],
  ["spawning:invoke_tool", "N"],
  ["spawning:read_file", "N"],
  ["spawning:write_artifact", "N"],
  ["spawning:acquire_lock", "N"],
  ["spawning:release_lock", "N"],
  ["spawning:spawn_child", "N"],
  ["spawning:send_message", "N"],
  ["spawning:receive_message", "N"],
  ["spawning:write_memory", "N"],
  ["spawning:read_memory", "N"],
  ["spawning:request_permission", "N"],
  ["spawning:emit_progress", "N"],
  ["spawning:heartbeat", "N"],
  ["spawning:accept_terminate", "N"],

  // initializing
  ["initializing:accept_task", "N"],
  ["initializing:call_model", "N"],
  ["initializing:invoke_tool", "N"],
  ["initializing:read_file", "N"],
  ["initializing:write_artifact", "N"],
  ["initializing:acquire_lock", "N"],
  ["initializing:release_lock", "N"],
  ["initializing:spawn_child", "N"],
  ["initializing:send_message", "N"],
  ["initializing:receive_message", "Y"],
  ["initializing:write_memory", "N"],
  ["initializing:read_memory", "Y"],
  ["initializing:request_permission", "N"],
  ["initializing:emit_progress", "Y"],
  ["initializing:heartbeat", "Y"],
  ["initializing:accept_terminate", "Y"],

  // idle
  ["idle:accept_task", "Y"],
  ["idle:call_model", "N"],
  ["idle:invoke_tool", "N"],
  ["idle:read_file", "N"],
  ["idle:write_artifact", "N"],
  ["idle:acquire_lock", "N"],
  ["idle:release_lock", "Y"],
  ["idle:spawn_child", "N"],
  ["idle:send_message", "Y"],
  ["idle:receive_message", "Y"],
  ["idle:write_memory", "Y"],
  ["idle:read_memory", "Y"],
  ["idle:request_permission", "N"],
  ["idle:emit_progress", "Y"],
  ["idle:heartbeat", "Y"],
  ["idle:accept_terminate", "Y"],

  // working
  ["working:accept_task", "N"],
  ["working:call_model", "Y"],
  ["working:invoke_tool", "Y"],
  ["working:read_file", "Y"],
  ["working:write_artifact", "Y"],
  ["working:acquire_lock", "Y"],
  ["working:release_lock", "Y"],
  ["working:spawn_child", "Y"],
  ["working:send_message", "Y"],
  ["working:receive_message", "Y"],
  ["working:write_memory", "Y"],
  ["working:read_memory", "Y"],
  ["working:request_permission", "Y"],
  ["working:emit_progress", "Y"],
  ["working:heartbeat", "Y"],
  ["working:accept_terminate", "Y"],

  // waiting
  ["waiting:accept_task", "N"],
  ["waiting:call_model", "N"],
  ["waiting:invoke_tool", "N"],
  ["waiting:read_file", "N"],
  ["waiting:write_artifact", "N"],
  ["waiting:acquire_lock", "N"],
  ["waiting:release_lock", "Y"],
  ["waiting:spawn_child", "N"],
  ["waiting:send_message", "Y"],
  ["waiting:receive_message", "Y"],
  ["waiting:write_memory", "N"],
  ["waiting:read_memory", "Y"],
  ["waiting:request_permission", "N"],
  ["waiting:emit_progress", "Y"],
  ["waiting:heartbeat", "Y"],
  ["waiting:accept_terminate", "Y"],

  // blocked
  ["blocked:accept_task", "N"],
  ["blocked:call_model", "N"],
  ["blocked:invoke_tool", "N"],
  ["blocked:read_file", "N"],
  ["blocked:write_artifact", "N"],
  ["blocked:acquire_lock", "N"],
  ["blocked:release_lock", "Y"],
  ["blocked:spawn_child", "N"],
  ["blocked:send_message", "Y"],
  ["blocked:receive_message", "Y"],
  ["blocked:write_memory", "N"],
  ["blocked:read_memory", "Y"],
  ["blocked:request_permission", "Y"],
  ["blocked:emit_progress", "Y"],
  ["blocked:heartbeat", "Y"],
  ["blocked:accept_terminate", "Y"],

  // paused
  ["paused:accept_task", "N"],
  ["paused:call_model", "N"],
  ["paused:invoke_tool", "N"],
  ["paused:read_file", "N"],
  ["paused:write_artifact", "N"],
  ["paused:acquire_lock", "N"],
  ["paused:release_lock", "Y"],
  ["paused:spawn_child", "N"],
  ["paused:send_message", "N"],
  ["paused:receive_message", "N"],
  ["paused:write_memory", "N"],
  ["paused:read_memory", "N"],
  ["paused:request_permission", "N"],
  ["paused:emit_progress", "N"],
  ["paused:heartbeat", "Y"],
  ["paused:accept_terminate", "Y"],

  // failing
  ["failing:accept_task", "N"],
  ["failing:call_model", "N"],
  ["failing:invoke_tool", "N"],
  ["failing:read_file", "N"],
  ["failing:write_artifact", "Y"],
  ["failing:acquire_lock", "N"],
  ["failing:release_lock", "Y"],
  ["failing:spawn_child", "N"],
  ["failing:send_message", "N"],
  ["failing:receive_message", "N"],
  ["failing:write_memory", "Y"],
  ["failing:read_memory", "N"],
  ["failing:request_permission", "N"],
  ["failing:emit_progress", "N"],
  ["failing:heartbeat", "Y"],
  ["failing:accept_terminate", "Y"],

  // terminating
  ["terminating:accept_task", "N"],
  ["terminating:call_model", "N"],
  ["terminating:invoke_tool", "N"],
  ["terminating:read_file", "N"],
  ["terminating:write_artifact", "Y"],
  ["terminating:acquire_lock", "N"],
  ["terminating:release_lock", "Y"],
  ["terminating:spawn_child", "N"],
  ["terminating:send_message", "N"],
  ["terminating:receive_message", "N"],
  ["terminating:write_memory", "Y"],
  ["terminating:read_memory", "N"],
  ["terminating:request_permission", "N"],
  ["terminating:emit_progress", "N"],
  ["terminating:heartbeat", "Y"],
  ["terminating:accept_terminate", "Y"],

  // terminated
  ["terminated:accept_task", "N"],
  ["terminated:call_model", "N"],
  ["terminated:invoke_tool", "N"],
  ["terminated:read_file", "N"],
  ["terminated:write_artifact", "N"],
  ["terminated:acquire_lock", "N"],
  ["terminated:release_lock", "N"],
  ["terminated:spawn_child", "N"],
  ["terminated:send_message", "N"],
  ["terminated:receive_message", "N"],
  ["terminated:write_memory", "N"],
  ["terminated:read_memory", "N"],
  ["terminated:request_permission", "N"],
  ["terminated:emit_progress", "N"],
  ["terminated:heartbeat", "N"],
  ["terminated:accept_terminate", "N"],

  // zombie
  ["zombie:accept_task", "N"],
  ["zombie:call_model", "N"],
  ["zombie:invoke_tool", "N"],
  ["zombie:read_file", "N"],
  ["zombie:write_artifact", "N"],
  ["zombie:acquire_lock", "N"],
  ["zombie:release_lock", "N"],
  ["zombie:spawn_child", "N"],
  ["zombie:send_message", "N"],
  ["zombie:receive_message", "N"],
  ["zombie:write_memory", "N"],
  ["zombie:read_memory", "N"],
  ["zombie:request_permission", "N"],
  ["zombie:emit_progress", "N"],
  ["zombie:heartbeat", "N"],
  ["zombie:accept_terminate", "Y"],
])

// ---------------------------------------------------------------------------
// Gate Result (WorkerLifecycle-Part03 §The Operation Gate)
// ---------------------------------------------------------------------------

export interface GateResult {
  readonly allowed: boolean
  readonly error?: {
    readonly kind: "operation_not_allowed_in_state"
    readonly operation: WorkerOperation
    readonly state: WorkerState
    readonly message: string
    readonly retryable: boolean
  }
}

const RETRYABLE_STATES: ReadonlySet<WorkerState> = new Set([
  "queued",
  "spawning",
  "initializing",
  "waiting",
  "blocked",
  "paused",
])

/**
 * Pure gate lookup. WorkerLifecycle-Part03: "MUST be a pure function."
 * 13 states × 16 operations = 208 cells.
 */
export function gate(state: WorkerState, operation: WorkerOperation): GateResult {
  const key: GateMatrixKey = `${state}:${operation}`
  const cell = GATE_MATRIX.get(key)

  if (cell === "Y") {
    return { allowed: true }
  }

  return {
    allowed: false,
    error: {
      kind: "operation_not_allowed_in_state",
      operation,
      state,
      message: `Operation '${operation}' is not allowed in state '${state}'`,
      retryable: RETRYABLE_STATES.has(state),
    },
  }
}

// ---------------------------------------------------------------------------
// Health Computation (WorkerLifecycle-Part04 §Health Model)
// ---------------------------------------------------------------------------

export function computeHealth(missedHeartbeats: number): WorkerHealth {
  if (missedHeartbeats === 0) return "healthy"
  if (missedHeartbeats <= 2) return "degraded"
  return "unresponsive"
}

// ---------------------------------------------------------------------------
// State Classification Helpers
// ---------------------------------------------------------------------------

const LIVE_STATES: ReadonlySet<WorkerState> = new Set([
  "idle", "working", "waiting", "blocked", "paused",
  "spawning", "initializing",
])

const PRE_PROCESS_STATES: ReadonlySet<WorkerState> = new Set([
  "requested", "queued",
])

const TERMINAL_STATES: ReadonlySet<WorkerState> = new Set([
  "terminated",
])

export function isLiveState(state: WorkerState): boolean {
  return LIVE_STATES.has(state)
}

export function isPreProcessState(state: WorkerState): boolean {
  return PRE_PROCESS_STATES.has(state)
}

export function isTerminalState(state: WorkerState): boolean {
  return TERMINAL_STATES.has(state)
}

/**
 * States counted as "live" for admission control.
 * WorkerCreation-Part03: "requested is NOT counted as live."
 */
const ADMISSION_LIVE_STATES: ReadonlySet<WorkerState> = new Set([
  "queued", "spawning", "initializing", "idle", "working",
  "waiting", "blocked", "paused",
])

export function isAdmissionLive(state: WorkerState): boolean {
  return ADMISSION_LIVE_STATES.has(state)
}
