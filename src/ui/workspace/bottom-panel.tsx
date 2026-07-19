import { Activity, Database, Maximize2, Minimize2, TerminalSquare, Triangle, X } from "lucide-react"
import { cn } from "@/utils/cn"
import type { BottomTab } from "./types"
import { useWorkspace } from "./use-workspace"

const TABS: readonly { readonly id: BottomTab; readonly label: string; readonly icon: React.ReactNode }[] = [
  { id: "logs", label: "Logs", icon: <TerminalSquare className="h-3 w-3" strokeWidth={1.5} /> },
  { id: "problems", label: "Problems", icon: <Triangle className="h-3 w-3" strokeWidth={1.5} /> },
  { id: "events", label: "Events", icon: <Activity className="h-3 w-3" strokeWidth={1.5} /> },
  { id: "memory", label: "Memory", icon: <Database className="h-3 w-3" strokeWidth={1.5} /> },
]

export function BottomPanel() {
  const { bottomTab, setBottomTab, bottomPanelOpen, setBottomPanelOpen } = useWorkspace()

  if (!bottomPanelOpen) return null

  return (
    <div
      className="flex shrink-0 flex-col border-t border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-panel)]"
      style={{ height: "var(--wsx-panel-h)" }}
    >
      <div className="flex h-8 shrink-0 items-center gap-0 border-b border-[color:var(--wsx-border)] px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setBottomTab(tab.id)}
            className={cn(
              "flex h-full items-center gap-1 border-b-2 px-3 text-[11px] transition-colors",
              bottomTab === tab.id
                ? "border-[color:var(--wsx-accent)] text-[color:var(--wsx-text)]"
                : "border-transparent text-[color:var(--wsx-text-muted)] hover:text-[color:var(--wsx-text-sec)]",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex gap-0.5">
          <PanelAction title="Clear">
            <X className="h-3 w-3" strokeWidth={1.5} />
          </PanelAction>
          <PanelAction title="Maximize panel">
            <Maximize2 className="h-3 w-3" strokeWidth={1.5} />
          </PanelAction>
          <PanelAction title="Close panel" onClick={() => setBottomPanelOpen(false)}>
            <Minimize2 className="h-3 w-3" strokeWidth={1.5} />
          </PanelAction>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-[1.8] text-[color:var(--wsx-text-muted)]">
        {bottomTab === "logs" && (
          <>
            <div><span className="text-[color:var(--wsx-accent)]">[vite]</span> VITE v5.4.12  ready in 312ms</div>
            <div><span className="text-[color:var(--wsx-accent)]">[vite]</span>  ➜  Local:   http://localhost:1420/</div>
            <div><span className="text-[color:var(--wsx-accent)]">[vite]</span>  ➜  Network: use --host to expose</div>
            <div><span className="text-[color:var(--wsx-green)]">[test]</span> running 42 tests</div>
            <div><span className="text-[color:var(--wsx-green)]">[test]</span> test result: ok. 42 passed, 0 failed</div>
            <div><span className="text-[color:var(--wsx-amber)]">[lint]</span> 0 errors, 2 warnings</div>
          </>
        )}
        {bottomTab === "problems" && <div>No problems detected.</div>}
        {bottomTab === "events" && <div>Waiting for events...</div>}
        {bottomTab === "memory" && <div>Memory entries will appear here.</div>}
      </div>
    </div>
  )
}

function PanelAction({
  title,
  onClick,
  children,
}: {
  title: string
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-[22px] w-[22px] items-center justify-center rounded-[var(--wsx-r-sm)] text-[color:var(--wsx-text-muted)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text-sec)]"
    >
      {children}
    </button>
  )
}
