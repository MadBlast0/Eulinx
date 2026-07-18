/**
 * Eulinx Sidebar — Vitest suite.
 *
 * Covers: virtual list windowing, tree expand/collapse, keyboard nav,
 * worker state pill (label/icon/color), and rail collapse toggle.
 */

import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { SidebarProvider } from "./use-sidebar"
import { Sidebar } from "./sidebar"
import { VirtualList } from "./virtual-list"
import { WorkerList } from "./worker-list"
import { StatePill } from "./state-pill"
import { MotionProvider } from "@/ui/animations"
import type { SidebarData, WorkerSummary } from "./sidebar-data"

const withMotion = (node: React.ReactNode): React.ReactElement => (
  <MotionProvider>{node}</MotionProvider>
)

function makeData(overrides: Partial<SidebarData> = {}): SidebarData {
  return {
    workspaces: [
      { id: "ws1", name: "Acme", projectName: "acme-frontend" },
      { id: "ws2", name: "Beta" },
    ],
    activeWorkspaceId: "ws1",
    activeProjectId: "proj1",
    rootNodes: [
      { path: "/a", name: "a", kind: "directory", sizeBytes: null, modifiedAt: "", childCount: 1, gitStatus: null, isIgnored: false },
      { path: "/b", name: "b", kind: "file", sizeBytes: 10, modifiedAt: "", childCount: null, gitStatus: null, isIgnored: false },
    ],
    loadChildren: async () => [
      { path: "/a/c", name: "c", kind: "file", sizeBytes: 1, modifiedAt: "", childCount: null, gitStatus: null, isIgnored: false },
    ],
    workers: [],
    workflows: [],
    sessions: [],
    ...overrides,
  }
}

function renderSidebar(data: SidebarData = makeData()) {
  const onNavigate = vi.fn()
  const onSwitch = vi.fn()
  const onPalette = vi.fn()
  const utils = render(
    withMotion(
      <SidebarProvider data={data}>
        <Sidebar onNavigate={onNavigate} onSwitchWorkspace={onSwitch} onOpenPalette={onPalette} />
      </SidebarProvider>,
    ),
  )
  return { ...utils, onNavigate, onSwitch, onPalette }
}

describe("VirtualList windowing", () => {
  it("renders only the visible window + overscan, not every row", () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, label: `row-${i}` }))
    const { container } = render(
      <div style={{ height: 240 }}>
        <VirtualList
          items={items}
          itemHeight={24}
          overscan={8}
          viewportHeight={240}
          getKey={(it) => String(it.id)}
          renderRow={(it) => <div data-testid="row">{it.label}</div>}
        />
      </div>,
    )
    const rendered = container.querySelectorAll('[data-testid="row"]')
    // viewport 240 / 24 = 10 rows + 8 overscan top + 8 bottom ≈ 26, far below 1000
    expect(rendered.length).toBeGreaterThan(0)
    expect(rendered.length).toBeLessThan(50)
  })

  it("renders all rows when the list is tiny (below threshold)", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ id: i, label: `row-${i}` }))
    const { container } = render(
      <VirtualList
        items={items}
        itemHeight={24}
        viewportHeight={240}
        getKey={(it) => String(it.id)}
        renderRow={(it) => <div data-testid="row">{it.label}</div>}
      />,
    )
    expect(container.querySelectorAll('[data-testid="row"]').length).toBe(5)
  })
})

describe("FileTree expand/collapse", () => {
  it("expands a directory on click and loads children lazily", async () => {
    const { container } = renderSidebar()
    // The directory row "a" has children; expand caret button.
    const dirRow = screen.getByText("a")
    const expandBtn = dirRow.parentElement?.querySelector("button[aria-label='Expand']") ?? null
    expect(expandBtn).not.toBeNull()
    if (expandBtn) fireEvent.click(expandBtn)
    // After load, child "c" should appear.
    const child = await screen.findByText("c")
    expect(child).toBeTruthy()
    // Only loaded on demand; rootNodes had no "c" initially => it's from loadChildren.
    expect(container.textContent).toContain("c")
  })
})

describe("FileTree keyboard navigation", () => {
  it("moves focus with ArrowDown / ArrowUp and navigates with Enter", () => {
    const { onNavigate } = renderSidebar()
    const tree = screen.getByRole("tree")
    const all = within(tree).getAllByRole("treeitem")
    const firstItem = all[0]
    expect(firstItem).toBeTruthy()
    if (!firstItem) return
    firstItem.focus()
    expect(document.activeElement).toBe(firstItem)
    fireEvent.keyDown(firstItem, { key: "ArrowDown" })
    const items = within(tree).getAllByRole("treeitem")
    const second = items[1]
    expect(second).toBeTruthy()
    if (!second) return
    expect(document.activeElement).toBe(second)
    fireEvent.keyDown(second, { key: "Enter" })
    expect(onNavigate).toHaveBeenCalledWith({ kind: "file", id: "/b" })
  })
})

describe("Worker state pill", () => {
  it("renders label, icon, and color token for working state", () => {
    const { container } = render(
      withMotion(
        <StatePill icon="worker.state.working" label="Working" colorToken="--Eulinx-color-state-working" />,
      ),
    )
    expect(container.textContent).toContain("Working")
    expect(container.querySelector("svg")).toBeTruthy()
    expect((container.firstChild as HTMLElement).style.color).toContain("--Eulinx-color-state-working")
  })

  it("WorkerList shows the getStateSignal triple for each row", () => {
    const workers: WorkerSummary[] = [
      { workerId: "w1", label: "refactor-auth", state: "working", health: "healthy", projectId: "p", sessionId: "s", parentWorkerId: null, depth: 0, startedAt: null },
      { workerId: "w2", label: "flaky-suite", state: "failing", health: "degraded", projectId: "p", sessionId: "s", parentWorkerId: null, depth: 0, startedAt: null },
    ]
    render(
      withMotion(
        <WorkerList workers={workers} collapsedGroups={new Set()} onToggleGroup={() => {}} onNavigate={() => {}} selection={null} />,
      ),
    )
    expect(screen.getByText("Working")).toBeTruthy()
    expect(screen.getByText("Failing")).toBeTruthy()
  })
})

describe("Rail collapse", () => {
  it("renders rail icons and expands on icon click", () => {
    const { container } = render(
      withMotion(
        <SidebarProvider data={makeData()} initialMode="rail">
          <Sidebar onNavigate={() => {}} onSwitchWorkspace={() => {}} onOpenPalette={() => {}} />
        </SidebarProvider>,
      ),
    )
    const rail = container.querySelector('nav[aria-label="Sidebar (rail)"]')
    expect(rail).toBeTruthy()
    // Click the explorer rail icon (index 2) expands to full.
    const buttons = within(rail as HTMLElement).getAllByRole("button")
    const explorerBtn = buttons[2]
    expect(explorerBtn).toBeTruthy()
    if (!explorerBtn) return
    fireEvent.click(explorerBtn)
    expect(container.querySelector('nav[aria-label="Sidebar"]')).toBeTruthy()
  })

  it("defaults to expanded mode with a full sidebar nav", () => {
    const { container } = renderSidebar()
    expect(container.querySelector('nav[aria-label="Sidebar"]')).toBeTruthy()
  })
})
