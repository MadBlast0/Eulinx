import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Keyboard, Play, Plus, RotateCw } from "lucide-react"
import { AppIcon } from "./app-icon"
import { ToolbarButton, ToolbarSep } from "./primitives"
import { useWorkspace } from "./use-workspace"
import { useProjects } from "./use-projects"
import { useRunGraph } from "./orchestrator-run"
import { NodeSubMenu } from "./node-sub-menu"
import { useKeymap } from "./keyboard/use-keyboard"
import { displayChordSeq, detectPlatform } from "./keyboard/chord"


export function Toolbar() {
  const { addNode, autoLayout, undo, redo, canUndo, canRedo } = useWorkspace()
  const { graph } = useProjects()
  const { running, run } = useRunGraph()
  const { registry } = useKeymap()
  const [addOpen, setAddOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const kbRef = useRef<HTMLDivElement>(null)

  // Compute canvas bounding rect to constrain dropdowns within the canvas
  // (preventing overflow into right sidebar)
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (addOpen || shortcutsOpen) {
      const el = document.querySelector<HTMLElement>('[data-region="canvas"]')
      setCanvasRect(el ? el.getBoundingClientRect() : null)
    } else {
      setCanvasRect(null)
    }
  }, [addOpen, shortcutsOpen])

  const handleRun = useCallback(() => {
    if (!graph) return
    void run(graph)
  }, [graph, run])

  // Build shortcut list from registry, filtered to graph-relevant categories
  const shortcutGroups = useMemo(() => {
    const platform = detectPlatform()
    const bindings = registry.listBindings()
    const relevant = ["graph", "workflow", "view", "navigation"] as const
    const byCat = new Map<string, { label: string; keys: string }[]>()
    for (const b of bindings) {
      const command = registry.getCommand(b.command)
      if (!command) continue
      const cat = command.category as string
      if (!(relevant as readonly string[]).includes(cat)) continue
      const list = byCat.get(cat) ?? []
      list.push({ label: command.title, keys: displayChordSeq(b.chord, platform) })
      byCat.set(cat, list)
    }
    return relevant.filter((c) => byCat.has(c)).map((c) => ({
      title: c.charAt(0).toUpperCase() + c.slice(1),
      rows: byCat.get(c) ?? [],
    }))
  }, [registry])

  // Dropdown position: below the keyboard button, clamped to canvas
  const [kbPos, setKbPos] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    if (!shortcutsOpen) { setKbPos(null); return }
    const raf = requestAnimationFrame(() => {
      const btn = kbRef.current
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const DROP_W = 240
      const GAP = 4
      let x = r.left
      let y = r.bottom + GAP
      if (canvasRect) {
        x = Math.max(canvasRect.left, Math.min(x, canvasRect.right - DROP_W))
        y = Math.max(canvasRect.top, Math.min(y, canvasRect.bottom - 300))
      }
      setKbPos({ x, y })
    })
    return () => cancelAnimationFrame(raf)
  }, [shortcutsOpen, canvasRect])

  return (
    <div className="flex h-full items-center gap-1 px-3">
      {/* ── Left: Run + Keyboard shortcut ── */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          aria-label={running ? "Running…" : "Run"}
          disabled={running}
          onClick={handleRun}
          style={{
            background: "var(--accent)",
            color: "var(--accent-foreground)",
            boxShadow: "0 1px 4px rgba(0, 0, 0, 0.10)",
          }}
          className="flex h-7 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium border border-transparent transition-all duration-150 enabled:hover:brightness-90 enabled:hover:shadow-md disabled:opacity-60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {running ? (
            <RotateCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" strokeWidth={2} />
          )}
          <span className="hidden sm:inline">{running ? "Running…" : "Run"}</span>
        </button>

        <ToolbarSep />

        <div ref={kbRef} className="relative">
          <ToolbarButton
            tip="Keyboard shortcuts"
            active={shortcutsOpen}
            onClick={() => setShortcutsOpen((v) => !v)}
          >
            <Keyboard className="h-4 w-4" strokeWidth={2} />
          </ToolbarButton>

          {shortcutsOpen && kbPos && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShortcutsOpen(false)} aria-hidden="true" />
              <div
                className="fixed z-[calc(var(--Eulinx-z-dropdown)+1)] min-w-[240px] animate-[ctx-in_120ms_ease] rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1.5 shadow-lg"
                style={{ left: kbPos.x, top: kbPos.y }}
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-[color:var(--Eulinx-color-text)]">
                  Keyboard Shortcuts
                </div>
                <div className="h-px bg-[color:var(--Eulinx-color-border)] mx-1" />
                {shortcutGroups.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                    No shortcuts registered yet.
                  </div>
                ) : (
                  shortcutGroups.map((group) => (
                    <div key={group.title}>
                      <div className="px-3 pt-2 pb-0.5 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
                        {group.title}
                      </div>
                      {group.rows.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between px-3 py-1 text-[12px] text-[color:var(--Eulinx-color-text-secondary)]"
                        >
                          <span>{row.label}</span>
                          <kbd className="ml-4 shrink-0 font-mono text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                            {row.keys}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  ))
                )}
                <div className="h-px bg-[color:var(--Eulinx-color-border)] mx-1 mt-1" />
                <div className="px-3 pt-1.5 pb-1 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                  Press <kbd className="rounded-[var(--Eulinx-radius-xs)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-1 py-0.5 font-mono text-[10px]">F1</kbd> for full list
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Center: spacer ── */}
      <div className="flex-1" />

      {/* ── Right: graph actions ── */}
      <div className="flex shrink-0 items-center gap-0.5">
        <ToolbarButton tip="New terminal" onClick={() => addNode("terminal")}>
          <AppIcon name="terminal" className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>

        <ToolbarButton tip="Auto-layout" onClick={autoLayout}>
          <AppIcon name="conditions" className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>

        <ToolbarButton tip="Undo" onClick={undo} disabled={!canUndo}>
          <AppIcon name="undo" size={16} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton tip="Redo" onClick={redo} disabled={!canRedo}>
          <AppIcon name="redo" size={16} strokeWidth={2} />
        </ToolbarButton>

        <ToolbarSep />

        {/* Add node — shared sub-menu, constrained to canvas */}
        <NodeSubMenu
          open={addOpen}
          onOpen={() => setAddOpen(true)}
          onClose={() => setAddOpen(false)}
          onPick={(kind) => addNode(kind)}
          constraint={canvasRect}
        >
          <button
            type="button"
            aria-label="Add node"
            className="flex h-7 items-center gap-1 rounded-md bg-[color:var(--Eulinx-color-toolbar)] px-2.5 text-[12px] font-medium text-[color:var(--Eulinx-color-text)] transition-colors duration-150 hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Add</span>
          </button>
        </NodeSubMenu>
      </div>
    </div>
  )
}
