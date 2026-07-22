/**
 * P07-SESSION-CREATE â€” Session Manager
 *
 * Orchestrates session lifecycle: creation, state transitions, worker/task/artifact
 * tracking, event emission, and cleanup. Integrates with session-state for
 * persistence and session-types for contracts.
 *
 * From Session-Part01: responsibilities and architecture.
 * From Session-Part02: lifecycle, state machine, runtime interaction.
 * From Session-Part03: recovery, replay, persistence, metrics.
 */

import type { SessionId, WorkspaceId, WorkerId, IsoTimestamp } from "@/core/types"
import type {
  SessionCreateRequest,
  SessionHandle,
  SessionMetadata,
  SessionEvent,
  SessionEventKind,
  SessionContext,
  SessionContextEvent,
  SessionHistoryEntry,
} from "./session-types"
import type { PersistedSessionState, SessionMetrics, SessionState } from "@/state/session-state"
import {
  createPersistedSessionState,
  transitionSessionState,
  addSessionWorker,
  removeSessionWorker,
  updateSessionMetrics,
  canSessionTransition,
  SESSION_TERMINAL,
} from "@/state/session-state"
import { getBus } from "@/ui/workspace/runtime-store"
import { raiseNotification } from "@/event-bus/notification-bridge"
import type { HelixDBClient } from "@/integrations/helixdb/helixdb-client"
import { LABEL_SESSION, EDGE_BRANCHED_FROM } from "@/integrations/helixdb/helixdb-types"
import { getConfig } from "@/core/config"

// ---------------------------------------------------------------------------
// Session Manager Configuration
// ---------------------------------------------------------------------------

export interface SessionManagerConfig {
  readonly maxActiveSessions: number
  readonly maxWorkersPerSession: number
  readonly maxEventsPerSession: number
}

export const DEFAULT_SESSION_MANAGER_CONFIG: SessionManagerConfig = {
  maxActiveSessions: 1,
  maxWorkersPerSession: 32,
  maxEventsPerSession: 100_000,
}

// ---------------------------------------------------------------------------
// Session Manager
// ---------------------------------------------------------------------------

export class SessionManager {
  private readonly config: SessionManagerConfig
  private readonly sessions: Map<string, PersistedSessionState> = new Map()
  private readonly metadata: Map<string, SessionMetadata> = new Map()
  private readonly events: Map<string, SessionEvent[]> = new Map()
  private readonly eventHandlers: Array<(event: SessionEvent) => void> = []
  private activeSessionId: SessionId | null = null
  private readonly helixdbClient: HelixDBClient | null

  constructor(config: Partial<SessionManagerConfig> = {}, helixdbClient?: HelixDBClient) {
    this.config = { ...DEFAULT_SESSION_MANAGER_CONFIG, ...config }
    this.helixdbClient = helixdbClient ?? null
  }

  // ---------------------------------------------------------------------------
  // Session Creation (P07-SESSION-CREATE)
  // ---------------------------------------------------------------------------

  /**
   * Create a new session.
   * Session-Part02: Created â†’ Initializing â†’ Loading Workspace â†’ Starting Services â†’ Running.
   */
  async createSession(request: SessionCreateRequest): Promise<SessionHandle> {
    // Enforce single active session
    const activeCount = this.countActiveSessions()
    if (activeCount >= this.config.maxActiveSessions) {
      throw new Error(`Max active sessions (${this.config.maxActiveSessions}) reached`)
    }

    // Generate session ID
    const sessionId = `ses_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}` as SessionId

    // Create persisted state
    const state = createPersistedSessionState(sessionId, request.workspaceId, request.runtimeId, request.kind)
    this.sessions.set(sessionId, state)

    // Create metadata
    const now = new Date().toISOString() as IsoTimestamp
    const meta: SessionMetadata = {
      sessionId,
      workspaceId: request.workspaceId,
      runtimeId: request.runtimeId,
      kind: request.kind,
      parentSessionId: request.parentSessionId,
      branchPoint: request.branchFromEventSeq,
      createdAt: now,
      updatedAt: now,
    }
    this.metadata.set(sessionId, meta)

    // Initialize event log
    this.events.set(sessionId, [])

    // Emit created event
    this.emitEvent(sessionId, request.workspaceId, "session.created", "system", request.reason)

    this.activeSessionId = sessionId

    // Persist Session node to HelixDB if enabled
    if (getConfig().helixdb.enabled && this.helixdbClient) {
      void this.helixdbClient.query({
        query: `addN("${LABEL_SESSION}", $props)`,
        params: {
          props: {
            id: sessionId,
            workspaceId: request.workspaceId,
            runtimeId: request.runtimeId,
            kind: request.kind,
            state: "created",
            displayName: request.reason ?? null,
            parentSessionId: request.parentSessionId ?? null,
            branchPoint: request.branchFromEventSeq ?? null,
            createdAt: now,
            updatedAt: now,
          },
        },
      })
    }

    return {
      sessionId,
      workspaceId: request.workspaceId,
      state: state.state,
      createdAt: now,
    }
  }

