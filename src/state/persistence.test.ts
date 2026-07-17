/* eslint-disable no-non-null-assertion */
/**
 * P04-STATE-PERSIST — Persistence Layer Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import type { WorkerId, TaskId, WorkspaceId, RunId, IsoTimestamp } from "@/core/types"
import { InMemoryStateStore, PersistenceService } from "./persistence"
import { createPersistedRuntimeState } from "./runtime-state"
import { createPersistedWorkerState } from "./worker-state"
import { createPersistedSessionState } from "./session-state"
import { createPersistedTaskState } from "./task-state"
import { createPersistedArtifactState } from "./artifact-state"
import { createPersistedWorkflowRun } from "./workflow-state"
import type { PersistedNodeStep, PersistedRunContext } from "./workflow-state"

function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function wid(id: string): WorkerId { return id as unknown as WorkerId }
function tid(id: string): TaskId { return id as unknown as TaskId }
function rid(id: string): RunId { return id as unknown as RunId }

describe("InMemoryStateStore", () => {
  let store: InMemoryStateStore

  beforeEach(() => {
    store = new InMemoryStateStore()
  })

  it("saves and loads an entity", async () => {
    const runtime = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", "2025-01-01T00:00:00.000Z" as IsoTimestamp)
    await store.save(runtime)
    const loaded = await store.load("rt_1")
    expect(loaded).not.toBeNull()
    expect(loaded!.id).toBe("rt_1")
  })

  it("returns null for missing entity", async () => {
    const loaded = await store.load("nonexistent")
    expect(loaded).toBeNull()
  })

  it("deletes an entity", async () => {
    const runtime = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", "2025-01-01T00:00:00.000Z" as IsoTimestamp)
    await store.save(runtime)
    await store.delete("rt_1")
    const loaded = await store.load("rt_1")
    expect(loaded).toBeNull()
  })

  it("saves multiple entities", async () => {
    const r1 = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", "2025-01-01T00:00:00.000Z" as IsoTimestamp)
    const r2 = createPersistedRuntimeState("rt_2", ws("ws_1"), "1.0.0", "2025-01-01T00:00:00.000Z" as IsoTimestamp)
    await store.saveAll([r1, r2])
    expect(store.size).toBe(2)
  })

  it("queries by workspace", async () => {
    const r1 = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", "2025-01-01T00:00:00.000Z" as IsoTimestamp)
    const r2 = createPersistedRuntimeState("rt_2", ws("ws_2"), "1.0.0", "2025-01-01T00:00:00.000Z" as IsoTimestamp)
    await store.saveAll([r1, r2])
    const results = await store.queryByWorkspace(ws("ws_1"), "runtime_state")
    expect(results).toHaveLength(1)
    expect(results[0]!.id).toBe("rt_1")
  })

  it("upserts on save", async () => {
    const runtime = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", "2025-01-01T00:00:00.000Z" as IsoTimestamp)
    await store.save(runtime)
    const updated = { ...runtime, seq: 2 }
    await store.save(updated)
    const loaded = await store.load("rt_1") as import("./runtime-state").PersistedRuntimeState | null
    expect(loaded!.seq).toBe(2)
    expect(store.size).toBe(1)
  })
})

describe("PersistenceService", () => {
  let store: InMemoryStateStore
  let service: PersistenceService

  beforeEach(() => {
    store = new InMemoryStateStore()
    service = new PersistenceService(store)
  })

  describe("runtime state", () => {
    it("loads and saves runtime state", async () => {
      const runtime = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", "2025-01-01T00:00:00.000Z" as IsoTimestamp)
      await service.saveRuntimeState(runtime)
      const result = await service.loadRuntimeState("rt_1")
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.id).toBe("rt_1")
    })

    it("returns error for missing runtime state", async () => {
      const result = await service.loadRuntimeState("nonexistent")
      expect(result.ok).toBe(false)
    })
  })

  describe("worker state", () => {
    it("loads and saves worker state", async () => {
      const worker = createPersistedWorkerState(wid("w_1"), ws("ws_1"), "proj_1")
      await service.saveWorkerState(worker)
      const result = await service.loadWorkerState("w_1")
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.id).toBe("w_1")
    })

    it("returns error for missing worker", async () => {
      const result = await service.loadWorkerState("nonexistent")
      expect(result.ok).toBe(false)
    })
  })

  describe("session state", () => {
    it("loads and saves session state", async () => {
      const session = createPersistedSessionState("s_1" as import("@/core/types").SessionId, ws("ws_1"), "rt_1")
      await service.saveSessionState(session)
      const result = await service.loadSessionState("s_1")
      expect(result.ok).toBe(true)
    })
  })

  describe("workflow run", () => {
    it("loads and saves workflow run", async () => {
      const run = createPersistedWorkflowRun(
        rid("run_1"), "wf_1", 1, ws("ws_1"), "proj_1", "sess_1",
        { kind: "user", actorId: "u_1", reason: "test", at: "2025-01-01T00:00:00.000Z" as IsoTimestamp },
        "snap_1", "ctx_1", 5, "1.0.0",
      )
      await service.saveWorkflowRun(run)
      const result = await service.loadWorkflowRun("run_1")
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.runId).toBe("run_1")
    })
  })

  describe("persistRunState", () => {
    it("saves run + steps + context in one call", async () => {
      const run = createPersistedWorkflowRun(
        rid("run_1"), "wf_1", 1, ws("ws_1"), "proj_1", "sess_1",
        { kind: "user", actorId: "u_1", reason: "test", at: "2025-01-01T00:00:00.000Z" as IsoTimestamp },
        "snap_1", "ctx_1", 5, "1.0.0",
      )
      const step: PersistedNodeStep = {
        id: "run_1:node_1",
        runId: rid("run_1"),
        nodeId: "node_1" as import("@/core/types").GraphNodeId,
        iterationIndex: 0,
        state: "running",
        attempt: 1,
        maxAttempts: 3,
        inputs: [],
        outputs: [],
        workspaceId: ws("ws_1"),
        lastPersistedAt: "2025-01-01T00:00:00.000Z" as IsoTimestamp,
        metadata: { createdAt: "2025-01-01T00:00:00.000Z" as IsoTimestamp, updatedAt: "2025-01-01T00:00:00.000Z" as IsoTimestamp, version: 1, checksum: "" },
      }
      const context: PersistedRunContext = {
        id: "ctx:run_1",
        runId: rid("run_1"),
        workspaceId: ws("ws_1"),
        portValues: [],
        lastPersistedAt: "2025-01-01T00:00:00.000Z" as IsoTimestamp,
        metadata: { createdAt: "2025-01-01T00:00:00.000Z" as IsoTimestamp, updatedAt: "2025-01-01T00:00:00.000Z" as IsoTimestamp, version: 1, checksum: "" },
      }

      const result = await service.persistRunState(run, [step], context)
      expect(result.ok).toBe(true)
      expect(store.size).toBe(3)
    })
  })

  describe("task state", () => {
    it("loads and saves task state", async () => {
      const task = createPersistedTaskState(tid("t_1"), ws("ws_1"), "proj_1", "Do thing", "Description")
      await service.saveTaskState(task)
      const result = await service.loadTaskState("t_1")
      expect(result.ok).toBe(true)
    })
  })

  describe("artifact state", () => {
    it("loads and saves artifact state", async () => {
      const artifact = createPersistedArtifactState(
        "art_1" as import("@/core/types").ArtifactId, ws("ws_1"), "proj_1", "code", "Test", "ref_1", "hash_1", 100, "text/plain",
      )
      await service.saveArtifactState(artifact)
      const result = await service.loadArtifactState("art_1")
      expect(result.ok).toBe(true)
    })
  })

  describe("saveBatch", () => {
    it("saves multiple entities", async () => {
      const worker = createPersistedWorkerState(wid("w_1"), ws("ws_1"), "proj_1")
      const task = createPersistedTaskState(tid("t_1"), ws("ws_1"), "proj_1", "Do thing", "Desc")
      const result = await service.saveBatch([worker, task])
      expect(result.ok).toBe(true)
      expect(store.size).toBe(2)
    })
  })
})
