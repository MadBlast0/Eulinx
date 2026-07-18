/**
 * P08-WORKER-HEALTH — Worker Health Monitoring
 *
 * WorkerMonitoring-Part01 through Part05: heartbeats, stalls, health probes,
 * output tailing, and alerting.
 *
 * From WorkerMonitoring-Part01: health states and monitoring model.
 * From WorkerMonitoring-Part02: heartbeats, stalls, process watch.
 */

import type { WorkerId, IsoTimestamp } from "@/core/types"
import type {
  WorkerMonitoringHealth,
  HealthCheckResult,
} from "./worker-types"

// ---------------------------------------------------------------------------
// Heartbeat Tracker
// ---------------------------------------------------------------------------

export interface HeartbeatConfig {
  readonly intervalMs: number
  readonly timeoutMs: number
  readonly maxMissed: number
}

export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  intervalMs: 15_000,
  timeoutMs: 30_000,
  maxMissed: 3,
}

export interface HeartbeatRecord {
  readonly workerId: WorkerId
  readonly seq: number
  readonly receivedAt: IsoTimestamp
}

export class HeartbeatTracker {
  private readonly config: HeartbeatConfig
  private readonly records: Map<string, HeartbeatRecord[]> = new Map()
  private readonly lastHeartbeat: Map<string, IsoTimestamp> = new Map()

  constructor(config: Partial<HeartbeatConfig> = {}) {
    this.config = { ...DEFAULT_HEARTBEAT_CONFIG, ...config }
  }

  /**
   * Record a heartbeat from a worker.
   */
  recordHeartbeat(workerId: WorkerId, seq: number): void {
    const now = new Date().toISOString() as IsoTimestamp
    const existing = this.records.get(workerId) ?? []
    existing.push({ workerId, seq, receivedAt: now })
    this.records.set(workerId, existing)
    this.lastHeartbeat.set(workerId, now)
  }

  /**
   * Get the number of missed heartbeats for a worker.
   */
  getMissedHeartbeats(workerId: WorkerId): number {
    const last = this.lastHeartbeat.get(workerId)
    if (!last) return this.config.maxMissed + 1

    const elapsed = Date.now() - new Date(last).getTime()
    return Math.floor(elapsed / this.config.intervalMs) - 1
  }

  /**
   * Check if a worker has timed out.
   */
  isTimedOut(workerId: WorkerId): boolean {
    return this.getMissedHeartbeats(workerId) > this.config.maxMissed
  }

  /**
   * Get heartbeat history for a worker.
   */
  getHistory(workerId: WorkerId): readonly HeartbeatRecord[] {
    return this.records.get(workerId) ?? []
  }
}

// ---------------------------------------------------------------------------
// Stall Detector (WorkerMonitoring-Part02 §Stall Detection)
// ---------------------------------------------------------------------------

export interface StallConfig {
  readonly workingStallMs: number
  readonly waitingStallMs: number
  readonly idleStallMs: number
}

export const DEFAULT_STALL_CONFIG: StallConfig = {
  workingStallMs: 300_000,  // 5 minutes
  waitingStallMs: 600_000,  // 10 minutes
  idleStallMs: 1_800_000,   // 30 minutes
}

export interface StallCheckResult {
  readonly workerId: WorkerId
  readonly stalled: boolean
  readonly reason?: string
  readonly stallDurationMs?: number
  readonly checkedAt: IsoTimestamp
}

export class StallDetector {
  private readonly config: StallConfig
  private readonly stateEnteredAt: Map<string, IsoTimestamp> = new Map()

  constructor(config: Partial<StallConfig> = {}) {
    this.config = { ...DEFAULT_STALL_CONFIG, ...config }
  }

  /**
   * Record when a worker entered a state.
   */
  recordStateEntry(workerId: WorkerId): void {
    this.stateEnteredAt.set(workerId, new Date().toISOString() as IsoTimestamp)
  }

