/**
 * P15-ORCH — Orchestrator Types
 *
 * Types for the orchestrator hierarchy: roles, states, plans, refinement loop,
 * and the four refinement role outputs (Builder, Verifier, Critic, Judge).
 * From AIArchitecture-Part01 through Part08, RefinementLoop-Part01 through Part07,
 * Planning-Part01 through Part05.
 */

import type {
  Brand,
  WorkerId,
  TaskId,
  ArtifactId,
  SessionId,
  WorkspaceId,
  IsoTimestamp,
  JsonObject,
} from "@/core/types"
import type { RefinementMode } from "@/core/enums"

// ---------------------------------------------------------------------------
// Orchestrator ID
// ---------------------------------------------------------------------------

export type OrchestratorId = Brand<string, "OrchestratorId">

// ---------------------------------------------------------------------------
// Orchestrator Roles (AIArchitecture-Part02 §Worker Roles)
// ---------------------------------------------------------------------------

export type OrchestratorRole =
  | "planner"
  | "architect"
  | "researcher"
  | "programmer"
  | "reviewer"
  | "debugger"
  | "documentation"
  | "qa"
  | "release"
  | "coordinator"

// ---------------------------------------------------------------------------
// Orchestrator Hierarchy Level (AIArchitecture-Part02 §Orchestrator Hierarchy)
// ---------------------------------------------------------------------------

export type OrchestratorLevel = "root" | "phase" | "task"

// ---------------------------------------------------------------------------
// Orchestrator State
// ---------------------------------------------------------------------------

export type OrchestratorState =
  | "pending"
  | "planning"
  | "delegating"
  | "running"
  | "paused"
  | "awaiting_approval"
  | "completing"
  | "completed"
  | "failed"
  | "cancelled"

// ---------------------------------------------------------------------------
// Orchestrator Config
// ---------------------------------------------------------------------------

export interface OrchestratorConfig {
  readonly id: OrchestratorId
  readonly role: OrchestratorRole
  readonly level: OrchestratorLevel
  readonly displayName: string
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
  readonly projectId: string
  readonly parentOrchestratorId?: OrchestratorId
  readonly refinementMode: RefinementMode
  readonly budgetAllocated: number
  readonly maxWorkers: number
  readonly maxDepth: number
  readonly allowedRoles: readonly OrchestratorRole[]
  readonly promptTemplateId?: string
  readonly modelProfileId?: string
}

// ---------------------------------------------------------------------------
// Orchestrator Runtime State
// ---------------------------------------------------------------------------

export interface OrchestratorSnapshot {
  readonly config: OrchestratorConfig
  readonly state: OrchestratorState
  readonly childOrchestratorIds: readonly OrchestratorId[]
  readonly assignedWorkerIds: readonly WorkerId[]
  readonly taskIds: readonly TaskId[]
  readonly artifactIds: readonly ArtifactId[]
  readonly budgetSpent: number
  readonly currentPass: number
  readonly maxPasses: number
  readonly startedAt?: IsoTimestamp
  readonly completedAt?: IsoTimestamp
  readonly error?: string
}

// ---------------------------------------------------------------------------
// Plan Node (Planning-Part01 §Plan Types, Planning-Part02 §Decomposition)
// ---------------------------------------------------------------------------

export interface PlanNode {
  readonly id: string
  readonly intent: string
  readonly scope: string
  readonly ownerOrchestratorId: OrchestratorId
  readonly ownerRole: OrchestratorRole
  readonly childIds: readonly string[]
  readonly dependencies: readonly string[]
  readonly checklist: readonly ChecklistItem[]
  readonly budgetAllocation: number
  readonly estimatedSubtasks: number
  readonly state: PlanNodeState
  readonly orderConstraint: "sequential" | "parallel" | "any"
  readonly createdAt: IsoTimestamp
  readonly updatedAt: IsoTimestamp
}

