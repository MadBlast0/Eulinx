/**
 * P15-ORCH — Refinement Verifier Tests
 *
 * Verifies the real, deterministic `RefinementVerifier` backed by
 * `ArtifactVerification`: genuine inspection of artifact content (not a fake
 * pass), gate modes, and the AI-advisory fallback path.
 */

import { describe, it, expect } from "vitest"
import { brand } from "@/core/types"
import { ok } from "@/core/result"
import type { ArtifactId } from "./orchestrator-types"
import { RefinementVerifier } from "./refinement-verify"
import type { VerifyInput } from "./refinement-loop"

function makeArtifactId(): ArtifactId {
  return brand(`art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
}

function makeVerifyInput(artifactId: ArtifactId, artifactType = "code"): VerifyInput {
  return { orchestratorId: brand("orch-v"), artifactId, artifactType }
}

describe("RefinementVerifier", () => {
  it("passes a valid code artifact deterministically (no provider)", async () => {
    const verifier = new RefinementVerifier({ workerId: "w1" })
    const id = makeArtifactId()
    verifier.recordArtifact(id, "export function add(a: number, b: number) { return a + b }")
    const result = await verifier.verify(makeVerifyInput(id, "code"), "add two numbers")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.passed).toBe(true)
      expect(result.value.checks.length).toBeGreaterThan(0)
    }
  })

  it("fails an empty artifact (real inspection, not a fake pass)", async () => {
    const verifier = new RefinementVerifier({ workerId: "w2" })
    const id = makeArtifactId()
    verifier.recordArtifact(id, "   ")
    const result = await verifier.verify(makeVerifyInput(id, "code"), "do something")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.passed).toBe(false)
      expect(result.value.checks.some((c) => !c.passed)).toBe(true)
    }
  })

  it("fails invalid JSON deterministically", async () => {
    const verifier = new RefinementVerifier({ workerId: "w3" })
    const id = makeArtifactId()
    verifier.recordArtifact(id, "{ not valid json ")
    const result = await verifier.verify(makeVerifyInput(id, "json"), "produce config")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.passed).toBe(false)
    }
  })

  it("soft gate allows artifact through despite deterministic failure", async () => {
    const verifier = new RefinementVerifier({ workerId: "w4", gateMode: "soft" })
    const id = makeArtifactId()
    verifier.recordArtifact(id, "")
    const result = await verifier.verify(makeVerifyInput(id, "code"), "x")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.passed).toBe(true)
      expect(result.value.checks.some((c) => !c.passed)).toBe(true)
    }
  })

  it("uses AI verifier as advisory when configured", async () => {
    const verifier = new RefinementVerifier({
      workerId: "w5",
      aiVerify: async () => ok(JSON.stringify({ passed: true, reason: "looks good" })),
    })
    const id = makeArtifactId()
    verifier.recordArtifact(id, "export const x = 1")
    const result = await verifier.verify(makeVerifyInput(id, "code"), "make x")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.passed).toBe(true)
    }
  })

  it("AI verifier failing does not hard-flip a deterministically passing artifact", async () => {
    const verifier = new RefinementVerifier({
      workerId: "w6",
      aiVerify: async () => ok(JSON.stringify({ passed: false, reason: "nitpick" })),
    })
    const id = makeArtifactId()
    verifier.recordArtifact(id, "export function f() { return 1 }")
    const result = await verifier.verify(makeVerifyInput(id, "code"), "make f")
    expect(result.ok).toBe(true)
    if (result.ok) {
      // Deterministic pass wins; AI is advisory only (per Verification-Part04).
      expect(result.value.passed).toBe(true)
    }
  })
})
