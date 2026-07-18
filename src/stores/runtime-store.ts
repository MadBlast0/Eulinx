/**
 * P18-UI-DASH — Runtime Store (Zustand)
 *
 * Tier 1 state: runtime mirror. Workers, Sessions, Artifacts, Workflow graphs.
 * Written ONLY by EventBus event handlers and invoke results.
 * From README §State Ownership Model.
 */

import { create } from "zustand"

// ---------------------------------------------------------------------------
// Worker State
// ---------------------------------------------------------------------------

export type WorkerState = "idle" | "working" | "blocked" | "failed" | "terminated"

export interface Worker {
  readonly id: string
  readonly role: string
  readonly state: WorkerState
  readonly sessionId: string | null
  readonly health: "healthy" | "unhealthy" | "unknown"
  readonly tokensUsed: number
  readonly costUsd: number
  readonly createdAt: string
  readonly updatedAt: string
}

// ---------------------------------------------------------------------------
// Session State
// ---------------------------------------------------------------------------

export type SessionKind = "chat" | "terminal" | "agent"

export interface Session {
  readonly id: string
  readonly kind: SessionKind
  readonly state: "active" | "paused" | "closed"
  readonly messageCount: number
  readonly createdAt: string
}

// ---------------------------------------------------------------------------
// Artifact State
// ---------------------------------------------------------------------------

export type ArtifactState = "proposed" | "verified" | "merged" | "rejected"

export interface Artifact {
  readonly id: string
  readonly kind: string
  readonly state: ArtifactState
  readonly size: number
  readonly producedBy: string
  readonly createdAt: string
}

// ---------------------------------------------------------------------------
// Workflow Run State
// ---------------------------------------------------------------------------

export type WorkflowRunState = "running" | "paused" | "succeeded" | "failed" | "cancelled"

export interface WorkflowRun {
  readonly runId: string
  readonly workflowId: string
  readonly state: WorkflowRunState
  readonly completedNodes: number
  readonly totalNodes: number
  readonly startedAt: string
}

// ---------------------------------------------------------------------------
// Runtime Store
// ---------------------------------------------------------------------------

interface RuntimeState {
  readonly workers: Record<string, Worker>
  readonly sessions: Record<string, Session>
  readonly artifacts: Record<string, Artifact>
  readonly workflowRuns: Record<string, WorkflowRun>
  readonly isConnected: boolean

  // Actions
  readonly applyWorkerStateChanged: (data: { workerId: string } & Partial<Worker>) => void
  readonly applyWorkerCreated: (worker: Worker) => void
  readonly applyWorkerRemoved: (workerId: string) => void
  readonly applySessionUpdated: (session: Session) => void
  readonly applyArtifactCreated: (artifact: Artifact) => void
  readonly applyArtifactStateChanged: (data: { artifactId: string; state: ArtifactState }) => void
  readonly applyWorkflowRunUpdated: (run: WorkflowRun) => void
  readonly setConnected: (connected: boolean) => void
  readonly reset: () => void
}

const initialState = {
  workers: {},
  sessions: {},
  artifacts: {},
  workflowRuns: {},
  isConnected: false,
}

export const useRuntimeStore = create<RuntimeState>((set) => ({
  ...initialState,

  applyWorkerStateChanged: (data) =>
    set((state) => {
      const existing = state.workers[data.workerId]
      if (!existing) return state
      return {
        workers: {
          ...state.workers,
          [data.workerId]: { ...existing, ...data, updatedAt: new Date().toISOString() },
        },
      }
    }),

  applyWorkerCreated: (worker) =>
    set((state) => ({
      workers: { ...state.workers, [worker.id]: worker },
    })),

  applyWorkerRemoved: (workerId) =>
    set((state) => {
      const { [workerId]: _, ...rest } = state.workers
      return { workers: rest }
    }),

  applySessionUpdated: (session) =>
    set((state) => ({
      sessions: { ...state.sessions, [session.id]: session },
    })),

  applyArtifactCreated: (artifact) =>
    set((state) => ({
      artifacts: { ...state.artifacts, [artifact.id]: artifact },
    })),

  applyArtifactStateChanged: (data) =>
    set((state) => {
      const existing = state.artifacts[data.artifactId]
      if (!existing) return state
      return {
        artifacts: {
          ...state.artifacts,
          [data.artifactId]: { ...existing, state: data.state },
        },
      }
    }),

  applyWorkflowRunUpdated: (run) =>
    set((state) => ({
      workflowRuns: { ...state.workflowRuns, [run.runId]: run },
    })),

  setConnected: (connected) => set({ isConnected: connected }),

  reset: () => set(initialState),
}))