export type PlanNodeState =
  | "pending"
  | "ready"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled"

export interface ChecklistItem {
  readonly id: string
  readonly description: string
  readonly completed: boolean
  readonly completedAt?: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Plan (full decomposition tree)
// ---------------------------------------------------------------------------

export interface Plan {
  readonly id: string
  readonly goal: string
  readonly rootOrchestratorId: OrchestratorId
  readonly nodes: Readonly<Record<string, PlanNode>>
  readonly totalBudget: number
  readonly spentBudget: number
  readonly version: number
  readonly createdAt: IsoTimestamp
  readonly updatedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Refinement Loop Mode → Cap Mapping (RefinementLoop-Part02 §Mode Model)
// ---------------------------------------------------------------------------

export const REFINEMENT_MODE_CAPS: Readonly<Record<RefinementMode, number>> = {
  low: 1,
  medium: 2,
  high: 4,
  ultra: 8,
} as const

// ---------------------------------------------------------------------------
// Refinement Loop Outputs
// ---------------------------------------------------------------------------

/** Builder output (RefinementLoop-Part03 §Phase Inputs and Outputs) */
export interface BuilderOutput {
  readonly artifactId: ArtifactId
  readonly artifactType: string
  readonly changeNote: string
  readonly producedAt: IsoTimestamp
  readonly tokenUsage: number
  readonly costMicroUsd: number
}

/** Verifier output (RefinementLoop-Part03 §Phase Inputs and Outputs) */
export interface VerifierOutput {
  readonly passed: boolean
  readonly checks: readonly VerificationCheck[]
  readonly semanticNote?: string
  readonly verifiedAt: IsoTimestamp
  readonly tokenUsage: number
  readonly costMicroUsd: number
}

export interface VerificationCheck {
  readonly name: string
  readonly passed: boolean
  readonly details: string
  readonly checkType: "build" | "lint" | "test" | "typecheck" | "schema" | "semantic"
}

/** Critic output (RefinementLoop-Part03 §Phase Inputs and Outputs) */
export interface CriticOutput {
  readonly issues: readonly CriticIssue[]
  readonly strengths: readonly string[]
  readonly suggestions: readonly string[]
  readonly questions: readonly string[]
  readonly critiquedAt: IsoTimestamp
  readonly tokenUsage: number
  readonly costMicroUsd: number
}

export interface CriticIssue {
  readonly description: string
  readonly severity: "critical" | "major" | "minor"
  readonly location?: string
  readonly suggestion?: string
}

/** Judge output (RefinementLoop-Part03 §Phase Inputs and Outputs, Judge-Part01 §Verdicts) */
export interface JudgeOutput {
  readonly verdict: "accept" | "reject" | "stop"
  readonly rationale: string
  readonly qualityScore: number
  readonly judgedAt: IsoTimestamp
  readonly tokenUsage: number
  readonly costMicroUsd: number
}

// ---------------------------------------------------------------------------
// Refinement Loop State
// ---------------------------------------------------------------------------

export type RefinementLoopPhase =
  | "idle"
  | "building"
  | "verifying"
  | "critiquing"
  | "judging"
  | "accepted"
  | "stopped"
  | "failed"

export interface RefinementLoopState {
  readonly mode: RefinementMode
  readonly phase: RefinementLoopPhase
  readonly currentPass: number
  readonly maxPasses: number
  readonly totalTokenUsage: number
  readonly totalCostMicroUsd: number
  readonly budgetRemaining: number
  readonly bestArtifactId?: ArtifactId
  readonly bestQualityScore: number
  readonly consecutiveNoImprove: number
  readonly passHistory: readonly RefinementPassRecord[]
  readonly startedAt: IsoTimestamp
  readonly lastPhaseAt: IsoTimestamp
}

export interface RefinementPassRecord {
  readonly passNumber: number
  readonly builderOutput: BuilderOutput
  readonly verifierOutput: VerifierOutput
  readonly criticOutput?: CriticOutput
  readonly judgeOutput: JudgeOutput
  readonly totalTokens: number
  readonly totalCostMicroUsd: number
}

// ---------------------------------------------------------------------------
// Orchestrator Events
// ---------------------------------------------------------------------------

export type OrchestratorEventType =
  | "orchestrator.created"
  | "orchestrator.started"
  | "orchestrator.state_changed"
  | "orchestrator.plan_created"
  | "orchestrator.plan_revised"
  | "orchestrator.child_spawned"
  | "orchestrator.child_completed"
  | "orchestrator.child_failed"
  | "orchestrator.worker_assigned"
  | "orchestrator.worker_completed"
  | "orchestrator.budget_warning"
  | "orchestrator.budget_exceeded"
  | "orchestrator.completed"
  | "orchestrator.failed"
  | "orchestrator.cancelled"
  | "refinement.pass_started"
  | "refinement.built"
  | "refinement.verified"
  | "refinement.critiqued"
  | "refinement.judged"
  | "refinement.accepted"
  | "refinement.stopped"

export interface OrchestratorEvent {
  readonly type: OrchestratorEventType
  readonly orchestratorId: OrchestratorId
  readonly timestamp: IsoTimestamp
  readonly data?: JsonObject
}

// ---------------------------------------------------------------------------
// Goal / Intent
// ---------------------------------------------------------------------------

export interface UserGoal {
  readonly id: string
  readonly description: string
  readonly constraints: readonly string[]
  readonly priority: "low" | "medium" | "high" | "critical"
  readonly deadlineAt?: IsoTimestamp
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
  readonly projectId: string
  readonly metadata?: JsonObject
}

// ---------------------------------------------------------------------------
// Progress Aggregation (AIArchitecture-Part02 §Reporting Hierarchy)
// ---------------------------------------------------------------------------

export interface ProgressReport {
  readonly orchestratorId: OrchestratorId
  readonly role: OrchestratorRole
  readonly level: OrchestratorLevel
  readonly percentComplete: number
  readonly tasksTotal: number
  readonly tasksCompleted: number
  readonly tasksFailed: number
  readonly workersActive: number
  readonly budgetSpent: number
  readonly budgetTotal: number
  readonly artifactsProduced: number
  readonly currentPhase?: string
  readonly childReports: readonly ProgressReport[]
  readonly reportedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Role-Specific Configs
// ---------------------------------------------------------------------------

export interface PlannerConfig {
  readonly maxDecompositionDepth: number
  readonly defaultTaskBudget: number
  readonly enableReplanning: boolean
  readonly criticalPathAnalysis: boolean
}

export interface ArchitectConfig {
  readonly enforceStyleGuide: boolean
  readonly requireADRs: boolean
  readonly architecturalDecisionLog: boolean
}

export interface ReviewerConfig {
  readonly enableCritic: boolean
  readonly enableJudge: boolean
  readonly criticModelOverride?: string
  readonly judgeModelOverride?: string
  readonly minQualityScore: number
}

export interface ProgrammerConfig {
  readonly allowedFileExtensions: readonly string[]
  readonly enforceTests: boolean
  readonly maxArtifactSizeBytes: number
}

export interface QAConfig {
  readonly requireTestCoverage: number
  readonly runIntegrationTests: boolean
  readonly runE2ETests: boolean
}

export interface ReleaseConfig {
  readonly requireAllTestsPass: boolean
  readonly requireSecurityAudit: boolean
  readonly requireDocumentationAudit: boolean
  readonly autoTag: boolean
}

// ---------------------------------------------------------------------------
// Re-exports of core types used across the orchestrator module
// ---------------------------------------------------------------------------

export type {
  ArtifactId,
  WorkerId,
  TaskId,
  SessionId,
  WorkspaceId,
  IsoTimestamp,
} from "@/core/types"
