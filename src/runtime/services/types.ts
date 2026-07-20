import type { WorkspaceId, WorkerId, ExecutionId, SessionId, IsoTimestamp, MergeId } from "@/core/types"

export interface ProcessHandle {
  readonly pid: number
  readonly stdin: WritableStream<unknown>
  readonly stdout: ReadableStream<unknown>
  readonly stderr: ReadableStream<unknown>
}

export type ProcessState = "running" | "exited" | "killed" | "error"

export interface ProcessInfo {
  readonly pid: number
  readonly command: string
  readonly args: readonly string[]
  readonly state: ProcessState
  readonly startedAt: IsoTimestamp
  readonly exitCode?: number
}

export interface WorkspaceMetadata {
  readonly id: WorkspaceId
  readonly name: string
  readonly path: string
  readonly openedAt: IsoTimestamp
}

export type ExecutionState = "pending" | "running" | "completed" | "failed" | "cancelled"

export interface ExecutionInfo {
  readonly executionId: ExecutionId
  readonly task: string
  readonly state: ExecutionState
  readonly startedAt?: IsoTimestamp
  readonly completedAt?: IsoTimestamp
  readonly error?: string
}

export interface WorkerConfig {
  readonly model?: string
  readonly permissions?: readonly string[]
  readonly maxTokens?: number
  readonly timeoutMs?: number
}

export interface WorkerInfo {
  readonly workerId: WorkerId
  readonly config: WorkerConfig
  readonly state: "spawning" | "running" | "terminated"
  readonly createdAt: IsoTimestamp
  readonly processId?: number
}

export interface ContextRequest {
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
  readonly query: string
  readonly maxTokens?: number
}

export interface ContextPackage {
  readonly content: string
  readonly tokenCount: number
  readonly sources: readonly string[]
}

export interface MergeRecord {
  readonly mergeId: MergeId
  readonly artifactId: string
  readonly workspaceId: WorkspaceId
  readonly appliedAt: IsoTimestamp
  readonly rolledBackAt?: IsoTimestamp
  readonly error?: string
}
