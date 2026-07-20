/**
 * P16-WF-EXEC — Node Executor Registry & Dispatch
 *
 * Maps NodeKind to its executor and provides a single dispatch entry point
 * used by the engine's tick loop. Per-kind execution for Builder/Verifier/
 * Condition/Loop/MCP is implemented; generic kinds (worker/orchestrator/etc.)
 * fall back to the ExecutionEngineAdapter-backed executor.
 */

import type { NodeKind, WorkflowNodeResult, ExecutionRequest } from "../workflow-types"
import type { ExecutionEngineAdapter, PersistenceAdapter } from "../workflow-engine"
import type { RunContext } from "../run-context"
import { ArtifactVerification } from "@/artifact/artifact-verify"
import type { ArtifactManager } from "@/artifact/artifact-manager"
import type { MergeManager } from "@/runtime/services/merge-manager"
import {
  type ExecutorInput,
  type NodeExecutor,
  type ExecutorServices,
  type McpToolProvider,
  okResult,
} from "./types"
import { conditionExecutor } from "./condition"
import { loopExecutor } from "./loop"
import { createBuilderExecutor, type BuilderBackend } from "./builder"
import { createVerifierExecutor, type VerifierExecutorDeps } from "./verifier"
import { createMcpExecutor } from "./mcp"

export interface NodeExecutorRegistryDeps {
  readonly scheduler: ExecutorServices["scheduler"]
  readonly executor: ExecutionEngineAdapter
  readonly persistence: PersistenceAdapter
  readonly builderBackend?: BuilderBackend
  readonly verification?: ArtifactVerification
  readonly resolveArtifactContent?: (artifactId: string) => Promise<string | null> | string | null
  readonly artifactManager?: ArtifactManager
  readonly mergeManager?: MergeManager
  readonly mcp?: McpToolProvider
}

/**
 * Build the per-kind executor map. Returns a registry that can resolve an
 * executor for any NodeKind and dispatch an ExecutionRequest.
 */
export class NodeExecutorRegistry {
  private readonly executors = new Map<NodeKind, NodeExecutor>()
  private readonly deps: NodeExecutorRegistryDeps

  constructor(deps: NodeExecutorRegistryDeps) {
    this.deps = deps
    this.register()
  }

  private register(): void {
    this.executors.set("condition", conditionExecutor)
    this.executors.set("loop", loopExecutor)
    if (this.deps.builderBackend) {
      this.executors.set("builder", createBuilderExecutor({ backend: this.deps.builderBackend }))
    }
    const verifierDeps: VerifierExecutorDeps = {
      verification: this.deps.verification ?? new ArtifactVerification(),
      resolveContent: this.deps.resolveArtifactContent ?? (() => null),
    }
    this.executors.set("verifier", createVerifierExecutor(verifierDeps))
    this.executors.set("mcp", createMcpExecutor(this.deps.mcp))
  }

  get(kind: NodeKind): NodeExecutor | undefined {
    return this.executors.get(kind)
  }

  has(kind: NodeKind): boolean {
    return this.executors.has(kind)
  }

  /**
   * Resolve the executor for a request. Falls back to the base executor for
   * kinds without a dedicated implementation.
   */
  async dispatch(
    request: ExecutionRequest,
    runContext: RunContext,
  ): Promise<WorkflowNodeResult> {
    const executor = this.executors.get(request.kind)
    const services: ExecutorServices = {
      runContext,
      scheduler: this.deps.scheduler,
      executor: this.deps.executor,
      persistence: this.deps.persistence,
      verification: this.deps.verification,
      artifactManager: this.deps.artifactManager,
      mergeManager: this.deps.mergeManager,
      mcp: this.deps.mcp,
    }
    const input: ExecutorInput = { request, services }

    if (executor) {
      return executor(input)
    }

    // Fallback: delegate to the ExecutionEngineAdapter. This covers
    // worker/orchestrator/tool/merge/artifact/memory/input/output/delay/
    // human_approval — their real behavior is supplied by the runtime.
    return this.fallback(request)
  }

  private async fallback(request: ExecutionRequest): Promise<WorkflowNodeResult> {
    const result = await this.deps.executor.execute(request)
    return result.ok ? okResult(request.executionId, result.outputs) : result
  }
}
