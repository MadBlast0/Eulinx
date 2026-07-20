/**
 * P16-WF — Workflow Engine Barrel Export
 *
 * DAG execution, branches, parallelism, human approval, retry, resume.
 * From WorkflowEngine-Part01 through Part08, NodeArchitecture-Part01 through Part06,
 * EdgeTypes-Part01 through Part05, ExecutionFlow-Part01 through Part08.
 */

// Types
export type {
  WorkflowRunId,
  NodeId,
  EdgeId,
  SnapshotId,
  NodeRunId,
  DeterminismSeed,
  NodeKind,
  NodeState,
  SkipReason,
  PortValueType,
  PortCardinality,
  PortDefinition,
  PortValueRef,
  BackoffStrategy,
  RetryPolicy,
  FailurePolicy,
  NodeDefinition,
  EdgeKind,
  ActivationPolicy,
  GuardOperand,
  GuardExpr,
  GuardOnError,
  EdgeGuard,
  TransformKind,
  TransformSpec,
  EdgeOrigin,
  EdgeValidationRecord,
  EdgeDefinition,
  EdgeCardinality,
  EdgeRuntimeState,
  GraphSnapshot,
  TriggerKind,
  RunTrigger,
  RunMode,
  RunBudget,
  RunBudgetSpent,
  RunFailureKind,
  RunFailure,
  WorkflowRunState,
  WorkflowRun,
  NodeRuntimeState,
  NodeFailure,
  NodeRun,
  NodeMetrics,
  WorkflowNodeResult,
  ExecutionRequest,
  AdmissionReason,
  RejectionReason,
  AdmissionCandidate,
  EstimatedCost,
  ResourceClaim,
  AdmissionRequest,
  DeferredNode,
  RejectedNode,
  AdmissionResponse,
  WorkflowError,
  WorkflowEngineConfig,
} from "./workflow-types"

export {
  NODE_STATE_TERMINAL,
  RUN_STATE_TERMINAL,
  DEFAULT_RETRY_POLICY,
  isNodeTerminal,
  isRunTerminal,
} from "./workflow-types"

// Graph Mirror
export type { GraphMirror } from "./graph-mirror"
export {
  stateKey,
  parseStateKey,
  computeTopologicalOrder,
  detectCycle,
  isLegalTransition,
  updateNodeState,
  buildMirror,
} from "./graph-mirror"

// Run Context
export type {
  OutputKey,
  InputKey,
  OutputValue,
  ResolvedBinding,
  RunContextWriteLog,
} from "./run-context"
export { RunContext } from "./run-context"

// Workflow Engine
export type {
  WorkflowEventEmitter,
  SchedulerAdapter as SchedulerAdapterIface,
  ExecutionEngineAdapter as ExecutionEngineAdapterIface,
  PersistenceAdapter as PersistenceAdapterIface,
} from "./workflow-engine"
export { WorkflowEngine } from "./workflow-engine"

// Workflow Manager
export type { WorkflowDefinition } from "./workflow-manager"
export { WorkflowManager } from "./workflow-manager"

// Node Executors
export type {
  NodeExecutor,
  ExecutorInput,
  ExecutorServices,
  McpToolProvider,
  BuilderBackend,
  VerifierExecutorDeps,
} from "./node-executors/types"
export { NodeExecutorRegistry } from "./node-executors"
export { evaluateExpression, compileExpression } from "./node-executors/expression"

// Adapters (production)
export { SchedulerAdapter } from "./adapters"
export { ExecutionEngineAdapter } from "./adapters"
export { PersistenceAdapter } from "./adapters"
export { createRealWorkflowEngine } from "./adapters"