  // ---------------------------------------------------------------------------
  // State Transitions (P07-SESSION-CREATE lifecycle)
  // ---------------------------------------------------------------------------

  /**
   * Transition a session to a new state.
   * Session-Part02: The Runtime MUST transition Session states.
   */
  transitionSession(sessionId: SessionId, newState: string, reason: string): void {
    const state = this.sessions.get(sessionId)
    if (!state) throw new Error(`Session ${sessionId} not found`)

    const eventKind = this.stateToEventKind(newState)
    if (eventKind) {
      this.emitEvent(sessionId, state.workspaceId, eventKind, "runtime", reason)
    }

    const updated = transitionSessionState(state, newState as never, reason)
    this.sessions.set(sessionId, updated)

    const terminalStates = new Set(["failed", "cancelled", "completed"])
    if (terminalStates.has(newState)) {
      const severity = newState === "completed" ? "info" : "error"
      const message = newState === "completed"
        ? `Session ${sessionId} completed`
        : newState === "failed"
          ? `Session ${sessionId} failed: ${reason}`
          : `Session ${sessionId} cancelled: ${reason}`
      void raiseNotification(getBus(), {
        message,
        severity,
        subjectId: sessionId,
        workspaceId: state.workspaceId,
        sessionId,
      })
    }
  }

  /**
   * Convenience: advance session through the initialization sequence.
   */
  async initializeSession(sessionId: SessionId): Promise<void> {
    this.transitionSession(sessionId, "initializing", "Boot sequence start")
    this.transitionSession(sessionId, "loading_workspace", "Loading workspace metadata")
    this.transitionSession(sessionId, "starting_services", "Starting runtime services")
    this.transitionSession(sessionId, "running", "Session ready")
  }

  /**
   * Pause a running session.
   */
  pauseSession(sessionId: SessionId, reason: string): void {
    this.transitionSession(sessionId, "paused", reason)
  }

  /**
   * Resume a paused session.
   */
  resumeSession(sessionId: SessionId, reason: string): void {
    this.transitionSession(sessionId, "resumed", reason)
    this.transitionSession(sessionId, "running", "Resumed from pause")
  }

