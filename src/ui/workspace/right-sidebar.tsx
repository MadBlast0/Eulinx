import { cn } from "@/utils/cn"
import type { RightTab } from "./types"
import { useWorkspace } from "./use-workspace"
import { FilesTab } from "./right-tabs/files-tab"
import { GitTab } from "./right-tabs/git-tab"
import { SessionsTab } from "./right-tabs/sessions-tab"
import { PropertiesTab } from "./right-tabs/properties-tab"
import { LogsTab } from "./right-tabs/logs-tab"

const TABS: readonly { readonly id: RightTab; readonly title: string }[] = [
  { id: "properties", title: "Properties" },
  { id: "git", title: "Git" },
  { id: "files", title: "Files" },
  { id: "sessions", title: "Sessions" },
  { id: "logs", title: "Logs" },
]

export function RightSidebar() {
  const { rightTab, setRightTab } = useWorkspace()

  return (
    <div className="flex h-full flex-col overflow-hidden border-l border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-sidebar)]">
      <div className="flex h-[38px] shrink-0 items-center gap-0 border-b border-[color:var(--Eulinx-color-border)] px-2">
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
                "relative flex h-9 items-center px-2.5 text-[12px] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                active
                  ? "text-[color:var(--Eulinx-color-text)] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-[var(--Eulinx-radius-xs)] after:bg-[color:var(--Eulinx-color-accent)] after:content-['']"
                  : "text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]",
              )}
            >
              {tab.title}
            </button>
          )
        })}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-[color:var(--Eulinx-color-surface)]">
        {rightTab === "properties" && <PropertiesTab />}
        {rightTab === "git" && <GitTab />}
        {rightTab === "files" && <FilesTab />}
        {rightTab === "sessions" && <SessionsTab />}
        {rightTab === "logs" && <LogsTab />}
      </div>
    </div>
  )
}
