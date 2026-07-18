/**
 * P10-ART-VERIFY tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ArtifactVerification } from "./artifact-verify"
import type { ArtifactId, WorkerId } from "./artifact-types"
import { brand } from "@/core/types"

describe("ArtifactVerification", () => {
  let verification: ArtifactVerification

  beforeEach(() => {
    verification = new ArtifactVerification()
  })

  it("should allow different worker to verify (authorship exclusion passes)", () => {
    const result = verification.checkAuthorshipExclusion(
      { workerId: brand<WorkerId>("producer"), rootWorkerId: brand<WorkerId>("root-producer") },
      brand<WorkerId>("verifier")
    )
    expect(result.allowed).toBe(true)
  })

  it("should reject same worker verifying own artifact", () => {
    const result = verification.checkAuthorshipExclusion(
      { workerId: brand<WorkerId>("producer") },
      brand<WorkerId>("producer")
    )
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("Authorship violation")
  })

  it("should reject worker in producer's tree", () => {
    const result = verification.checkAuthorshipExclusion(
      { rootWorkerId: brand<WorkerId>("root-producer") },
      brand<WorkerId>("root-producer")
    )
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("tree")
  })

  it("should record and retrieve verdicts", () => {
    const verdict = verification.createDeterministicVerdict(
      brand<ArtifactId>("a1"),
      brand<WorkerId>("verifier"),
      "fp-1",
      "pass",
      [],
      100
    )
    verification.recordVerdict(verdict)

    const verdicts = verification.getVerdicts(brand<ArtifactId>("a1"))
    expect(verdicts).toHaveLength(1)
    expect(verdicts[0].outcome).toBe("pass")
  })

  it("should aggregate verdicts to failed on deterministic fail", () => {
    const failVerdict = verification.createDeterministicVerdict(
      brand<ArtifactId>("a1"),
      brand<WorkerId>("verifier"),
      "fp-1",
      "fail",
      [{ id: "f1", severity: "error", code: "E001", message: "Type error" }],
      100
    )
    verification.recordVerdict(failVerdict)

    const agg = verification.aggregateVerdicts(brand<ArtifactId>("a1"))
    expect(agg.state).toBe("failed")
    expect(agg.status).toBe("rejected")
    expect(agg.hasDeterministicFail).toBe(true)
  })

  it("should aggregate verdicts to passed on all required pass", () => {
    const passVerdict = verification.createDeterministicVerdict(
      brand<ArtifactId>("a1"),
      brand<WorkerId>("verifier"),
      "fp-1",
      "pass",
      [],
      100
    )
    verification.recordVerdict(passVerdict)

    const agg = verification.aggregateVerdicts(brand<ArtifactId>("a1"))
    expect(agg.state).toBe("passed")
    expect(agg.status).toBe("verified")
    expect(agg.allRequiredPassed).toBe(true)
  })

  it("should aggregate to pending when only AI checks run", () => {
    const aiVerdict = verification.createAiVerdict(
      brand<ArtifactId>("a1"),
      brand<WorkerId>("verifier"),
      "fp-ai",
      "pass",
      85,
      70,
      [],
      200
    )
    verification.recordVerdict(aiVerdict)

    const agg = verification.aggregateVerdicts(brand<ArtifactId>("a1"))
    expect(agg.state).toBe("pending")
    expect(agg.status).toBe("validated")
  })

  it("should create deterministic verdict with authoritative=true", () => {
    const verdict = verification.createDeterministicVerdict(
      brand<ArtifactId>("a1"),
      brand<WorkerId>("v"),
      "fp",
      "pass",
      [],
      50
    )
    expect(verdict.authoritative).toBe(true)
    expect(verdict.class).toBe("deterministic")
  })

  it("should create AI verdict with authoritative=false", () => {
    const verdict = verification.createAiVerdict(
      brand<ArtifactId>("a1"),
      brand<WorkerId>("v"),
      "fp",
      "pass",
      90,
      80,
      [],
      100
    )
    expect(verdict.authoritative).toBe(false)
    expect(verdict.class).toBe("ai")
    expect(verdict.score).toBe(90)
    expect(verdict.threshold).toBe(80)
  })

  it("should reject AI method as hard gate", () => {
    const result = verification.validateGateMode("critic", "ai", "hard")
    expect(result.valid).toBe(false)
    expect(result.error).toContain("cannot be a hard gate")
  })

  it("should allow deterministic method as hard gate", () => {
    const result = verification.validateGateMode("build", "deterministic", "hard")
    expect(result.valid).toBe(true)
  })

  it("should prevent AI from overriding deterministic fail", () => {
    const aiVerdict = verification.createAiVerdict(
      brand<ArtifactId>("a1"),
      brand<WorkerId>("v"),
      "fp",
      "pass",
      90,
      80,
      [],
      100
    )
    expect(verification.canOverrideDeterministic(aiVerdict, true)).toBe(false)
  })

  it("should generate cache key from hash + fingerprint", () => {
    const key = verification.cacheKey("hash123", "fp456")
    expect(key).toBe("hash123:fp456")
  })
})
