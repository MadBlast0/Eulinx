/**
 * Eulinx Sidebar — Workflow list for the active workspace.
 *
 * Each row shows the workflow name, a progress fraction, and a status pill
 * rendered with the non-color triple (icon + label + color token) so the
 * status is never signalled by color alone (Accessibility-Part01).
 */

import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import { StatePill } from "./state-pill"
import type { SidebarNavigate, WorkflowSummary } from "./sidebar-data"

const WORKFLOW_STATUS: Record<
  WorkflowSummary["status"],
  { icon: string; label: string; colorToken: string }
> = {
  draft: { icon: "domain.workflow", label: "Draft", colorToken: "--Eulinx-color-text-muted" },
  running: { icon: "status.loading", label: "Running", colorToken: "--Eulinx-color-state-working" },
  paused: { icon: "action.pause", label: "Paused", colorToken: "--Eulinx-color-state-paused" },
  completed: { icon: "status.success", label: "Completed", colorToken: "--Eulinx-color-state-working" },
  failed: { icon: "status.error", label: "Failed", colorToken: "--Eulinx-color-state-failing" },
}

export interface WorkflowListProps {
  readonly workflows: readonly WorkflowSummary[]
  readonly onNavigate: SidebarNavigate
  readonly selection: string | null
}

export function WorkflowList({
  workflows,
  onNavigate,
  selection,
}: WorkflowListProps): React.ReactElement {
  if (workflows.length === 0) {
    return (
      <div className="px-2 py-1 text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
        No workflows
      </div>
    )
  }
  return (
    <ul role="list" aria-label="Workflows" className="flex flex-col">
      {workflows.map((wf) => {
        const meta = WORKFLOW_STATUS[wf.status]
        const selected = selection === wf.workflowId
        const progress =
          wf.nodeCount > 0 ? Math.round((wf.completedNodeCount / wf.nodeCount) * 100) : 0
        return (
          <li key={wf.workflowId}>
            <button
              type="button"
              aria-selected={selected}
              onClick={() => onNavigate({ kind: "workflow", id: wf.workflowId })}
              className="flex w-full items-center gap-2 px-2 py-1 text-left"
              style={{
                color: selected ? token("--Eulinx-color-accent") : token("--Eulinx-color-text"),
                background: selected ? token("--Eulinx-color-surface-alt") : "transparent",
                outline: "none",
              }}
            >
              <Icon name="domain.workflow" size="xs" aria-hidden />
              <span className="truncate text-role-caption" title={wf.name}>
                {wf.name}
              </span>
              <span style={{ marginLeft: "auto" }}>
                <StatePill icon={meta.icon} label={meta.label} colorToken={meta.colorToken} />
              </span>
              <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
                {progress}%
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
