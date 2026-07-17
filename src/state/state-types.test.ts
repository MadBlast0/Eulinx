/**
 * P04-STATE — State Types Tests
 */

import { describe, it, expect } from "vitest"
import type { WorkspaceId, IsoTimestamp } from "@/core/types"
import type { PersistenceMetadata, Snapshot } from "./state-types"

function ws(id: string): WorkspaceId {
  return id as unknown as WorkspaceId
}

function ts(iso: string): IsoTimestamp {
  return iso as IsoTimestamp
}

function meta(overrides?: Partial<PersistenceMetadata>): PersistenceMetadata {
  return {
    createdAt: ts("2025-01-01T00:00:00.000Z"),
    updatedAt: ts("2025-01-01T00:00:00.000Z"),
    version: 1,
    checksum: "abc123",
    ...overrides,
  }
}

describe("PersistenceMetadata", () => {
  it("has required fields", () => {
    const m = meta()
    expect(m.createdAt).toBeTruthy()
    expect(m.updatedAt).toBeTruthy()
    expect(m.version).toBe(1)
    expect(m.checksum).toBe("abc123")
  })

  it("supports version incrementing", () => {
    const m1 = meta({ version: 1 })
    const m2 = meta({ version: m1.version + 1 })
    expect(m2.version).toBe(2)
  })
})

describe("Snapshot", () => {
  it("can be created with required fields", () => {
    const snapshot: Snapshot = {
      id: "snap_1",
      workspaceId: ws("ws_1"),
      kind: "workspace_snapshot",
      label: "Before merge",
      payload: { fileChecksums: { "src/a.ts": "hash1" } },
      metadata: meta(),
    }
    expect(snapshot.id).toBe("snap_1")
    expect(snapshot.workspaceId).toBe("ws_1")
    expect(snapshot.kind).toBe("workspace_snapshot")
  })

  it("supports parent snapshot references", () => {
    const parent: Snapshot = {
      id: "snap_1",
      workspaceId: ws("ws_1"),
      kind: "pre_merge_snapshot",
      label: "Parent",
      payload: {},
      metadata: meta(),
    }
    const child: Snapshot = {
      id: "snap_2",
      workspaceId: ws("ws_1"),
      kind: "pre_merge_snapshot",
      label: "Child",
      payload: {},
      metadata: meta(),
      parentSnapshotId: parent.id,
    }
    expect(child.parentSnapshotId).toBe("snap_1")
  })

  it("supports all snapshot kinds", () => {
    const kinds = [
      "workspace_snapshot",
      "project_files_snapshot",
      "workflow_snapshot",
      "memory_snapshot",
      "pre_merge_snapshot",
      "session_snapshot",
    ] as const
    for (const kind of kinds) {
      const snapshot: Snapshot = {
        id: `snap_${kind}`,
        workspaceId: ws("ws_1"),
        kind,
        label: `Test ${kind}`,
        payload: {},
        metadata: meta(),
      }
      expect(snapshot.kind).toBe(kind)
    }
  })
})

describe("RecoveryPlan", () => {
  it("can be created with steps", () => {
    const plan = {
      snapshotId: "snap_1",
      targetState: "running",
      steps: [
        { description: "Restore snapshot", action: "restore_snapshot" as const, targetId: "snap_1" },
        { description: "Replay events", action: "replay_events" as const, targetId: "run_1" },
      ],
    }
    expect(plan.steps).toHaveLength(2)
    expect(plan.steps[0]!.action).toBe("restore_snapshot")
  })
})
