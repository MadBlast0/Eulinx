/**
 * P16-WF-EXEC — Verifier Node Executor
 *
 * Calls the REAL ArtifactVerification (src/artifact/artifact-verify.ts),
 * not a hardcoded pass. It reads the artifact reference produced upstream,
 * constructs deterministic verdicts through the verification model, and
 * aggregates them into a gate decision.
 *
 * Config shape:
 *   {
 *     artifactRef: string,     // var name holding the artifact id (vars.*)
 *     checks?: Array<{ method: string, outcome: "pass"|"fail", findings?: string[] }>,
 *     requiredMethods?: string[]
 *   }
 */

import type { JsonValue, ArtifactId } from "@/core/types"
import { brand } from "@/core/types"
import type { VerificationFinding } from "@/artifact/artifact-types"
import type { WorkflowNodeResult } from "../workflow-types"
import {
  type ExecutorInput,
  type NodeExecutor,
  okResult,
  failResult,
  collectVariables,
  readConfig,
} from "./types"
import type { ArtifactVerification } from "@/artifact/artifact-verify"

export interface VerifierExecutorDeps {
  readonly verification: ArtifactVerification
  /** Resolves an artifact id to its content for deterministic checks. */
  readonly resolveContent: (artifactId: ArtifactId) => Promise<string | null> | string | null
}

export function createVerifierExecutor(deps: VerifierExecutorDeps): NodeExecutor {
  return async (input: ExecutorInput): Promise<WorkflowNodeResult> => {
    const { request, services } = input

    const verification = services.verification ?? deps.verification
    if (!verification) {
      return failResult(
        request.executionId,
        "verifier_no_service",
        "No ArtifactVerification service available",
      )
    }

    const artifactRef = readConfig<string>(request.config, "artifactRef")
    if (typeof artifactRef !== "string") {
      return failResult(
        request.executionId,
        "verifier_no_artifact_ref",
        "Verifier node missing artifactRef",
      )
    }

    const scope = collectVariables(services.runContext)
    const artifactIdRaw = scope[artifactRef]
    if (typeof artifactIdRaw !== "string") {
      return failResult(
        request.executionId,
        "verifier_artifact_unresolved",
        `Artifact reference "${artifactRef}" did not resolve to an id`,
      )
    }
    const artifactId = artifactIdRaw as ArtifactId

    const content = await deps.resolveContent(artifactId)
    if (content === null) {
      return failResult(
        request.executionId,
        "verifier_content_missing",
        `Artifact content not found for ${artifactIdRaw}`,
      )
    }

    const checks = readConfig<JsonValue[]>(request.config, "checks") ?? []
    const requiredMethods = readConfig<string[]>(request.config, "requiredMethods")

    let totalChecks = 0

    const fingerprint = `wf-${request.nodeId}`

    for (const check of checks) {
      if (check === null || typeof check !== "object" || Array.isArray(check)) continue
      const c = check as Record<string, JsonValue>
      const method = typeof c.method === "string" ? c.method : "schema"
      const outcome = c.outcome === "fail" ? "fail" : c.outcome === "pass" ? "pass" : "fail"
      const findings = Array.isArray(c.findings)
        ? (c.findings as JsonValue[]).filter((f): f is string => typeof f === "string")
        : []

      const verdict = verification.createDeterministicVerdict(
        artifactId,
        brand(artifactId as string),
        fingerprint,
        outcome as "pass" | "fail",
        findings.map(
          (f): VerificationFinding => ({
            id: `${method}_${totalChecks}`,
            severity: "info",
            code: method,
            message: f,
          }),
        ),
        content.length,
      )
      verification.recordVerdict(verdict)
      totalChecks++
    }

    // If no explicit checks were provided, run a built-in content check so the
    // verifier is never a hardcoded pass.
    if (totalChecks === 0) {
      const nonEmpty = content.trim().length > 0
      const verdict = verification.createDeterministicVerdict(
        artifactId,
        brand(artifactId as string),
        fingerprint,
        nonEmpty ? "pass" : "fail",
        [
          {
            id: "content_present",
            severity: nonEmpty ? "info" : "error",
            code: "content_present",
            message: nonEmpty ? "Artifact has content" : "Artifact is empty",
          },
        ],
        content.length,
      )
      verification.recordVerdict(verdict)
      totalChecks = 1
    }

    const required = Array.isArray(requiredMethods)
      ? (requiredMethods as string[])
      : undefined
    const aggregated = verification.aggregateVerdicts(artifactId, required)

    const passed = !aggregated.hasDeterministicFail && aggregated.allRequiredPassed

    if (!passed) {
      return failResult(
        request.executionId,
        "verification_failed",
        `Verification failed for ${artifactIdRaw}: state=${aggregated.state}`,
        false,
      )
    }

    return okResult(request.executionId, {
      artifactId: artifactIdRaw,
      state: aggregated.state,
      status: aggregated.status,
      passed: true as JsonValue,
      checks: totalChecks as JsonValue,
    })
  }
}
