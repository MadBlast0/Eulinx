import { useState } from "react"
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Minimize2,
  Trash2,
} from "lucide-react"
import { AppIcon } from "./app-icon"
import { cn } from "@/utils/cn"
import type { BottomTab } from "./types"
import { useWorkspace } from "./use-workspace"
import { Dot, ListRow, StateBadge, ToolbarButton, ToolbarSep } from "./primitives"
import { type Tone } from "./state"
import {
  PANEL_REGISTRY,
  PANEL_ORDER,
  type PanelKey,
} from "./panels/registry"
import { useRuntime } from "./runtime-store"
import { useMemory } from "./memory-store"
import { useLayout } from "./layout-state"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const TABS: readonly { readonly id: BottomTab; readonly label: string; readonly icon: React.ReactNode }[] = [
  { id: "logs", label: "Logs", icon: <AppIcon name="terminal" className="h-3.5 w-3.5" strokeWidth={2.25} /> },
  { id: "problems", label: "Diagnostics", icon: <AppIcon name="diagnostics" className="h-3.5 w-3.5" strokeWidth={2.25} /> },
  { id: "events", label: "Events", icon: <AppIcon name="events" className="h-3.5 w-3.5" strokeWidth={2.25} /> },
  { id: "memory", label: "Runtime", icon: <AppIcon name="memory" className="h-3.5 w-3.5" strokeWidth={2.25} /> },
]

const TAB_LABEL: Record<BottomTab, string> = {
  logs: "Logs",
  problems: "Diagnostics",
  events: "Events",
  memory: "Runtime",
}

interface ProblemRow {
  readonly severity: Tone
  readonly label: string
  readonly detail: string
}

const PROBLEMS: readonly ProblemRow[] = []

interface MemoryEntry {
  readonly tone: Tone
  readonly key: string
  readonly value: string
}

const SEVERITY_TONE: Record<string, Tone> = {
  critical: "accent",
  important: "warning",
  reference: "info",
  archived: "neutral",
}

type DockView = { readonly kind: "tab"; readonly tab: BottomTab } | { readonly kind: "panel"; readonly key: PanelKey }

export function BottomPanel() {
  const { bottomTab, setBottomTab, bottomPanelOpen, setBottomPanelOpen } = useWorkspace()
  const { logLines, eventEntries, clearLogs, clearEvents } = useRuntime()
  const { entries: memoryEntries } = useMemory()
  const { layout, setRegionSize } = useLayout()

  const [dockView, setDockView] = useState<DockView>({ kind: "tab", tab: bottomTab })

  if (!bottomPanelOpen) return null

  const activePanelKey = dockView.kind === "panel" ? dockView.key : null
  const panelRegion = layout.regions.panel
  const isMaximized = panelRegion.size >= panelRegion.maxSize

  const memoryDisplay: readonly MemoryEntry[] = memoryEntries.map((e) => ({
    key: e.title,
    value: `${e.kind} — ${e.tags.join(", ")}`,
    tone: SEVERITY_TONE[e.severity] ?? "neutral",
  }))

  return (
    <div
      className="flex h-full shrink-0 flex-col border-t border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-sidebar)]"
    >
      <div
        className="flex h-7 shrink-0 items-center gap-0 border-b border-[color:var(--Eulinx-color-border)] px-2"
        style={{ background: "var(--Eulinx-color-toolbar)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-label={TAB_LABEL[tab.id]}
            aria-pressed={dockView.kind === "tab" && dockView.tab === tab.id}
            onClick={() => {
              setBottomTab(tab.id)
              setDockView({ kind: "tab", tab: tab.id })
            }}
            className={cn(
              "flex h-full items-center gap-1.5 border-b-2 px-3 text-[12px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              dockView.kind === "tab" && dockView.tab === tab.id
                ? "border-[color:var(--Eulinx-color-accent)] text-[color:var(--Eulinx-color-text)]"
                : "border-transparent text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text-secondary)]",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open panel"
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-[var(--Eulinx-radius-sm)] px-2.5 text-[12px] font-medium",
                "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
            >
              <AppIcon name="panel" className="h-3.5 w-3.5" strokeWidth={2.25} />
              Panels
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PANEL_ORDER.map((key) => {
              const def = PANEL_REGISTRY[key]
              return (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => setDockView({ kind: "panel", key })}
                >
                  <AppIcon name={def.iconName} className="h-3.5 w-3.5" strokeWidth={2.25} />
                  {def.title}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarSep />

        <div className="flex gap-0.5">
          <ToolbarButton
            tip="Clear"
            size={26}
            aria-label="Clear"
            onClick={() => {
              if (bottomTab === "logs") clearLogs()
              else if (bottomTab === "events") clearEvents()
            }}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            tip={isMaximized ? "Restore panel" : "Maximize panel"}
            size={26}
            aria-label={isMaximized ? "Restore panel" : "Maximize panel"}
            onClick={() => setRegionSize("panel", isMaximized ? panelRegion.defaultSize : panelRegion.maxSize)}
          >
            {isMaximized ? (
              <ChevronsDownUp className="h-3.5 w-3.5" strokeWidth={2.25} />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" strokeWidth={2.25} />
            )}
          </ToolbarButton>
          <ToolbarButton
            tip="Close panel"
            size={26}
            aria-label="Close panel"
            onClick={() => setBottomPanelOpen(false)}
          >
            <Minimize2 className="h-3.5 w-3.5" strokeWidth={2.25} />
          </ToolbarButton>
        </div>
      </div>

      {activePanelKey ? (
        <div className="h-full">
          {(() => {
            const ActivePanel = PANEL_REGISTRY[activePanelKey].Component
            return <ActivePanel />
          })()}
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto bg-[color:var(--Eulinx-color-surface)] px-4 py-3 font-mono text-xs leading-[1.8] text-[color:var(--Eulinx-color-text-muted)]">
        {bottomTab === "logs" && (
          <>
            {logLines.length === 0 ? (
              <div>Waiting for log output...</div>
            ) : (
              logLines.map((line, i) => (
                <div key={i}>
                  <span style={{ color: `var(--Eulinx-color-${line.tone === "accent" ? "accent" : line.tone})` }}>
                    [{line.source}]
                  </span>{" "}
                  {line.text}
                </div>
              ))
            )}
          </>
        )}
        {bottomTab === "problems" &&
          (PROBLEMS.length === 0 ? (
            <div>No problems detected.</div>
          ) : (
            PROBLEMS.map((p, i) => (
              <ListRow key={i} className="font-mono text-xs">
                <Dot tone={p.severity} />
                <span className="text-[color:var(--Eulinx-color-text-secondary)]">{p.label}</span>
                <span className="text-[color:var(--Eulinx-color-text-muted)]">{p.detail}</span>
              </ListRow>
            ))
          ))}
        {bottomTab === "events" &&
          (eventEntries.length === 0 ? (
            <div>Waiting for events...</div>
          ) : (
            eventEntries.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <Dot tone={e.severity} />
                <span className="text-[color:var(--Eulinx-color-text-secondary)]">{e.label}</span>
                <span className="text-[color:var(--Eulinx-color-text-muted)]">{e.time}</span>
              </div>
            ))
          ))}
        {bottomTab === "memory" &&
          (memoryDisplay.length === 0 ? (
            <div>Memory entries will appear here.</div>
          ) : (
            memoryDisplay.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <StateBadge tone={m.tone}>{m.key}</StateBadge>
                <span className="text-[color:var(--Eulinx-color-text-secondary)]">{m.value}</span>
              </div>
            ))
          ))}
      </div>
      )}
    </div>
  )
}
