/**
 * P15-ORCH — Refinement Loop Engine Tests
 */

import { describe, it, expect } from "vitest"
import { brand } from "@/core/types"
import { CoreError } from "@/core/error"
import type { ArtifactId } from "./orchestrator-types"
import { RefinementLoopEngine } from "./refinement-loop"
import type {
  RefinementLoopInput,
  RoleExecutors,
  BuilderOutput,
  VerifierOutput,
  CriticOutput,
  JudgeOutput,
} from "./refinement-loop"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeArtifactId(): ArtifactId {
  return brand(`art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
}

function makeBuilderOutput(overrides?: Partial<BuilderOutput>): BuilderOutput {
  return {
    artifactId: makeArtifactId(),
    artifactType: "code",
    changeNote: "Initial draft",
    producedAt: new Date().toISOString(),
    tokenUsage: 100,
    costMicroUsd: 50,
    ...overrides,
  }
}

function makeVerifierOutput(passed = true): VerifierOutput {
  return {
    passed,
    checks: [
      { name: "build", passed, details: passed ? "OK" : "Build failed", checkType: "build" },
      { name: "lint", passed: true, details: "OK", checkType: "lint" },
    ],
    verifiedAt: new Date().toISOString(),
    tokenUsage: 50,
    costMicroUsd: 20,
  }
}

function makeCriticOutput(): CriticOutput {
  return {
    issues: [{ description: "Minor style issue", severity: "minor" }],
    strengths: ["Good structure"],
    suggestions: ["Add comments"],
    questions: [],
    critiquedAt: new Date().toISOString(),
    tokenUsage: 80,
    costMicroUsd: 30,
  }
}

function makeJudgeOutput(verdict: "accept" | "reject" | "stop" = "accept"): JudgeOutput {
  return {
    verdict,
    rationale: verdict === "accept" ? "Meets criteria" : "Needs improvement",
    qualityScore: verdict === "accept" ? 0.9 : 0.5,
    judgedAt: new Date().toISOString(),
    tokenUsage: 40,
    costMicroUsd: 15,
  }
}

function makeExecutors(overrides?: {
  build?: () => Promise<{ ok: true; value: BuilderOutput }>
  verify?: () => Promise<{ ok: true; value: VerifierOutput }>
  critique?: () => Promise<{ ok: true; value: CriticOutput }>
  judge?: () => Promise<{ ok: true; value: JudgeOutput }>
}): RoleExecutors {
  return {
    build: overrides?.build ?? (async () => ({ ok: true as const, value: makeBuilderOutput() })),
    verify: overrides?.verify ?? (async () => ({ ok: true as const, value: makeVerifierOutput(true) })),
    critique: overrides?.critique ?? (async () => ({ ok: true as const, value: makeCriticOutput() })),
    judge: overrides?.judge ?? (async () => ({ ok: true as const, value: makeJudgeOutput("accept") })),
  }
}

function makeInput(overrides?: Partial<RefinementLoopInput>): RefinementLoopInput {
  return {
    orchestratorId: brand("orch-test"),
    mode: "low",
    budgetMicroUsd: 100_000,
    taskGoal: "Build a test function",
    initialContext: "Some context",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RefinementLoopEngine", () => {
  it("accepts on first pass with low mode", async () => {
    const engine = new RefinementLoopEngine()
    const result = await engine.run(makeInput({ mode: "low" }), makeExecutors())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.accepted).toBe(true)
      expect(result.value.totalPasses).toBe(1)
      expect(result.value.exitReason).toBe("accepted")
    }
  })

  it("rejects and continues loop", async () => {
    let judgeCallCount = 0
    const engine = new RefinementLoopEngine()
    const result = await engine.run(
      makeInput({ mode: "medium" }),
      makeExecutors({
        judge: async () => {
          judgeCallCount++
          return { ok: true as const, value: makeJudgeOutput(judgeCallCount >= 2 ? "accept" : "reject") }
        },
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.accepted).toBe(true)
      expect(result.value.totalPasses).toBe(2)
    }
  })

  it("stops at iteration cap", async () => {
    const engine = new RefinementLoopEngine()
    const result = await engine.run(
      makeInput({ mode: "low", budgetMicroUsd: 1_000_000 }),
      makeExecutors({
        judge: async () => ({ ok: true as const, value: makeJudgeOutput("reject") }),
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.accepted).toBe(false)
      expect(result.value.exitReason).toBe("cap_reached")
      expect(result.value.totalPasses).toBe(1) // low mode = 1 pass
    }
  })

  it("stops when budget exhausted", async () => {
    const engine = new RefinementLoopEngine()
    const result = await engine.run(
      makeInput({ mode: "ultra", budgetMicroUsd: 100 }), // Very small budget
      makeExecutors({
        build: async () => ({
          ok: true as const,
          value: makeBuilderOutput({ costMicroUsd: 60 }),
        }),
        verify: async () => ({
          ok: true as const,
          value: { ...makeVerifierOutput(true), costMicroUsd: 60 },
        }),
        critique: async () => ({
          ok: true as const,
          value: { ...makeCriticOutput(), costMicroUsd: 60 },
        }),
        judge: async () => ({
          ok: true as const,
          value: { ...makeJudgeOutput("reject"), costMicroUsd: 60 },
        }),
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.exitReason).toBe("budget_exceeded")
    }
  })

  it("handles build failure gracefully", async () => {
    const engine = new RefinementLoopEngine()
    const result = await engine.run(
      makeInput({ mode: "medium" }),
      makeExecutors({
        build: async () => ({
          ok: false as const,
          error: new CoreError("internal_error", "Builder crashed"),
        }),
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.accepted).toBe(false)
      expect(result.value.exitReason).toBe("error")
    }
  })

  it("skips critic on verification failure (cost saving)", async () => {
    let critiqueCalled = false
    const engine = new RefinementLoopEngine()
    await engine.run(
      makeInput({ mode: "high" }),
      makeExecutors({
        verify: async () => ({ ok: true as const, value: makeVerifierOutput(false) }),
        critique: async () => { critiqueCalled = true; return { ok: true as const, value: makeCriticOutput() } },
        judge: async () => ({ ok: true as const, value: makeJudgeOutput("reject") }),
      }),
    )
    // Critic should not be called when verification fails
    expect(critiqueCalled).toBe(false)
  })

  it("detects stuck loop (no improvement)", async () => {
    const engine = new RefinementLoopEngine()
    const result = await engine.run(
      makeInput({ mode: "high" }),
      makeExecutors({
        judge: async () => ({
          ok: true as const,
          value: { ...makeJudgeOutput("reject"), qualityScore: 0.5 },
        }),
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      // Should stop after 3 passes: pass 1 (no improve), pass 2 (no improve) → stuck detection
      expect(result.value.totalPasses).toBeGreaterThanOrEqual(2)
      expect(result.value.totalPasses).toBeLessThanOrEqual(3)
    }
  })

  it("tracks cost across passes", async () => {
    const engine = new RefinementLoopEngine()
    const result = await engine.run(
      makeInput({ mode: "medium" }),
      makeExecutors({
        judge: async () => ({ ok: true as const, value: makeJudgeOutput("reject") }),
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.totalCostMicroUsd).toBeGreaterThan(0)
      expect(result.value.passHistory.length).toBeGreaterThan(0)
    }
  })

  it("does not mark an iteration passing when verification fails", async () => {
    let judgeCalled = false
    const engine = new RefinementLoopEngine()
    const result = await engine.run(
      makeInput({ mode: "high" }),
      makeExecutors({
        verify: async () => ({ ok: true as const, value: makeVerifierOutput(false) }),
        critique: async () => {
          throw new Error("critic must not run on verification failure")
        },
        judge: async () => {
          judgeCalled = true
          return { ok: true as const, value: makeJudgeOutput("reject") }
        },
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      // No pass may be recorded as accepted; every verifier output must be failing.
      for (const pass of result.value.passHistory) {
        expect(pass.verifierOutput.passed).toBe(false)
      }
      expect(result.value.accepted).toBe(false)
      // Judge is still consulted for the routing decision on hard failure.
      expect(judgeCalled).toBe(true)
    }
  })
})
