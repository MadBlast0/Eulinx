/**
 * P15-ORCH — Orchestrator System Barrel Export
 *
 * AI reasoning roles: Planner, Architect, Researcher, Programmer, Reviewer,
 * Debugger, Documentation, QA, Release, Coordinator.
 * From AIArchitecture-Part01 through Part08.
 */

// Types
export type {
  OrchestratorId,
  OrchestratorRole,
  OrchestratorLevel,
  OrchestratorState,
  OrchestratorConfig,
  OrchestratorState as OrchestratorStateSnapshot,
  PlanNode,
  PlanNodeState,
  ChecklistItem,
  Plan,
  BuilderOutput,
  VerifierOutput,
  VerificationCheck,
  CriticOutput,
  CriticIssue,
  JudgeOutput,
  RefinementLoopPhase,
  RefinementLoopState,
  RefinementPassRecord,
  OrchestratorEventType,
  OrchestratorEvent,
  UserGoal,
  ProgressReport,
  PlannerConfig,
  ArchitectConfig,
  ReviewerConfig,
  ProgrammerConfig,
  QAConfig,
  ReleaseConfig,
} from "./orchestrator-types"

export {
  REFINEMENT_MODE_CAPS,
} from "./orchestrator-types"

// Base Orchestrator
export { BaseOrchestrator } from "./orchestrator-base"

// Refinement Loop
export type {
  RefinementLoopInput,
  RefinementLoopResult,
  RoleExecutors,
  BuildInput,
  VerifyInput,
  CritiqueInput,
  JudgeInput,
} from "./refinement-loop"

export { RefinementLoopEngine } from "./refinement-loop"

// Roles
export { PlannerOrchestrator } from "./roles/planner"
export { CoordinatorOrchestrator } from "./roles/coordinator"
export { ProgrammerOrchestrator } from "./roles/programmer"
export { ReviewerOrchestrator } from "./roles/reviewer"
export { ArchitectOrchestrator, type ArchitectureDecision, type ArchitectureDesign, type ComponentDesign, type InterfaceDesign } from "./roles/architect"
export { ResearcherOrchestrator, type ResearchFinding, type ResearchReport } from "./roles/researcher"
export { DebuggerOrchestrator, type Diagnosis, type DiagnosisReport } from "./roles/debugger"
export { DocumentationOrchestrator, type DocType, type DocArtifact } from "./roles/documentation"
export { QAOrchestrator, type TestSuite, type TestCase, type TestResult, type QAReport } from "./roles/qa"
export { ReleaseOrchestrator, type ReleaseStep, type ReleaseResult } from "./roles/release"
