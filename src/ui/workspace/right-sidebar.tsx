import {
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
import { FilesTab } from "./right-tabs/files-tab"
import { GitTab } from "./right-tabs/git-tab"
import { WorkersTab } from "./right-tabs/workers-tab"
import { SessionsTab } from "./right-tabs/sessions-tab"
import { ChecksTab } from "./right-tabs/checks-tab"

const TABS: readonly { readonly id: RightTab; readonly title: string; readonly icon: React.ReactNode }[] = [
  { id: "files", title: "Explorer", icon: <FolderOpen className="h-4 w-4" strokeWidth={1.5} /> },
  { id: "git", title: "Source Control", icon: <GitBranch className="h-4 w-4" strokeWidth={1.5} /> },
  { id: "workers", title: "Workers", icon: <Users className="h-4 w-4" strokeWidth={1.5} /> },
  { id: "sessions", title: "Sessions", icon: <TerminalSquare className="h-4 w-4" strokeWidth={1.5} /> },
  { id: "checks", title: "Checks", icon: <CircleCheck className="h-4 w-4" strokeWidth={1.5} /> },
]

export function RightSidebar() {
  const { rightTab, setRightTab } = useWorkspace()

  return (
    <div className="flex h-full flex-col overflow-hidden border-l border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-panel)]">
      <div className="flex h-10 shrink-0 items-center gap-0 border-b border-[color:var(--wsx-border)] px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            title={tab.title}
            onClick={() => setRightTab(tab.id)}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-[var(--wsx-r-sm)] transition-colors",
              rightTab === tab.id
                ? "text-[color:var(--wsx-text)] after:absolute after:bottom-0.5 after:left-2 after:right-2 after:h-0.5 after:rounded-[1px] after:bg-[color:var(--wsx-accent)] after:content-['']"
                : "text-[color:var(--wsx-text-muted)] hover:text-[color:var(--wsx-text-sec)]",
            )}
          >
            {tab.icon}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          title="Refresh"
          className="flex h-7 w-7 items-center justify-center rounded-[var(--wsx-r-sm)] text-[color:var(--wsx-text-muted)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text-sec)]"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          title="More"
          className="flex h-7 w-7 items-center justify-center rounded-[var(--wsx-r-sm)] text-[color:var(--wsx-text-muted)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text-sec)]"
        >
          <MoreVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {rightTab === "files" && <FilesTab />}
      {rightTab === "git" && <GitTab />}
      {rightTab === "workers" && <WorkersTab />}
      {rightTab === "sessions" && <SessionsTab />}
      {rightTab === "checks" && <ChecksTab />}
    </div>
  )
}
