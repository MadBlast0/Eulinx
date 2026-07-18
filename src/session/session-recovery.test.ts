/**
 * P07-SESSION-RESUME — Session Recovery Tests
 */

import { describe, it, expect } from "vitest"
import type { SessionId, WorkspaceId } from "@/core/types"
import type { PersistedSessionState } from "@/state/session-state"
import {
  determineSessionRecovery,
  runSessionRecoveryPass,
} from "./session-recovery"
import type { SessionRecoveryInput } from "./session-recovery"

function sid(id: string): SessionId { return id as unknown as SessionId }

function mockRecoveryInput(
  state: PersistedSessionState["state"],
  overrides?: Partial<SessionRecoveryInput>,
): SessionRecoveryInput {
  const now = new Date().toISOString()
  return {
    sessionId: sid("ses_1"),
    workspaceId: "ws_1" as WorkspaceId,
    persistedState: {
      id: sid("ses_1"),
      workspaceId: "ws_1" as WorkspaceId,
      runtimeId: "rt_1",
      kind: "chat",
      state,
      seq: 5,
      activeWorkerIds: [],
      activeTaskIds: [],
      artifactIds: [],
      metrics: {
        totalWorkersSpawned: 0,
        totalTasksExecuted: 0,
        totalArtifactsCreated: 0,
        totalTokensUsed: 0,
        totalCostMicroUsd: 0,
        totalDurationMs: 0,
        errorCount: 0,
      },
      startedAt: now as any,
      lastPersistedAt: now as any,
      metadata: {
        createdAt: now as any,
        updatedAt: now as any,
        version: 1,
        checksum: "",
      },
    },
    osProcessAlive: false,
    ...overrides,
  }
}

describe("determineSessionRecovery", () => {
  it("skips terminal states", () => {
    const output = determineSessionRecovery(mockRecoveryInput("completed"))
    expect(output.action).toBe("skip")
    expect(output.newState).toBe("completed")
  })

  it("skips failed state", () => {
    const output = determineSessionRecovery(mockRecoveryInput("failed"))
    expect(output.action).toBe("skip")
  })

  it("resumes running sessions", () => {
    const output = determineSessionRecovery(mockRecoveryInput("running"))
    expect(output.action).toBe("resume_running")
    expect(output.newState).toBe("recovering")
  })

  it("resumes paused sessions", () => {
    const output = determineSessionRecovery(mockRecoveryInput("paused"))
    expect(output.action).toBe("resume_running")
    expect(output.newState).toBe("recovering")
  })

  it("marks interrupted for initializing sessions", () => {
    const output = determineSessionRecovery(mockRecoveryInput("initializing"))
    expect(output.action).toBe("mark_interrupted")
    expect(output.newState).toBe("failed")
  })

  it("marks interrupted for loading_workspace sessions", () => {
    const output = determineSessionRecovery(mockRecoveryInput("loading_workspace"))
    expect(output.action).toBe("mark_interrupted")
    expect(output.newState).toBe("failed")
  })

  it("uses snapshot for resume when available", () => {
    const snapshot = {
      snapshotId: "snap_1",
      sessionId: sid("ses_1"),
      eventSeq: 3,
      label: "Test",
      workerStates: {},
      activeWorkerIds: [],
      activeTaskIds: [],
      artifactIds: [],
      metrics: {},
      createdAt: new Date().toISOString() as any,
    }

    const output = determineSessionRecovery(
      mockRecoveryInput("running", { latestSnapshot: snapshot }),
    )
    expect(output.action).toBe("resume_from_snapshot")
    expect(output.reason).toContain("snapshot")
  })
})

describe("runSessionRecoveryPass", () => {
  it("processes sessions in order", () => {
    const inputs = [
      mockRecoveryInput("running"),
      mockRecoveryInput("completed"),
      mockRecoveryInput("initializing"),
    ]

    const result = runSessionRecoveryPass(inputs)
    expect(result.recoveryCount).toBe(2) // running + initializing
    expect(result.failedCount).toBe(1)  // initializing -> failed
  })

  it("skips terminal sessions", () => {
    const inputs = [
      mockRecoveryInput("completed"),
      mockRecoveryInput("archived"),
    ]

    const result = runSessionRecoveryPass(inputs)
    expect(result.recoveryCount).toBe(0)
  })
})
