/**
 * CanvasView — the primary workspace view when a project is open.
 *
 * Shows the node graph canvas as the main content. This replaces the
 * old stat-card Dashboard. The canvas IS the workspace.
 *
 * Wraps the WorkflowDesigner and provides the empty state when no
 * nodes exist.
 */

import { type ReactNode } from "react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"

export interface CanvasViewProps {
  /** Whether the graph has any nodes. */
  readonly hasNodes?: boolean
  /** Called when user wants to add the first node. */
  readonly onAddNode?: () => void
  /** The actual canvas content (WorkflowDesigner). */
  readonly children?: ReactNode
}

export function CanvasView({
  hasNodes = false,
  onAddNode,
  children,
}: CanvasViewProps): ReactNode {
  if (!hasNodes) {
    return <CanvasEmptyState onAddNode={onAddNode} />
  }

  return (
    <div className="h-full w-full overflow-hidden">
      {children}
    </div>
  )
}

function CanvasEmptyState({
  onAddNode,
}: {
  onAddNode?: () => void
}): ReactNode {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-4"
      style={{ background: token("--Eulinx-color-background") }}
    >
      <div
        className="flex flex-col items-center gap-3 text-center"
        style={{ maxWidth: 320 }}
      >
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: 48,
            height: 48,
            background: token("--Eulinx-color-surface"),
            border: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
          }}
        >
          <span style={{ color: token("--Eulinx-color-text-muted") }}>
            <Icon
              name="domain.graph"
              size="md"
              aria-hidden
            />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h2
            className="text-sm font-medium"
            style={{ color: token("--Eulinx-color-text") }}
          >
            Start your first task
          </h2>
          <p
            className="text-xs"
            style={{ color: token("--Eulinx-color-text-muted") }}
          >
            Add an AI helper to begin. Each helper — called a worker — carries out
            steps of your goal in its own terminal session. You can add more and
            connect them as your project grows.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddNode}
          className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: token("--Eulinx-color-accent"),
            color: token("--Eulinx-color-surface"),
          }}
        >
          <Icon name="action.add" size="xs" aria-hidden />
          Add your first worker
        </button>
      </div>
    </div>
  )
}
