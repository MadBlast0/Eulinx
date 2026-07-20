import type { RefinementMode } from "@/core/enums"
import type { IsoTimestamp, Duration } from "@/core/types"
import type { Plan, OrchestratorRole } from "./orchestrator-types"

export interface TaskContext {
  readonly workspaceId?: string
  readonly sessionId?: string
  readonly projectId?: string
  readonly refinementMode?: RefinementMode
  readonly budget?: number
  readonly modelProfileId?: string
  readonly providerId?: string
}

export interface ArtifactEntry {
  readonly id: string
  readonly type: string
  readonly content: string
  readonly label: string
  readonly role: OrchestratorRole
}

export interface TaskResult {
  readonly taskId: string
  readonly task: string
  readonly status: "completed" | "failed" | "cancelled"
  readonly plan?: Plan
  readonly artifacts: readonly ArtifactEntry[]
  readonly summary: string
  readonly totalTokens: number
  readonly totalCost: number
  readonly duration: number
  readonly error?: string
  readonly startedAt: IsoTimestamp
  readonly completedAt: IsoTimestamp
}

export type RunStatus = "idle" | "running" | "completed" | "failed" | "cancelled"
