import {
  ArrowUpRight,
  CircleCheck,
  FolderOpen,
  GitBranch,
  MoreVertical,
  RefreshCw,
  TerminalSquare,
  Users,
} from "lucide-react"
import { cn } from "@/utils/cn"
import type { RightTab } from "./types"
import { useWorkspace } from "./use-workspace"
import { ToolbarButton } from "./primitives"
import type { SurfaceKey } from "./workspace-app"
import { FilesTab } from "./right-tabs/files-tab"
import { GitTab } from "./right-tabs/git-tab"
import { WorkersTab } from "./right-tabs/workers-tab"
import { SessionsTab } from "./right-tabs/sessions-tab"
import { ChecksTab } from "./right-tabs/checks-tab"

const TABS: readonly { readonly id: RightTab; readonly title: string; readonly icon: React.ReactNode; readonly surface?: SurfaceKey }[] = [
  { id: "files", title: "Explorer", icon: <FolderOpen className="h-4 w-4" strokeWidth={1.5} /> },
  { id: "git", title: "Source Control", icon: <GitBranch className="h-4 w-4" strokeWidth={1.5} /> },
  { id: "workers", title: "Workers", icon: <Users className="h-4 w-4" strokeWidth={1.5} />, surface: "workers" },
  { id: "sessions", title: "Sessions", icon: <TerminalSquare className="h-4 w-4" strokeWidth={1.5} />, surface: "sessions" },
  { id: "checks", title: "Checks", icon: <CircleCheck className="h-4 w-4" strokeWidth={1.5} /> },
]

export function RightSidebar({
  onOpenSurface,
}: {
  onOpenSurface: (key: SurfaceKey) => void
}) {
  const { rightTab, setRightTab } = useWorkspace()
  const activeTab = TABS.find((t) => t.id === rightTab)

  return (
    <div className="flex h-full flex-col overflow-hidden border-l border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-sidebar)]">
      <div className="flex h-10 shrink-0 items-center gap-0 border-b border-[color:var(--Eulinx-color-border)] px-2">
        {TABS.map((tab) => {
          const active = rightTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.title}
              title={tab.title}
              aria-pressed={active}
              onClick={() => setRightTab(tab.id)}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-[var(--Eulinx-radius-sm)] transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                active
                  ? "text-[color:var(--Eulinx-color-text)] after:absolute after:bottom-0.5 after:left-2 after:right-2 after:h-0.5 after:rounded-[var(--Eulinx-radius-xs)] after:bg-[color:var(--Eulinx-color-accent)] after:content-['']"
                  : "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]",
              )}
            >
              {tab.icon}
            </button>
          )
        })}
        <div className="flex-1" />
        {activeTab?.surface && (
          <ToolbarButton
            tip={`Open ${activeTab.title} surface`}
            aria-label={`Open ${activeTab.title} surface`}
            title={`Open ${activeTab.title} surface`}
            onClick={() => onOpenSurface(activeTab.surface as SurfaceKey)}
          >
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ToolbarButton>
        )}
        <ToolbarButton tip="Refresh" aria-label="Refresh" title="Refresh">
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
        </ToolbarButton>
        <ToolbarButton tip="More" aria-label="More" title="More">
          <MoreVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
        </ToolbarButton>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-[color:var(--Eulinx-color-surface)]">
        {rightTab === "files" && <FilesTab />}
        {rightTab === "git" && <GitTab />}
        {rightTab === "workers" && <WorkersTab />}
        {rightTab === "sessions" && <SessionsTab />}
        {rightTab === "checks" && <ChecksTab />}
      </div>
    </div>
  )
}