  /**
   * Check if a worker is stalled in its current state.
   */
  checkStall(workerId: WorkerId, currentState: string): StallCheckResult {
    const enteredAt = this.stateEnteredAt.get(workerId)
    const now = new Date().toISOString() as IsoTimestamp

    if (!enteredAt) {
      return {
        workerId,
        stalled: false,
        checkedAt: now,
      }
    }

    const elapsed = Date.now() - new Date(enteredAt).getTime()
    let stallMs: number | undefined

    switch (currentState) {
      case "working":
        stallMs = this.config.workingStallMs
        break
      case "waiting":
        stallMs = this.config.waitingStallMs
        break
      case "idle":
        stallMs = this.config.idleStallMs
        break
      default:
        return { workerId, stalled: false, checkedAt: now }
    }

    if (elapsed > stallMs) {
      return {
        workerId,
        stalled: true,
        reason: `Worker stalled in '${currentState}' for ${Math.round(elapsed / 1000)}s (limit: ${Math.round(stallMs / 1000)}s)`,
        stallDurationMs: elapsed,
        checkedAt: now,
      }
    }

    return { workerId, stalled: false, checkedAt: now }
  }
}

// ---------------------------------------------------------------------------
// Health Evaluator (WorkerMonitoring-Part01 §WorkerHealthStates)
// ---------------------------------------------------------------------------

export function evaluateWorkerHealth(params: {
  missedHeartbeats: number
  isStalled: boolean
  hasError: boolean
  isProcessAlive: boolean
  state: string
}): WorkerMonitoringHealth {
  if (!params.isProcessAlive) return "terminated"
  if (params.hasError) return "failed"
  if (params.isStalled) return "stalled"
  if (params.missedHeartbeats > 3) return "unsafe"
  if (params.state === "working") return "busy"
  if (params.state === "waiting" || params.state === "blocked") return "waiting"
  if (params.state === "idle") return "healthy"
  if (params.missedHeartbeats > 0) return "healthy" // degraded but alive
  return "healthy"
}

// ---------------------------------------------------------------------------
// Health Monitor (combines heartbeat + stall + health)
// ---------------------------------------------------------------------------

export class WorkerHealthMonitor {
  private readonly heartbeatTracker: HeartbeatTracker
  private readonly stallDetector: StallDetector
  private readonly healthStates: Map<string, WorkerMonitoringHealth> = new Map()

  constructor(
    heartbeatConfig?: Partial<HeartbeatConfig>,
    stallConfig?: Partial<StallConfig>,
  ) {
    this.heartbeatTracker = new HeartbeatTracker(heartbeatConfig)
    this.stallDetector = new StallDetector(stallConfig)
  }

  /**
   * Record a heartbeat.
   */
  recordHeartbeat(workerId: WorkerId, seq: number): void {
    this.heartbeatTracker.recordHeartbeat(workerId, seq)
  }

  /**
   * Record a state entry for stall detection.
   */
  recordStateEntry(workerId: WorkerId): void {
    this.stallDetector.recordStateEntry(workerId)
  }

  /**
   * Evaluate full health for a worker.
   */
  evaluateHealth(
    workerId: WorkerId,
    state: string,
    isProcessAlive: boolean,
    hasError: boolean = false,
  ): HealthCheckResult {
    const missedHeartbeats = this.heartbeatTracker.getMissedHeartbeats(workerId)
    const stallCheck = this.stallDetector.checkStall(workerId, state)

    const health = evaluateWorkerHealth({
      missedHeartbeats,
      isStalled: stallCheck.stalled,
      hasError,
      isProcessAlive,
      state,
    })

    this.healthStates.set(workerId, health)

    return {
      workerId,
      health,
      details: stallCheck.reason ?? (missedHeartbeats > 0 ? `${missedHeartbeats} missed heartbeats` : "OK"),
      checkedAt: new Date().toISOString() as IsoTimestamp,
      missedHeartbeats,
      stallDurationMs: stallCheck.stallDurationMs,
    }
  }

  /**
   * Get the last evaluated health for a worker.
   */
  getHealth(workerId: WorkerId): WorkerMonitoringHealth | undefined {
    return this.healthStates.get(workerId)
  }

  /**
   * Get all unhealthy workers.
   */
  getUnhealthyWorkers(): readonly { workerId: WorkerId; health: WorkerMonitoringHealth }[] {
    const unhealthy: { workerId: WorkerId; health: WorkerMonitoringHealth }[] = []
    for (const [workerId, health] of this.healthStates) {
      if (health !== "healthy" && health !== "busy") {
        unhealthy.push({ workerId: workerId as WorkerId, health })
      }
    }
    return unhealthy
  }
}
