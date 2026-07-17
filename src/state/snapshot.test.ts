/* eslint-disable no-non-null-assertion */
/**
 * P04-STATE-SNAPSHOT — Snapshot Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import type { WorkspaceId, IsoTimestamp } from "@/core/types"
import { SnapshotService, InMemorySnapshotStore } from "./snapshot"
import type { Snapshot } from "./state-types"

function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function ts(iso: string): IsoTimestamp { return iso as IsoTimestamp }

describe("InMemorySnapshotStore", () => {
  let store: InMemorySnapshotStore

  beforeEach(() => {
    store = new InMemorySnapshotStore()
  })

  it("saves and loads a snapshot", async () => {
    const snapshot: Snapshot = {
      id: "snap_1",
      workspaceId: ws("ws_1"),
      kind: "workspace_snapshot",
      label: "Test",
      payload: {},
      metadata: { createdAt: ts("2025-01-01T00:00:00.000Z"), updatedAt: ts("2025-01-01T00:00:00.000Z"), version: 1, checksum: "" },
    }
    await store.save(snapshot)
    const loaded = await store.load("snap_1")
    expect(loaded).not.toBeNull()
    expect(loaded!.id).toBe("snap_1")
  })

  it("lists snapshots by workspace", async () => {
    const s1: Snapshot = {
      id: "snap_1", workspaceId: ws("ws_1"), kind: "workspace_snapshot", label: "A",
      payload: {}, metadata: { createdAt: ts("2025-01-01T00:00:00.000Z"), updatedAt: ts("2025-01-01T00:00:00.000Z"), version: 1, checksum: "" },
    }
    const s2: Snapshot = {
      id: "snap_2", workspaceId: ws("ws_2"), kind: "workspace_snapshot", label: "B",
      payload: {}, metadata: { createdAt: ts("2025-01-02T00:00:00.000Z"), updatedAt: ts("2025-01-02T00:00:00.000Z"), version: 1, checksum: "" },
    }
    await store.save(s1)
    await store.save(s2)
    const results = await store.listByWorkspace(ws("ws_1"))
    expect(results).toHaveLength(1)
  })

  it("deletes a snapshot", async () => {
    const snapshot: Snapshot = {
      id: "snap_1", workspaceId: ws("ws_1"), kind: "workspace_snapshot", label: "Test",
      payload: {}, metadata: { createdAt: ts("2025-01-01T00:00:00.000Z"), updatedAt: ts("2025-01-01T00:00:00.000Z"), version: 1, checksum: "" },
    }
    await store.save(snapshot)
    await store.delete("snap_1")
    const loaded = await store.load("snap_1")
    expect(loaded).toBeNull()
  })
})

describe("SnapshotService", () => {
  let store: InMemorySnapshotStore
  let service: SnapshotService

  beforeEach(() => {
    store = new InMemorySnapshotStore()
    service = new SnapshotService(store)
  })

  it("creates a snapshot", async () => {
    const result = await service.createSnapshot(
      ws("ws_1"), "workspace_snapshot", "Before merge", { fileChecksums: { "a.ts": "h1" } },
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBeTruthy()
      expect(result.value.kind).toBe("workspace_snapshot")
    }
  })

  it("rejects empty label", async () => {
    const result = await service.createSnapshot(ws("ws_1"), "workspace_snapshot", "", {})
    expect(result.ok).toBe(false)
  })

  it("loads a snapshot", async () => {
    const created = await service.createSnapshot(ws("ws_1"), "workspace_snapshot", "Test", {})
    expect(created.ok).toBe(true)
    if (created.ok) {
      const loaded = await service.loadSnapshot(created.value.id)
      expect(loaded.ok).toBe(true)
      if (loaded.ok) expect(loaded.value.label).toBe("Test")
    }
  })

  it("returns error for missing snapshot", async () => {
    const result = await service.loadSnapshot("nonexistent")
    expect(result.ok).toBe(false)
  })

  it("lists snapshots by workspace", async () => {
    await service.createSnapshot(ws("ws_1"), "workspace_snapshot", "A", {})
    await service.createSnapshot(ws("ws_1"), "pre_merge_snapshot", "B", {})
    const result = await service.listSnapshots(ws("ws_1"))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toHaveLength(2)
  })

  it("filters by kind", async () => {
    await service.createSnapshot(ws("ws_1"), "workspace_snapshot", "A", {})
    await service.createSnapshot(ws("ws_1"), "pre_merge_snapshot", "B", {})
    const result = await service.listSnapshotsByKind(ws("ws_1"), "workspace_snapshot")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toHaveLength(1)
  })

  it("deletes a snapshot", async () => {
    const created = await service.createSnapshot(ws("ws_1"), "workspace_snapshot", "Test", {})
    expect(created.ok).toBe(true)
    if (created.ok) {
      const deleted = await service.deleteSnapshot(created.value.id)
      expect(deleted.ok).toBe(true)
      const loaded = await service.loadSnapshot(created.value.id)
      expect(loaded.ok).toBe(false)
    }
  })

  it("creates pre-merge snapshot", async () => {
    const result = await service.createPreMergeSnapshot(
      ws("ws_1"), { "a.ts": "h1" }, { "a.ts": "content" }, "Before merge",
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.kind).toBe("pre_merge_snapshot")
      expect(result.value.payload.fileChecksums).toEqual({ "a.ts": "h1" })
    }
  })

  it("creates workflow snapshot", async () => {
    const result = await service.createWorkflowSnapshot(
      ws("ws_1"), { nodes: [], edges: [] }, "Graph state",
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.kind).toBe("workflow_snapshot")
  })

  it("validates snapshot integrity", () => {
    const valid: Snapshot = {
      id: "snap_1", workspaceId: ws("ws_1"), kind: "workspace_snapshot", label: "Test",
      payload: {}, metadata: { createdAt: ts("2025-01-01T00:00:00.000Z"), updatedAt: ts("2025-01-01T00:00:00.000Z"), version: 1, checksum: "" },
    }
    expect(service.validateSnapshot(valid)).toEqual([])
  })

  it("detects stale snapshots", () => {
    const older: Snapshot = {
      id: "snap_1", workspaceId: ws("ws_1"), kind: "workspace_snapshot", label: "Old",
      payload: {}, metadata: { createdAt: ts("2025-01-01T00:00:00.000Z"), updatedAt: ts("2025-01-01T00:00:00.000Z"), version: 1, checksum: "" },
    }
    const newer: Snapshot = {
      id: "snap_2", workspaceId: ws("ws_1"), kind: "workspace_snapshot", label: "New",
      payload: {}, metadata: { createdAt: ts("2025-01-02T00:00:00.000Z"), updatedAt: ts("2025-01-02T00:00:00.000Z"), version: 1, checksum: "" },
    }
    expect(service.isStale(older, [newer])).toBe(true)
    expect(service.isStale(newer, [older])).toBe(false)
  })
})
