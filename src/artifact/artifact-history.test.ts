/**
 * P10-ART-HISTORY tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ArtifactHistory } from "./artifact-history"
import type { ArtifactId, WorkerId, TaskId, SessionId, WorkflowId } from "./artifact-types"
import { brand } from "@/core/types"

describe("ArtifactHistory", () => {
  let history: ArtifactHistory

  beforeEach(() => {
    history = new ArtifactHistory()
  })

  it("should append a lifecycle transition", () => {
    const record = history.append(
      brand<ArtifactId>("art-1"),
      null,
      "created",
      {
        workerId: brand<WorkerId>("w1"),
        taskId: brand<TaskId>("t1"),
        reason: "Initial creation",
      }
    )
    expect(record.sequence).toBe(1)
    expect(record.artifactId).toBe(brand<ArtifactId>("art-1"))
    expect(record.fromStatus).toBeNull()
    expect(record.toStatus).toBe("created")
    expect(record.workerId).toBe(brand<WorkerId>("w1"))
  })

  it("should assign monotonically increasing sequences", () => {
    const r1 = history.append(brand<ArtifactId>("a1"), null, "created")
    const r2 = history.append(brand<ArtifactId>("a1"), "created", "validated")
    const r3 = history.append(brand<ArtifactId>("a1"), "validated", "verified")

    expect(r1.sequence).toBeLessThan(r2.sequence)
    expect(r2.sequence).toBeLessThan(r3.sequence)
  })

  it("should read history for a specific artifact", () => {
    history.append(brand<ArtifactId>("a1"), null, "created")
    history.append(brand<ArtifactId>("a2"), null, "created")
    history.append(brand<ArtifactId>("a1"), "created", "validated")

    const a1History = history.readArtifactHistory(brand<ArtifactId>("a1"))
    expect(a1History).toHaveLength(2)
  })

  it("should read history for a specific worker", () => {
    history.append(brand<ArtifactId>("a1"), null, "created", {
      workerId: brand<WorkerId>("w1"),
    })
    history.append(brand<ArtifactId>("a2"), null, "created", {
      workerId: brand<WorkerId>("w2"),
    })

    const w1History = history.readWorkerHistory(brand<WorkerId>("w1"))
    expect(w1History).toHaveLength(1)
  })

  it("should read history for a specific task", () => {
    history.append(brand<ArtifactId>("a1"), null, "created", {
      taskId: brand<TaskId>("t1"),
    })
    history.append(brand<ArtifactId>("a2"), null, "created", {
      taskId: brand<TaskId>("t2"),
    })

    const t1History = history.readTaskHistory(brand<TaskId>("t1"))
    expect(t1History).toHaveLength(1)
  })

  it("should read history for a specific session", () => {
    history.append(brand<ArtifactId>("a1"), null, "created", {
      sessionId: brand<SessionId>("s1"),
    })

    const s1History = history.readSessionHistory(brand<SessionId>("s1"))
    expect(s1History).toHaveLength(1)
  })

  it("should read history within a sequence range", () => {
    const r1 = history.append(brand<ArtifactId>("a1"), null, "created")
    const r2 = history.append(brand<ArtifactId>("a1"), "created", "validated")
    const r3 = history.append(brand<ArtifactId>("a1"), "validated", "verified")

    const range = history.readRange(r1.sequence, r2.sequence)
    expect(range).toHaveLength(2)
  })

  it("should find sequence gaps", () => {
    history.append(brand<ArtifactId>("a1"), null, "created")
    // record at sequence 1
    history.append(brand<ArtifactId>("a1"), "created", "validated")
    // record at sequence 2

    // Query range 1..5 — gap exists at 3..5
    const gaps = history.findGaps(1, 5)
    expect(gaps.complete).toBe(false)
    expect(gaps.gaps.length).toBeGreaterThan(0)
    expect(gaps.gaps[0].from).toBe(3)
  })

  it("should get latest transition", () => {
    history.append(brand<ArtifactId>("a1"), null, "created")
    history.append(brand<ArtifactId>("a1"), "created", "validated")
    history.append(brand<ArtifactId>("a1"), "validated", "verified")

    const latest = history.getLatestTransition(brand<ArtifactId>("a1"))
    expect(latest?.toStatus).toBe("verified")
  })

  it("should get transitions to a specific status", () => {
    history.append(brand<ArtifactId>("a1"), null, "created")
    history.append(brand<ArtifactId>("a2"), null, "created")
    history.append(brand<ArtifactId>("a1"), "created", "validated")

    const created = history.getTransitionsTo("created")
    expect(created).toHaveLength(2)
  })

  it("should track total size", () => {
    history.append(brand<ArtifactId>("a1"), null, "created")
    history.append(brand<ArtifactId>("a2"), null, "created")
    expect(history.size()).toBe(2)
  })

  it("should track max sequence", () => {
    history.append(brand<ArtifactId>("a1"), null, "created")
    history.append(brand<ArtifactId>("a2"), null, "created")
    expect(history.maxSequence()).toBe(2)
  })
})
