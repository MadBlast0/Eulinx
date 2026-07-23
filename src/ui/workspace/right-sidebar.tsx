import { type ReactNode } from "react"
import { AppIcon } from "./app-icon"
import { cn } from "@/utils/cn"
import { Button } from "@/components/ui/button"
import type { RightTab } from "./types"
import { useWorkspace } from "./use-workspace"
import { FilesTab } from "./right-tabs/files-tab"
import { GitTab } from "./right-tabs/git-tab"
import { SessionsTab } from "./right-tabs/sessions-tab"
import { LogsTab } from "./right-tabs/logs-tab"
import { WorkersTab } from "./right-tabs/workers-tab"

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Compact segmented toggle — used for filter / mode switches. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly { readonly value: T; readonly label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 px-2.5 py-1 text-center text-xs transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--Eulinx-color-ring)]",
            value === opt.value
              ? "bg-[color:var(--Eulinx-color-info)]/12 text-[color:var(--Eulinx-color-text)]"
              : "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]/50 hover:text-[color:var(--Eulinx-color-text-secondary)]",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/** Compact search input with icon. */
export function SearchField({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-2.5 py-1 transition-colors",
        "focus-within:border-[color:var(--Eulinx-color-ring)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)]"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent text-xs text-[color:var(--Eulinx-color-text)] placeholder:text-[color:var(--Eulinx-color-text-muted)] focus-visible:outline-none"
      />
    </div>
  )
}

/** Section header with optional right-aligned content. */
export function SectionHeader({
  label,
  count,
  action,
}: {
  label: string
  count?: number
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
        {label}
        {count !== undefined && (
          <span className="ml-1.5 text-[color:var(--Eulinx-color-text-muted)]/60">{count}</span>
        )}
      </span>
      {action}
    </div>
  )
}

/** Consistent empty state with icon, title, and optional description. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--Eulinx-color-surface)] text-[color:var(--Eulinx-color-text-muted)]">
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-[color:var(--Eulinx-color-text-secondary)]">{title}</p>
        {description && (
          <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--Eulinx-color-text-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

const TABS: readonly {
  readonly id: RightTab
  readonly iconName: string
  readonly label: string
}[] = [
  { id: "files", iconName: "files", label: "Files" },
  { id: "git", iconName: "git", label: "Git" },
  { id: "sessions", iconName: "sessions", label: "Sessions" },
  { id: "logs", iconName: "logs", label: "Logs" },
  { id: "workers", iconName: "runtime", label: "Workers" },
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
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={tab.label}
      title={tab.label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative h-9 w-9 rounded-md text-[color:var(--Eulinx-color-text-muted)]",
        active
          ? "bg-[color:var(--Eulinx-color-info)]/10 text-[color:var(--Eulinx-color-text)]"
          : "hover:bg-[color:var(--Eulinx-color-hover)]/50 hover:text-[color:var(--Eulinx-color-text-secondary)]",
      )}
    >
      <AppIcon name={tab.iconName} size={16} strokeWidth={2} />
      {active && (
        <span className="absolute inset-x-1 -bottom-[5px] h-0.5 rounded-full bg-[color:var(--Eulinx-color-info)]" />
      )}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Right sidebar
// ---------------------------------------------------------------------------

export function RightSidebar() {
  const { rightTab, setRightTab } = useWorkspace()

  return (
    <div className="flex h-full flex-col overflow-hidden bg-sidebar">
      {/* Tab bar */}
      <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-[color:var(--Eulinx-color-border)] px-1.5">
        {TABS.map((tab) => (
          <SidebarTab
            key={tab.id}
            tab={tab}
            active={rightTab === tab.id}
            onClick={() => setRightTab(tab.id)}
          />
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-surface">
        {rightTab === "files" && <FilesTab />}
        {rightTab === "git" && <GitTab />}
        {rightTab === "sessions" && <SessionsTab />}
        {rightTab === "logs" && <LogsTab />}
        {rightTab === "workers" && <WorkersTab />}
      </div>
    </div>
  )
}
