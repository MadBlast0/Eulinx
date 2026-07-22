import {
  GitBranch,
  FolderTree,
  Clock,
  ScrollText,
  Cpu,
} from "lucide-react"
import { cn } from "@/utils/cn"
import type { RightTab } from "./types"
import { useWorkspace } from "./use-workspace"
import { FilesTab } from "./right-tabs/files-tab"
import { GitTab } from "./right-tabs/git-tab"
import { SessionsTab } from "./right-tabs/sessions-tab"
import { LogsTab } from "./right-tabs/logs-tab"
import { WorkersTab } from "./right-tabs/workers-tab"

const TABS: readonly {
  readonly id: RightTab
  readonly icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  readonly label: string
}[] = [
  { id: "files", icon: FolderTree, label: "Files" },
  { id: "git", icon: GitBranch, label: "Git" },
  { id: "sessions", icon: Clock, label: "Sessions" },
  { id: "logs", icon: ScrollText, label: "Logs" },
  { id: "workers", icon: Cpu, label: "Workers" },
]

function SidebarTab({
  tab,
  active,
  onClick,
}: {
  tab: (typeof TABS)[number]
  active: boolean
  onClick: () => void
}) {
  const IconComponent = tab.icon

  return (
    <button
      type="button"
      aria-label={tab.label}
      title={tab.label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[var(--Eulinx-radius-sm)]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        active
          ? "bg-[color:var(--Eulinx-color-hover)] text-[color:var(--Eulinx-color-text)]"
          : "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]",
      )}
      style={{ transition: "background-color 150ms, color 150ms" }}
    >
      <IconComponent size={18} strokeWidth={1.5} />
    </button>
  )
}

export function RightSidebar() {
  const { rightTab, setRightTab } = useWorkspace()

  return (
    <div className="flex h-full flex-col overflow-hidden border-l border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-sidebar)]">
      <div className="flex h-[40px] shrink-0 items-center justify-start gap-1 border-b border-[color:var(--Eulinx-color-border)] px-2">
        {TABS.map((tab) => (
          <SidebarTab
            key={tab.id}
            tab={tab}
            active={rightTab === tab.id}
            onClick={() => setRightTab(tab.id)}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-[color:var(--Eulinx-color-surface)]">
        {rightTab === "files" && <FilesTab />}
        {rightTab === "git" && <GitTab />}
        {rightTab === "sessions" && <SessionsTab />}
        {rightTab === "logs" && <LogsTab />}
        {rightTab === "workers" && <WorkersTab />}
      </div>
    </div>
  )
}
