/**
 * Eulinx Sidebar — Workspace switcher.
 *
 * Lists workspaces (and their active project) and lets the user switch. The
 * popover is positioned above the trigger and uses the `--Eulinx-z-dropdown`
 * layer. Switching a workspace MUST NOT touch any worker process — it only
 * changes which workspace the Sidebar displays (Sidebar-Part01 §MUST NOT).
 *
 * Keyboard-operable: the filter input and option buttons are normal tab stops
 * within the popover; Escape closes and restores focus to the trigger.
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
  activeProjectId,
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
        className="flex w-full items-center gap-2 px-2 py-2 text-left"
        style={{ borderBottom: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}` }}
      >
        <Icon name="domain.workspace" size="sm" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-role-label" style={{ color: token("--Eulinx-color-text-primary") }}>
            {active?.name ?? "No workspace"}
          </span>
          {active?.projectName ? (
            <span className="truncate text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
              {active.projectName}
              {activeProjectId ? ` · ${activeProjectId}` : ""}
            </span>
          ) : null}
        </span>
        <Icon name="nav.chevron.down" size="xs" aria-hidden />
      </button>

      {open ? (
        <div
          ref={popRef}
          role="menu"
          aria-label="Switch workspace"
          className="absolute left-0 right-0 top-full z-dropdown mt-1 flex flex-col"
          style={{
            zIndex: 100,
            background: token("--Eulinx-color-elevated"),
            border: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
            borderRadius: "var(--Eulinx-radius-md)",
            boxShadow: "var(--Eulinx-elev-md)",
          }}
        >
          <div className="p-2" role="search">
            <input
              type="text"
              aria-label="Filter workspaces"
              placeholder="Filter workspaces…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
              className="w-full bg-transparent px-2 py-1 text-role-caption outline-none"
              style={{ color: token("--Eulinx-color-text-primary") }}
            />
          </div>
          <div role="menu" className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-2 py-1 text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
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
                    className="flex w-full items-center gap-2 px-2 py-1 text-left"
                    style={{
                      color: isActive ? token("--Eulinx-color-accent") : token("--Eulinx-color-text-primary"),
                      background: isActive ? token("--Eulinx-color-elevated-2") : "transparent",
                    }}
                  >
                    <Icon name="domain.workspace" size="xs" aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-role-caption">{w.name}</span>
                      {w.projectName ? (
                        <span className="truncate text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
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
