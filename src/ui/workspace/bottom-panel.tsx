import { useState } from "react"
import {
  Activity,
  Database,
  Maximize2,
  Minimize2,
  ScrollText,
  TerminalSquare,
  Triangle,
  X,
} from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const TABS: readonly { readonly id: BottomTab; readonly label: string; readonly icon: React.ReactNode }[] = [
  { id: "logs", label: "Logs", icon: <TerminalSquare className="h-3 w-3" strokeWidth={1.5} /> },
  { id: "problems", label: "Problems", icon: <Triangle className="h-3 w-3" strokeWidth={1.5} /> },
  { id: "events", label: "Events", icon: <Activity className="h-3 w-3" strokeWidth={1.5} /> },
  { id: "memory", label: "Memory", icon: <Database className="h-3 w-3" strokeWidth={1.5} /> },
]

const TAB_LABEL: Record<BottomTab, string> = {
  logs: "Logs",
  problems: "Problems",
  events: "Events",
  memory: "Memory",
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
  const { logLines, eventEntries } = useRuntime()
  const { entries: memoryEntries } = useMemory()

  const [dockView, setDockView] = useState<DockView>({ kind: "tab", tab: bottomTab })

  if (!bottomPanelOpen) return null

  const activePanelKey = dockView.kind === "panel" ? dockView.key : null

  const memoryDisplay: readonly MemoryEntry[] = memoryEntries.map((e) => ({
    key: e.title,
    value: `${e.kind} — ${e.tags.join(", ")}`,
    tone: SEVERITY_TONE[e.severity] ?? "neutral",
  }))

  return (
    <div
      className="flex shrink-0 flex-col border-t border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-sidebar)]"
      style={{ height: "var(--wsx-panel-h)" }}
    >
      <div
        className="flex h-8 shrink-0 items-center gap-0 border-b border-[color:var(--Eulinx-color-border)] px-2"
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
              "flex h-full items-center gap-1 border-b-2 px-3 text-[11px] transition-colors",
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
                "flex h-6 items-center gap-1 rounded-[var(--Eulinx-radius-sm)] px-2 text-[11px]",
                "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
            >
              <ScrollText className="h-3 w-3" strokeWidth={1.5} />
              Panels
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PANEL_ORDER.map((key) => {
              const def = PANEL_REGISTRY[key]
              const Icon = def.icon
              return (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => setDockView({ kind: "panel", key })}
                >
                  <Icon className="h-3 w-3" strokeWidth={1.5} />
                  {def.title}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarSep />

        <div className="flex gap-0.5">
          <ToolbarButton tip="Clear" size={22} aria-label="Clear">
            <X className="h-3 w-3" strokeWidth={1.5} />
          </ToolbarButton>
          <ToolbarButton tip="Maximize panel" size={22} aria-label="Maximize panel">
            <Maximize2 className="h-3 w-3" strokeWidth={1.5} />
          </ToolbarButton>
          <ToolbarButton
            tip="Close panel"
            size={22}
            aria-label="Close panel"
            onClick={() => setBottomPanelOpen(false)}
          >
            <Minimize2 className="h-3 w-3" strokeWidth={1.5} />
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