  /**
   * Complete a session gracefully.
   */
  completeSession(sessionId: SessionId): void {
    this.transitionSession(sessionId, "completing", "Finalizing")
    this.transitionSession(sessionId, "completed", "Done")
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null
    }
  }

  /**
   * Archive a completed session.
   */
  archiveSession(sessionId: SessionId): void {
    this.transitionSession(sessionId, "archived", "Archived for replay")
  }

  /**
   * Fail a session.
   */
  failSession(sessionId: SessionId, reason: string): void {
    this.transitionSession(sessionId, "failed", reason)
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null
    }
  }

  /**
   * Cancel a session.
   */
  cancelSession(sessionId: SessionId, reason: string): void {
    this.transitionSession(sessionId, "cancelled", reason)
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null
    }
  }

  // ---------------------------------------------------------------------------
  // HelixDB Recovery (T16.1)
  // ---------------------------------------------------------------------------

  /**
   * Recover session state from HelixDB when in-memory state is lost.
   * Returns null if HelixDB disabled, client missing, or session not found.
   */
  async recoverSession(sessionId: SessionId): Promise<PersistedSessionState | null> {
    if (!getConfig().helixdb.enabled || !this.helixdbClient) return null
    if (this.sessions.has(sessionId)) return this.sessions.get(sessionId)!

    const result = await this.helixdbClient.query({
      query: `nWithLabelWhere("${LABEL_SESSION}", eq("id", "${sessionId}"))`,
    })

    if (!result.ok || result.value.results.length === 0) return null

    const row = result.value.results[0] as Record<string, unknown>
    const state = createPersistedSessionState(
      sessionId,
      row.workspaceId as WorkspaceId,
      row.runtimeId as string,
      row.kind as "chat" | "terminal" | "agent",
    )

    const restored = transitionSessionState(state, ((row.state as string) ?? "created") as SessionState, "Recovered from HelixDB")
    this.sessions.set(sessionId, restored)

    const now = new Date().toISOString() as IsoTimestamp
    const meta: SessionMetadata = {
      sessionId,
      workspaceId: row.workspaceId as WorkspaceId,
      runtimeId: row.runtimeId as string,
      kind: (row.kind as SessionCreateRequest["kind"]) ?? "chat",
      parentSessionId: row.parentSessionId as SessionId | undefined,
      branchPoint: row.branchPoint as number | undefined,
      createdAt: (row.createdAt as IsoTimestamp) ?? now,
      updatedAt: now,
    }
    this.metadata.set(sessionId, meta)
    this.events.set(sessionId, [])

    this.emitEvent(sessionId, row.workspaceId as WorkspaceId, "session.recovering", "system", "Recovered from HelixDB")
    this.activeSessionId = sessionId

    return restored
  }

  // ---------------------------------------------------------------------------
  // HelixDB Branching (T16.1)
  // ---------------------------------------------------------------------------

  /**
   * Create a BRANCHED_FROM edge in HelixDB linking the new session to its source.
   */
  async branchSession(newSessionId: SessionId, sourceSessionId: SessionId): Promise<void> {
    if (!getConfig().helixdb.enabled || !this.helixdbClient) return

    const meta = this.metadata.get(newSessionId)
    const branchPoint = meta?.branchPoint ?? null

    await this.helixdbClient.query({
      query: `addE("${EDGE_BRANCHED_FROM}", nWithLabelWhere("${LABEL_SESSION}", eq("id", "${newSessionId}")), nWithLabelWhere("${LABEL_SESSION}", eq("id", "${sourceSessionId}")), $props)`,
      params: {
        props: {
          forkedAtEventSeq: branchPoint,
          createdAt: new Date().toISOString(),
        },
      },
    })
  }

  // ---------------------------------------------------------------------------
  // Worker Management (P07-SESSION-META)
  // ---------------------------------------------------------------------------

  /**
   * Add a worker to the session's active list.
   */
  addWorker(sessionId: SessionId, workerId: WorkerId): void {
    const state = this.sessions.get(sessionId)
    if (!state) throw new Error(`Session ${sessionId} not found`)

    if (state.activeWorkerIds.length >= this.config.maxWorkersPerSession) {
      throw new Error(`Max workers per session (${this.config.maxWorkersPerSession}) reached`)
    }

    const updated = addSessionWorker(state, workerId)
    this.sessions.set(sessionId, updated)

    this.emitEvent(sessionId, state.workspaceId, "session.worker_added", "spawner", `Worker ${workerId} added`)
  }

  /**
   * Remove a worker from the session's active list.
   */
  removeWorker(sessionId: SessionId, workerId: WorkerId): void {
    const state = this.sessions.get(sessionId)
    if (!state) throw new Error(`Session ${sessionId} not found`)

    const updated = removeSessionWorker(state, workerId)
    this.sessions.set(sessionId, updated)

    this.emitEvent(sessionId, state.workspaceId, "session.worker_removed", "spawner", `Worker ${workerId} removed`)
  }

  // ---------------------------------------------------------------------------
  // Task Management (P07-SESSION-META)
  // ---------------------------------------------------------------------------

  addTask(sessionId: SessionId, taskId: string): void {
    const state = this.sessions.get(sessionId)
    if (!state) throw new Error(`Session ${sessionId} not found`)

    if (state.activeTaskIds.includes(taskId)) return

    const now = new Date().toISOString() as IsoTimestamp
    const updated: PersistedSessionState = {
      ...state,
      activeTaskIds: [...state.activeTaskIds, taskId],
      lastPersistedAt: now,
      metadata: { ...state.metadata, updatedAt: now, version: state.metadata.version + 1 },
    }
    this.sessions.set(sessionId, updated)

    this.emitEvent(sessionId, state.workspaceId, "session.task_added", "scheduler", `Task ${taskId} added`)
  }

  removeTask(sessionId: SessionId, taskId: string): void {
    const state = this.sessions.get(sessionId)
    if (!state) throw new Error(`Session ${sessionId} not found`)

    const idx = state.activeTaskIds.indexOf(taskId)
    if (idx < 0) return

    const now = new Date().toISOString() as IsoTimestamp
    const updatedIds = [...state.activeTaskIds]
    updatedIds.splice(idx, 1)
    const updated: PersistedSessionState = {
      ...state,
      activeTaskIds: updatedIds,
      lastPersistedAt: now,
      metadata: { ...state.metadata, updatedAt: now, version: state.metadata.version + 1 },
    }
    this.sessions.set(sessionId, updated)

    this.emitEvent(sessionId, state.workspaceId, "session.task_removed", "scheduler", `Task ${taskId} removed`)
  }

  // ---------------------------------------------------------------------------
  // Artifact Tracking (P07-SESSION-META)
  // ---------------------------------------------------------------------------

  addArtifact(sessionId: SessionId, artifactId: string): void {
    const state = this.sessions.get(sessionId)
    if (!state) throw new Error(`Session ${sessionId} not found`)

    if (state.artifactIds.includes(artifactId)) return

    const now = new Date().toISOString() as IsoTimestamp
    const updated: PersistedSessionState = {
      ...state,
      artifactIds: [...state.artifactIds, artifactId],
      metrics: { ...state.metrics, totalArtifactsCreated: state.metrics.totalArtifactsCreated + 1 },
      lastPersistedAt: now,
      metadata: { ...state.metadata, updatedAt: now, version: state.metadata.version + 1 },
    }
    this.sessions.set(sessionId, updated)

    this.emitEvent(sessionId, state.workspaceId, "session.artifact_added", "artifact_manager", `Artifact ${artifactId} added`)
  }

  // ---------------------------------------------------------------------------
  // Metrics (P07-SESSION-META)
  // ---------------------------------------------------------------------------

  updateMetrics(sessionId: SessionId, metrics: Partial<SessionMetrics>): void {
    const state = this.sessions.get(sessionId)
    if (!state) throw new Error(`Session ${sessionId} not found`)

    const updated = updateSessionMetrics(state, metrics)
    this.sessions.set(sessionId, updated)
  }

  // ---------------------------------------------------------------------------
  // Session Context (P07-SESSION-CTX)
  // ---------------------------------------------------------------------------

  /**
   * Build a context snapshot for injection into workers.
   * From ContextInjection: assemble smallest useful context.
   */
  buildContext(sessionId: SessionId): SessionContext | null {
    const state = this.sessions.get(sessionId)
    if (!state) return null

    const sessionEvents = this.events.get(sessionId) ?? []
    const recentEvents: SessionContextEvent[] = sessionEvents
      .slice(-20)
      .map(e => ({
        eventSeq: e.eventSeq,
        eventType: e.kind,
        timestamp: e.timestamp,
        summary: e.detail ?? e.kind,
      }))

    return {
      sessionId,
      workspaceId: state.workspaceId,
      activeWorkerIds: [...state.activeWorkerIds],
      activeTaskIds: [...state.activeTaskIds],
      recentEvents,
      metrics: { ...state.metrics },
    }
  }

  // ---------------------------------------------------------------------------
  // Session History (P07-SESSION-HISTORY)
  // ---------------------------------------------------------------------------

  /**
   * Get the full event history for a session.
   */
  getHistory(sessionId: SessionId): readonly SessionHistoryEntry[] {
    const sessionEvents = this.events.get(sessionId) ?? []
    return sessionEvents.map(e => ({
      eventSeq: e.eventSeq,
      eventType: e.kind,
      actor: e.actor,
      timestamp: e.timestamp,
      detail: e.detail ?? "",
      metadata: e.metadata,
    }))
  }

  // ---------------------------------------------------------------------------
  // Query API
  // ---------------------------------------------------------------------------

  getSession(sessionId: SessionId): PersistedSessionState | undefined {
    return this.sessions.get(sessionId)
  }

  getMetadata(sessionId: SessionId): SessionMetadata | undefined {
    return this.metadata.get(sessionId)
  }

  getActiveSessionId(): SessionId | null {
    return this.activeSessionId
  }

  getActiveSession(): PersistedSessionState | null {
    if (!this.activeSessionId) return null
    return this.sessions.get(this.activeSessionId) ?? null
  }

  isSessionTerminal(sessionId: SessionId): boolean {
    const state = this.sessions.get(sessionId)
    if (!state) return false
    return (SESSION_TERMINAL as readonly string[]).includes(state.state)
  }

  isSessionActive(sessionId: SessionId): boolean {
    const state = this.sessions.get(sessionId)
    if (!state) return false
    return !this.isSessionTerminal(sessionId)
  }

  canTransition(sessionId: SessionId, targetState: string): boolean {
    const state = this.sessions.get(sessionId)
    if (!state) return false
    return canSessionTransition(state.state, targetState as never)
  }

  countActiveSessions(): number {
    let count = 0
    for (const state of this.sessions.values()) {
      if (!this.isTerminal(state.state)) count++
    }
    return count
  }

  getAllSessions(): readonly PersistedSessionState[] {
    return [...this.sessions.values()]
  }

  getEvents(sessionId: SessionId): readonly SessionEvent[] {
    return [...(this.events.get(sessionId) ?? [])]
  }

  // ---------------------------------------------------------------------------
  // Event Subscription
  // ---------------------------------------------------------------------------

  onEvent(handler: (event: SessionEvent) => void): () => void {
    this.eventHandlers.push(handler)
    return () => {
      const idx = this.eventHandlers.indexOf(handler)
      if (idx >= 0) this.eventHandlers.splice(idx, 1)
    }
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private emitEvent(
    sessionId: SessionId,
    workspaceId: WorkspaceId,
    kind: SessionEventKind,
    actor: string,
    detail?: string,
  ): void {
    const sessionEvents = this.events.get(sessionId) ?? []
    const eventSeq = sessionEvents.length + 1
    const now = new Date().toISOString() as IsoTimestamp

    const event: SessionEvent = {
      kind,
      sessionId,
      workspaceId,
      eventSeq,
      timestamp: now,
      actor,
      detail,
    }

    sessionEvents.push(event)
    this.events.set(sessionId, sessionEvents)

    for (const handler of this.eventHandlers) {
      try {
        handler(event)
      } catch {
        console.warn('eulinx: session-manager : unexpected error in catch block')
        // Event handlers must not throw
      }
    }
  }

  private stateToEventKind(state: string): SessionEventKind | null {
    const map: Record<string, SessionEventKind> = {
      initializing: "session.initialized",
      loading_workspace: "session.workspace_loaded",
      starting_services: "session.services_started",
      running: "session.started",
      paused: "session.paused",
      resumed: "session.resumed",
      completing: "session.completing",
      completed: "session.completed",
      archived: "session.archived",
      failed: "session.failed",
      cancelled: "session.cancelled",
      recovering: "session.recovering",
    }
    return map[state] ?? null
  }

  private isTerminal(state: string): boolean {
    return (SESSION_TERMINAL as readonly string[]).includes(state)
  }
}

