/**
 * P10-ART-VERIFY — Artifact Verification
 *
 * Verification model: deterministic vs AI verifiers, authorship exclusion,
 * gate modes, aggregation to artifact state.
 * From Verification-Part01 through Part04.
 */

import { randomUUID } from "node:crypto"
import type {
  ArtifactId,
  WorkerId,
  IsoTimestamp,
} from "@/core/types"
import { brand } from "@/core/types"
import type {
  Artifact,
  VerificationVerdict,
  VerificationFinding,
  VerdictOutcome,
  VerificationState,
  ArtifactStatus,
} from "./artifact-types"

// ---------------------------------------------------------------------------
// Gate Mode (Verification-Part04 §GateModes)
// ---------------------------------------------------------------------------

export type GateMode = "hard" | "soft"

// ---------------------------------------------------------------------------
// Verifier Config
// ---------------------------------------------------------------------------

export interface VerifierConfig {
  readonly workerId: WorkerId
  readonly fingerprint: string
  readonly method: "schema" | "lint" | "typecheck" | "build" | "test" | "critic" | "judge"
  readonly class: "deterministic" | "ai"
  readonly gateMode: GateMode
  readonly timeoutMs?: number
}

// ---------------------------------------------------------------------------
// Aggregated Verification State
// ---------------------------------------------------------------------------

export interface AggregatedVerification {
  readonly state: VerificationState
  readonly status: ArtifactStatus
  readonly verdicts: readonly VerificationVerdict[]
  readonly hasDeterministicFail: boolean
  readonly allRequiredPassed: boolean
}

// ---------------------------------------------------------------------------
// ArtifactVerification
// ---------------------------------------------------------------------------

export class ArtifactVerification {
  private readonly verdicts = new Map<ArtifactId, VerificationVerdict[]>()

  /**
   * Check authorship exclusion.
   * From Verification-Part04 §AuthorshipExclusion:
   * - producer's workerId != verifier's workerId (node scope)
   * - producer's rootWorkerId != verifier's rootWorkerId (tree scope)
   */
  checkAuthorshipExclusion(
    producer: { workerId?: WorkerId; rootWorkerId?: WorkerId },
    verifierWorkerId: WorkerId
  ): { allowed: boolean; reason?: string } {
    if (producer.workerId && producer.workerId === verifierWorkerId) {
      return {
        allowed: false,
        reason: `Authorship violation: verifier worker ${verifierWorkerId} produced the artifact`,
      }
    }
    if (
      producer.rootWorkerId &&
      producer.rootWorkerId === verifierWorkerId
    ) {
      return {
        allowed: false,
        reason: `Authorship violation: verifier worker is in the producer's tree`,
      }
    }
    return { allowed: true }
  }

  /**
   * Record a verdict for an artifact.
   */
  recordVerdict(verdict: VerificationVerdict): void {
    const existing = this.verdicts.get(verdict.artifactId) ?? []
    this.verdicts.set(verdict.artifactId, [...existing, verdict])
  }

  /**
   * Get all verdicts for an artifact.
   */
  getVerdicts(artifactId: ArtifactId): readonly VerificationVerdict[] {
    return this.verdicts.get(artifactId) ?? []
  }

  /**
   * Aggregate verdicts into verification state.
   * From Verification-Part04 §AggregationToArtifactState:
   * - any hard deterministic fail -> failed, status = rejected
   * - all required checks pass -> passed, status = verified
   * - only soft/AI checks run -> pending, status = validated
   */
  aggregateVerdicts(
    artifactId: ArtifactId,
    requiredMethods?: readonly string[]
  ): AggregatedVerification {
    const verdicts = this.getVerdicts(artifactId)
    const hasDeterministicFail = verdicts.some(
      (v) =>
        v.class === "deterministic" &&
        v.authoritative &&
        (v.outcome === "fail" || v.outcome === "timeout" || v.outcome === "error")
    )

    const requiredVerdicts = requiredMethods
      ? verdicts.filter((v) => requiredMethods.includes(v.method))
      : verdicts.filter((v) => v.class === "deterministic" && v.authoritative)

    const allRequiredPassed =
      requiredVerdicts.length > 0 &&
      requiredVerdicts.every((v) => v.outcome === "pass")

    const onlySoftOrAi =
      verdicts.length > 0 &&
      verdicts.every(
        (v) => v.class === "ai" || !v.authoritative
      )

    let state: VerificationState
    let status: ArtifactStatus

    if (hasDeterministicFail) {
      state = "failed"
      status = "rejected"
    } else if (allRequiredPassed) {
      state = "passed"
      status = "verified"
    } else if (onlySoftOrAi) {
      state = "pending"
      status = "validated"
    } else {
      state = "unverified"
      status = "created"
    }

    return {
      state,
      status,
      verdicts,
      hasDeterministicFail,
      allRequiredPassed,
    }
  }

  /**
   * Create a deterministic verdict.
   * From Verification-Part02 §DeterministicVerifiers.
   */
  createDeterministicVerdict(
    artifactId: ArtifactId,
    verifierWorkerId: WorkerId,
    fingerprint: string,
    outcome: VerdictOutcome,
    findings: readonly VerificationFinding[],
    durationMs: number
  ): VerificationVerdict {
    return {
      artifactId,
      verifierWorkerId,
      verifierFingerprint: fingerprint,
      outcome,
      authoritative: true,
      class: "deterministic",
      findings,
      durationMs,
      createdAt: new Date().toISOString() as IsoTimestamp,
    }
  }

  /**
   * Create an AI verdict (advisory only).
   * From Verification-Part03 §AdvisoryScoring.
   */
  createAiVerdict(
    artifactId: ArtifactId,
    verifierWorkerId: WorkerId,
    fingerprint: string,
    outcome: VerdictOutcome,
    score: number,
    threshold: number,
    findings: readonly VerificationFinding[],
    durationMs: number
  ): VerificationVerdict {
    return {
      artifactId,
      verifierWorkerId,
      verifierFingerprint: fingerprint,
      outcome,
      authoritative: false, // AI is always advisory
      class: "ai",
      score,
      threshold,
      findings,
      durationMs,
      createdAt: new Date().toISOString() as IsoTimestamp,
    }
  }

  /**
   * Validate gate mode: AI methods cannot be hard gates.
   * From Verification-Part04 §GateModes.
   */
  validateGateMode(
    method: string,
    class_: "deterministic" | "ai",
    gateMode: GateMode
  ): { valid: boolean; error?: string } {
    if (class_ === "ai" && gateMode === "hard") {
      return {
        valid: false,
        error: `AI method "${method}" cannot be a hard gate. AI is advisory only.`,
      }
    }
    return { valid: true }
  }

  /**
   * Check if an AI verdict can override a deterministic fail.
   * From Verification-Part01 §DeterministicVersusAIPrecedence.
   */
  canOverrideDeterministic(
    aiVerdict: VerificationVerdict,
    deterministicFailed: boolean
  ): boolean {
    // An AI verdict MUST NOT flip a deterministic fail to pass
    if (deterministicFailed && aiVerdict.outcome === "pass") {
      return false
    }
    return true
  }

  /**
   * Cache key for deterministic verdicts.
   * From Verification-Part01 §VerificationIsAPureFunctionOfContent.
   */
  cacheKey(contentHash: string, fingerprint: string): string {
    return `${contentHash}:${fingerprint}`
  }
}
