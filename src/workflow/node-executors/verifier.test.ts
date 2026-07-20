/**
 * P16-WF-EXEC — Verifier Executor Tests (real ArtifactVerification)
 */

import { describe, it, expect } from "vitest"
import { createVerifierExecutor } from "./verifier"
import type { ExecutorInput } from "./types"
import type { ExecutionRequest } from "../workflow-types"
import { ArtifactVerification } from "@/artifact/artifact-verify"
import { RunContext } from "../run-context"

function makeInput(
  config: unknown,
  vars: Record<string, unknown>,
  _deps: { resolveContent: (id: string) => string | null },
): ExecutorInput {
  const context = new RunContext("run_1" as never, 1)
  for (const [portId, value] of Object.entries(vars)) {
    context.writeOutput("src" as never, portId, 0, value as never, "edge" as never, JSON.stringify(value).length)
  }
  const request: ExecutionRequest = {
    executionId: "exec_1",
    runId: "run_1" as never,
    nodeId: "ver_1" as never,
    iterationIndex: 0,
    attempt: 1,
    kind: "verifier",
    config,
    inputs: {},
    workspaceId: "ws_1" as never,
    projectId: "p_1",
    sessionId: "s_1",
    ownerRef: { kind: "workflow_node", runId: "run_1", nodeId: "ver_1" },
    timeoutMs: 1000,
    deterministicSeed: "seed",
    mode: "normal",
  }
  return {
    request,
    services: {
      runContext: context,
      scheduler: {} as never,
      executor: {} as never,
      persistence: {} as never,
    },
  }
}

describe("verifierExecutor (real ArtifactVerification)", () => {
  const verification = new ArtifactVerification()

  it("passes when all checks pass", async () => {
    const input = makeInput(
      {
        artifactRef: "artifactId",
        checks: [{ method: "schema", outcome: "pass" }],
      },
      { artifactId: "art_1" },
      { resolveContent: () => '{"ok":true}' },
    )
    const executor = createVerifierExecutor({
      verification,
      resolveContent: (id) => (id === "art_1" ? '{"ok":true}' : null),
    })
    const result = await executor(input)
    expect(result.ok).toBe(true)
  })

  it("fails when a check fails (NOT a hardcoded pass)", async () => {
    const input = makeInput(
      {
        artifactRef: "artifactId",
        checks: [{ method: "schema", outcome: "fail", findings: ["bad schema"] }],
      },
      { artifactId: "art_2" },
      { resolveContent: () => "{}" },
    )
    const executor = createVerifierExecutor({
      verification,
      resolveContent: () => "{}",
    })
    const result = await executor(input)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.kind).toBe("verification_failed")
    }
  })

  it("runs a built-in content check when no checks provided", async () => {
    const executor = createVerifierExecutor({
      verification,
      resolveContent: () => "",
    })
    const emptyInput = makeInput(
      { artifactRef: "artifactId" },
      { artifactId: "art_3" },
      { resolveContent: () => "" },
    )
    const emptyResult = await executor(emptyInput)
    expect(emptyResult.ok).toBe(false)

    const executor2 = createVerifierExecutor({
      verification,
      resolveContent: () => "hello",
    })
    const goodInput = makeInput(
      { artifactRef: "artifactId" },
      { artifactId: "art_4" },
      { resolveContent: () => "hello" },
    )
    const goodResult = await executor2(goodInput)
    expect(goodResult.ok).toBe(true)
  })

  it("fails when artifact reference is unresolved", async () => {
    const input = makeInput(
      { artifactRef: "artifactId" },
      {},
      { resolveContent: () => null },
    )
    const executor = createVerifierExecutor({ verification, resolveContent: () => null })
    const result = await executor(input)
    expect(result.ok).toBe(false)
  })
})
