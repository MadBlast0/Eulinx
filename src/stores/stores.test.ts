/**
 * P18-UI — Store Tests
 */

import { describe, it, expect } from "vitest"
import { useRuntimeStore, type Worker, type Session, type Artifact, type WorkflowRun } from "./runtime-store"
import { useLayoutStore, REGION_CONSTRAINTS } from "./layout-store"

describe("RuntimeStore", () => {
  it("initializes with empty state", () => {
    const state = useRuntimeStore.getState()
    expect(Object.keys(state.workers)).toHaveLength(0)
    expect(Object.keys(state.sessions)).toHaveLength(0)
    expect(Object.keys(state.artifacts)).toHaveLength(0)
    expect(state.isConnected).toBe(false)
  })

  it("applies worker created", () => {
    const store = useRuntimeStore.getState()
    const worker: Worker = {
      id: "w1",
      role: "builder",
      state: "idle",
      sessionId: null,
      health: "healthy",
      tokensUsed: 0,
      costUsd: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    store.applyWorkerCreated(worker)
    expect(useRuntimeStore.getState().workers["w1"]).toBeDefined()
  })

  it("applies worker state change", () => {
    const store = useRuntimeStore.getState()
    store.applyWorkerCreated({
      id: "w2", role: "reviewer", state: "idle", sessionId: null,
      health: "healthy", tokensUsed: 0, costUsd: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    store.applyWorkerStateChanged({ workerId: "w2", state: "working" })
    expect(useRuntimeStore.getState().workers["w2"]!.state).toBe("working")
  })

  it("applies worker removed", () => {
    const store = useRuntimeStore.getState()
    store.applyWorkerRemoved("w1")
    expect(useRuntimeStore.getState().workers["w1"]).toBeUndefined()
  })

  it("applies session updated", () => {
    const store = useRuntimeStore.getState()
    const session: Session = {
      id: "s1", kind: "chat", state: "active",
      messageCount: 0, createdAt: new Date().toISOString(),
    }
    store.applySessionUpdated(session)
    expect(useRuntimeStore.getState().sessions["s1"]).toBeDefined()
  })

  it("applies artifact created", () => {
    const store = useRuntimeStore.getState()
    const artifact: Artifact = {
      id: "a1", kind: "code", state: "proposed",
      size: 100, producedBy: "w1", createdAt: new Date().toISOString(),
    }
    store.applyArtifactCreated(artifact)
    expect(useRuntimeStore.getState().artifacts["a1"]).toBeDefined()
  })

  it("applies workflow run updated", () => {
    const store = useRuntimeStore.getState()
    const run: WorkflowRun = {
      runId: "r1", workflowId: "wf1", state: "running",
      completedNodes: 0, totalNodes: 5, startedAt: new Date().toISOString(),
    }
    store.applyWorkflowRunUpdated(run)
    expect(useRuntimeStore.getState().workflowRuns["r1"]).toBeDefined()
  })

  it("resets state", () => {
    const store = useRuntimeStore.getState()
    store.applyWorkerCreated({
      id: "w3", role: "test", state: "idle", sessionId: null,
      health: "healthy", tokensUsed: 0, costUsd: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    store.reset()
    expect(Object.keys(useRuntimeStore.getState().workers)).toHaveLength(0)
  })
})

describe("LayoutStore", () => {
  it("initializes as loading", () => {
    const state = useLayoutStore.getState()
    expect(state.isLoading).toBe(true)
    expect(state.layout).toBeNull()
  })

  it("sets layout", () => {
    const store = useLayoutStore.getState()
    const now = new Date().toISOString()
    store.setLayout({
      schemaVersion: 1,
      workspaceId: "ws1",
      regions: {
        titleBar: { id: "titleBar", visible: true, collapsed: false, size: 36, restoreSize: 36 },
        sidebar: { id: "sidebar", visible: true, collapsed: false, size: 240, restoreSize: 240 },
        canvas: { id: "canvas", visible: true, collapsed: false, size: 0, restoreSize: 0 },
        inspector: { id: "inspector", visible: true, collapsed: false, size: 320, restoreSize: 320 },
        panel: { id: "panel", visible: true, collapsed: false, size: 220, restoreSize: 220 },
        statusBar: { id: "statusBar", visible: true, collapsed: false, size: 24, restoreSize: 24 },
      },
      canvasTabs: { tabs: [], activeTabId: "", mruOrder: [] },
      focus: { focusedRegion: "canvas", previousRegion: null, focusVisible: false },
      lastWindowSize: { width: 1280, height: 720 },
      updatedAt: now,
    })
    expect(useLayoutStore.getState().layout).not.toBeNull()
    expect(useLayoutStore.getState().isLoading).toBe(false)
  })

  it("updates region size", () => {
    const store = useLayoutStore.getState()
    store.resetLayout("ws1")
    store.updateRegion("sidebar", { size: 300 })
    expect(useLayoutStore.getState().layout!.regions.sidebar.size).toBe(300)
  })

  it("collapses region", () => {
    const store = useLayoutStore.getState()
    store.resetLayout("ws1")
    store.collapseRegion("sidebar")
    const sidebar = useLayoutStore.getState().layout!.regions.sidebar
    expect(sidebar.collapsed).toBe(true)
    expect(sidebar.size).toBe(REGION_CONSTRAINTS.sidebar.railSize)
  })

  it("expands region", () => {
    const store = useLayoutStore.getState()
    store.resetLayout("ws1")
    store.collapseRegion("sidebar")
    store.expandRegion("sidebar")
    const sidebar = useLayoutStore.getState().layout!.regions.sidebar
    expect(sidebar.collapsed).toBe(false)
    expect(sidebar.size).toBe(sidebar.restoreSize)
  })

  it("resets layout", () => {
    const store = useLayoutStore.getState()
    store.resetLayout("ws1")
    const layout = useLayoutStore.getState().layout!
    expect(layout.workspaceId).toBe("ws1")
    expect(layout.schemaVersion).toBe(1)
    expect(layout.regions.sidebar.size).toBe(260)
  })
})

describe("REGION_CONSTRAINTS", () => {
  it("has all 6 regions", () => {
    expect(Object.keys(REGION_CONSTRAINTS)).toHaveLength(6)
  })

  it("titleBar is not resizable", () => {
    expect(REGION_CONSTRAINTS.titleBar.resizable).toBe(false)
  })

  it("sidebar is resizable and collapsible to rail", () => {
    expect(REGION_CONSTRAINTS.sidebar.resizable).toBe(true)
    expect(REGION_CONSTRAINTS.sidebar.collapseMode).toBe("rail")
  })
})
