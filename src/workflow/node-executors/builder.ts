/**
 * P16-WF-EXEC — Builder Node Executor
 *
 * Invokes the orchestrator's build step to produce an artifact. Enforces the
 * invariant that a builder MUST NOT write to the project directly: its output
 * is routed only through ArtifactManager / MergeManager.
 *
 * The heavy LLM work lives in the orchestrator (src/orchestrator/runner.ts).
 * This executor depends on a BuilderBackend interface supplied by the real
 * wiring, so it stays real against the interface without hard-coupling to the
 * provider stack.
 *
 * Config shape:
 *   {
 *     prompt: string,
 *     artifactKind?: string,
 *     title?: string
 *   }
 */

import type { JsonValue, ArtifactId, ArtifactKind, SessionId } from "@/core/types"
import type { WorkflowNodeResult, NodeFailure } from "../workflow-types"
import {
  type ExecutorInput,
  type NodeExecutor,
  okResult,
  failResult,
  readConfig,
} from "./types"
import { brand } from "@/core/types"

/** Backend that performs the real build (orchestrator). */
export interface BuilderBackend {
  build(input: {
    prompt: string
    workspaceId: string
    projectId: string
    sessionId: string
    runId: string
    nodeId: string
  }): Promise<{ artifactId: ArtifactId; content: string }>
}

export interface BuilderExecutorDeps {
  readonly backend: BuilderBackend
}

export function createBuilderExecutor(deps: BuilderExecutorDeps): NodeExecutor {
  return async (input: ExecutorInput): Promise<WorkflowNodeResult> => {
    const { request, services } = input
    const prompt = readConfig<string>(request.config, "prompt")
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return failResult(request.executionId, "builder_no_prompt", "Builder node missing prompt")
    }

    if (!deps.backend) {
      return failResult(
        request.executionId,
        "builder_no_backend",
        "Builder backend not configured",
      )
    }

    let built: { artifactId: ArtifactId; content: string }
    try {
      built = await deps.backend.build({
        prompt,
        workspaceId: request.workspaceId,
        projectId: request.projectId,
        sessionId: request.sessionId,
        runId: request.runId,
        nodeId: request.nodeId,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return failResult(request.executionId, "builder_failed", `Build failed: ${message}`)
    }

    // Enforce routing through ArtifactManager / MergeManager only.
    const artifactManager = services.artifactManager
    const mergeManager = services.mergeManager
    if (!artifactManager) {
      return failResult(
        request.executionId,
        "builder_no_artifact_manager",
        "Builder requires ArtifactManager to route output (must not write to project directly)",
      )
    }

    // Register the artifact via ArtifactManager (the only allowed write path).
    let artifactId: ArtifactId = built.artifactId
    try {
      const result = artifactManager.create({
        kind: (readConfig<string>(request.config, "artifactKind") ?? "code") as ArtifactKind,
        title: readConfig<string>(request.config, "title") ?? `Build: ${request.nodeId}`,
        content: built.content,
        contentType: "text/plain",
        workspaceId: request.workspaceId,
        projectId: request.projectId,
        sessionId: request.sessionId as SessionId,
        sourceNodeId: request.nodeId,
        executionId: brand(request.executionId),
      })
      artifactId = result.artifact.id
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return failResult(
        request.executionId,
        "builder_artifact_create_failed",
        `Artifact registration failed: ${message}`,
      )
    }

    // If a MergeManager is present, mark readiness to merge (does not write
    // to the project tree directly).
    if (mergeManager) {
      mergeManager.apply(artifactId, request.workspaceId)
    }

    const outputs: Record<string, JsonValue> = {
      artifactId: artifactId,
      content: built.content,
    }
    return okResult(request.executionId, outputs)
  }
}

/** Default failure shape helper retained for typing symmetry. */
export function builderFailure(_f: NodeFailure): NodeFailure {
  return _f
}
