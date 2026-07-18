/**
 * Eulinx Sidebar — Worker list, grouped by lifecycle state.
 *
 * Workers are live and grouped per Sidebar-Part01 §WorkerListState groupOrder.
 * Each row shows a state pill using the canonical `getStateSignal(state)` triple
 * (color token + icon + label), never color alone (Accessibility-Part01).
 * The worker list stays live and interactive during a workspace switch — it is
 * exempt from the `switching` dim/disable.
 */

import { useMemo } from "react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import { type WorkerState } from "@/a11y"
import { WorkerStatePill } from "./state-pill"
import type { SidebarNavigate, WorkerSummary } from "./sidebar-data"

const GROUP_ORDER: ReadonlyArray<{ id: string; label: string }> = [
  { id: "active", label: "Active" },
  { id: "attention", label: "Needs attention" },
  { id: "pending", label: "Pending" },
  { id: "finished", label: "Finished" },
]

function groupOf(state: WorkerState): string {
  switch (state) {
    case "working":
    case "waiting":
    case "idle":
      return "active"
    case "blocked":
    case "failing":
    case "zombie":
      return "attention"
    case "requested":
    case "queued":
    case "spawning":
    case "initializing":
    case "paused":
      return "pending"
    case "terminating":
    case "terminated":
      return "finished"
  }
}

export interface WorkerListProps {
  readonly workers: readonly WorkerSummary[]
  readonly collapsedGroups: ReadonlySet<string>
  readonly onToggleGroup: (groupId: string) => void
  readonly onNavigate: SidebarNavigate
  readonly selection: string | null
}

export function WorkerList({
  workers,
  collapsedGroups,
  onToggleGroup,
  onNavigate,
  selection,
}: WorkerListProps): React.ReactElement {
  const grouped = useMemo(() => {
    const map = new Map<string, WorkerSummary[]>()
    for (const w of workers) {
      const g = groupOf(w.state)
      const arr = map.get(g)
      if (arr) arr.push(w)
      else map.set(g, [w])
    }
    return map
  }, [workers])

  const total = workers.length

  return (
    <div role="listbox" aria-label="Workers" className="flex flex-col">
      <div className="px-2 py-1 text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
        {total} worker{total === 1 ? "" : "s"}
      </div>
      {GROUP_ORDER.map((group) => {
        const items = grouped.get(group.id) ?? []
        if (items.length === 0) return null
        const open = !collapsedGroups.has(group.id)
        return (
          <div key={group.id} role="group" aria-label={group.label}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => onToggleGroup(group.id)}
              className="flex w-full items-center gap-1 px-2 py-1 text-role-caption"
              style={{ color: token("--Eulinx-color-text-muted") }}
            >
              <Icon
                name={open ? "nav.chevron.down" : "nav.chevron.right"}
                size="xs"
                aria-hidden
              />
              <span>{group.label}</span>
              <span style={{ marginLeft: "auto" }}>{items.length}</span>
            </button>
            {open
              ?                 items.map((w) => {
                  const selected = selection === w.workerId
                  return (
                    <button
                      key={w.workerId}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() =>
                        onNavigate({ kind: "worker", id: w.workerId })
                      }
                      className="flex w-full items-center gap-2 px-2 py-1 text-left"
                      style={{
                        paddingLeft: 24,
                        color: selected
                          ? token("--Eulinx-color-accent")
                          : token("--Eulinx-color-text-primary"),
                        background: selected ? token("--Eulinx-color-elevated-2") : "transparent",
                        outline: "none",
                      }}
                    >
                      <Icon name="domain.worker" size="xs" aria-hidden />
                      <span className="truncate text-role-caption" title={w.label}>
                        {w.label}
                      </span>
                      <span style={{ marginLeft: "auto" }} aria-hidden>
                        <WorkerStatePill state={w.state} />
                      </span>
                    </button>
                  )
                })
              : null}
          </div>
        )
      })}
    </div>
  )
}
