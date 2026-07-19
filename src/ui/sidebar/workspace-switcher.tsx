/**
 * WorkspaceSwitcher — workspace selector with popover.
 *
 * Lists workspaces (and their active project) and lets the user switch.
 * Clean, minimal styling with proper focus management.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import { useFocusTrap } from "@/a11y"
import type { SidebarSwitchWorkspace, Workspace } from "./sidebar-data"

export interface WorkspaceSwitcherProps {
  readonly workspaces: readonly Workspace[]
  readonly activeWorkspaceId: string | null
  readonly activeProjectId: string | null
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSwitch: SidebarSwitchWorkspace
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  activeProjectId: _activeProjectId,
  open,
  onOpenChange,
  onSwitch,
}: WorkspaceSwitcherProps): React.ReactElement {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState("")
  useFocusTrap(popRef as React.RefObject<HTMLElement>, open, () => onOpenChange(false))

  useEffect(() => {
    if (!open) setFilter("")
  }, [open])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (q.length === 0) return workspaces
    return workspaces.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.projectName?.toLowerCase().includes(q) ?? false),
    )
  }, [workspaces, filter])

  const active = workspaces.find((w) => w.id === activeWorkspaceId) ?? null

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[color:var(--Eulinx-color-hover)]"
        style={{ borderBottom: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}` }}
      >
        <span style={{ color: token("--Eulinx-color-text-muted") }}>
          <Icon name="domain.workspace" size="sm" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-medium" style={{ color: token("--Eulinx-color-text") }}>
            {active?.name ?? "No workspace"}
          </span>
          {active?.projectName ? (
            <span className="truncate text-[10px]" style={{ color: token("--Eulinx-color-text-muted") }}>
              {active.projectName}
            </span>
          ) : null}
        </span>
        <span style={{ color: token("--Eulinx-color-text-muted") }}>
          <Icon name="nav.chevron.down" size="xs" aria-hidden />
        </span>
      </button>

      {open ? (
        <div
          ref={popRef}
          role="menu"
          aria-label="Switch workspace"
          className="absolute left-0 right-0 top-full z-dropdown mt-1 flex flex-col"
          style={{
            zIndex: 100,
            background: token("--Eulinx-color-surface"),
            border: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
            borderRadius: 8,
            boxShadow: token("--Eulinx-elev-md"),
          }}
        >
          <div className="p-2" role="search">
            <input
              type="text"
              aria-label="Filter workspaces"
              placeholder="Filter workspaces..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
              className="w-full rounded bg-transparent px-2 py-1 text-xs outline-none"
              style={{
                color: token("--Eulinx-color-text"),
                border: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
              }}
            />
          </div>
          <div role="menu" className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-2 py-1 text-xs" style={{ color: token("--Eulinx-color-text-muted") }}>
                No matches
              </div>
            ) : (
              filtered.map((w) => {
                const isActive = w.id === activeWorkspaceId
                return (
                  <button
                    key={w.id}
                    type="button"
                    role="menuitem"
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => {
                      onSwitch(w.id)
                      onOpenChange(false)
                    }}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-[color:var(--Eulinx-color-hover)]"
                    style={{
                      color: isActive ? token("--Eulinx-color-accent") : token("--Eulinx-color-text"),
                      background: isActive ? token("--Eulinx-color-surface-alt") : "transparent",
                    }}
                  >
                    <Icon name="domain.workspace" size="xs" aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs">{w.name}</span>
                      {w.projectName ? (
                        <span className="truncate text-[10px]" style={{ color: token("--Eulinx-color-text-muted") }}>
                          {w.projectName}
                        </span>
                      ) : null}
                    </span>
                    {isActive ? <Icon name="status.success" size="xs" label="Active" /> : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
