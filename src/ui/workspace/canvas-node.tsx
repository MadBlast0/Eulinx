// @Eulinx-exception:nodegraph-canvas
import { Minus, X } from "lucide-react"
import { cn } from "@/utils/cn"
import { AppIcon } from "./app-icon"
import type { CanvasNode, NodeKind } from "./types"
import { Dot } from "./primitives"
import { TerminalView } from "./terminal"

const NODE_TOKEN: Record<NodeKind, string> = {
  terminal: "var(--Eulinx-color-node-terminal)",
  browser: "var(--Eulinx-color-node-browser)",
  map: "var(--Eulinx-color-node-map)",
  worker: "var(--Eulinx-color-node-worker)",
  agent: "var(--Eulinx-color-node-worker)",
  session: "var(--Eulinx-color-node-terminal)",
  memory: "var(--Eulinx-color-node-map)",
  prompt: "var(--Eulinx-color-node-worker)",
  merge: "var(--Eulinx-color-node-terminal)",
  router: "var(--Eulinx-color-node-browser)",
  tool: "var(--Eulinx-color-node-terminal)",
  file: "var(--Eulinx-color-node-terminal)",
  event: "var(--Eulinx-color-node-map)",
  metric: "var(--Eulinx-color-node-browser)",
  log: "var(--Eulinx-color-node-terminal)",
  note: "var(--Eulinx-color-node-map)",
  unknown: "var(--Eulinx-color-node-terminal)",
}



function NodeIcon({ kind }: { kind: NodeKind }) {
  const cls = "h-3.5 w-3.5"
  if (kind === "terminal") return <AppIcon name="terminal" className={cls} strokeWidth={2.25} />
  if (kind === "browser") return <AppIcon name="api" className={cls} strokeWidth={2.25} />
  return <AppIcon name="graph" className={cls} strokeWidth={2.25} />
}

export function CanvasNodeCard({
  node,
  dragging,
  onPointerDown,
  onRemove,
}: {
  node: CanvasNode
  dragging: boolean
  onPointerDown: (e: React.MouseEvent) => void
  onRemove: () => void
}) {
  const accent = NODE_TOKEN[node.kind]

  return (
    <div
      data-node-id={node.id}
      onMouseDown={onPointerDown}
      className={cn(
        "group absolute flex select-none overflow-hidden rounded-[var(--Eulinx-radius-lg)] border bg-[color:var(--Eulinx-color-surface)] transition-shadow",
        dragging ? "cursor-grabbing" : "cursor-grab",
        node.selected
          ? "border-[color:var(--Eulinx-color-accent)] ring-1 ring-[color:var(--Eulinx-color-accent)]"
          : "border-[color:var(--Eulinx-color-border)] hover:border-[color:var(--Eulinx-color-border-strong)]",
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        boxShadow: node.selected
          ? "var(--Eulinx-elev-md)"
          : "var(--Eulinx-elev-sm)",
      }}
    >
      <div
        className="w-[3px] shrink-0"
        style={{ background: accent }}
        aria-hidden="true"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-toolbar)] px-3 py-2 text-xs font-medium">
          <span className="flex h-4 w-4 items-center justify-center" style={{ color: accent }}>
            <NodeIcon kind={node.kind} />
          </span>
          <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[color:var(--Eulinx-color-text)]">
            {node.label}
          </span>
          <Dot
            tone={
              node.kind === "terminal"
                ? "info"
                : node.kind === "browser"
                  ? "success"
                  : "warning"
            }
          />
          <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              aria-label="Minimize node"
              className="flex h-5 w-5 items-center justify-center rounded text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text-secondary)]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Minus className="h-3 w-3" strokeWidth={2.25} />
            </button>
            {node.kind !== "map" && (
              <button
                type="button"
                aria-label="Remove node"
                className="flex h-5 w-5 items-center justify-center rounded text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text-secondary)]"
                onMouseDown={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
              >
                <X className="h-3 w-3" strokeWidth={2.25} />
              </button>
            )}
          </div>
        </div>

        {node.kind === "terminal" &&
          (node.selected ? (
            <div
              className="flex-1 nodrag"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => { e.stopPropagation(); e.preventDefault() }}
            >
              <TerminalView ptyId={node.id} shell={node.shell} className="h-full" />
            </div>
          ) : (
            <CollapsedTerminal />
          ))}

        {node.kind === "browser" && (
          <div className="min-h-[100px] bg-[color:var(--Eulinx-color-background)]">
            <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-2 py-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
              <AppIcon name="browser" className="h-3 w-3" strokeWidth={2.25} />
              <span className="font-mono text-[11px] text-[color:var(--Eulinx-color-text-secondary)]">
                {node.url}
              </span>
            </div>
            <div className="p-3">
              <div className="flex h-[60px] w-full items-center justify-center rounded bg-[color:var(--Eulinx-color-surface)] text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                Live preview
              </div>
            </div>
          </div>
        )}

        {node.kind === "map" && (
          <div className="flex min-h-[50px] flex-col gap-2 p-3 font-mono text-xs text-[color:var(--Eulinx-color-text-secondary)]">
            <div className="flex h-[50px] w-full items-center justify-center rounded bg-[color:var(--Eulinx-color-background)] text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
              Graph overview
            </div>
            <div className="flex justify-center gap-1">
              <button
                type="button"
                aria-label="Zoom in"
                className="flex h-5 w-5 items-center justify-center rounded-[3px] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] text-xs text-[color:var(--Eulinx-color-text-secondary)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)]"
                onMouseDown={(e) => e.stopPropagation()}
              >
                +
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                className="flex h-5 w-5 items-center justify-center rounded-[3px] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] text-xs text-[color:var(--Eulinx-color-text-secondary)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)]"
                onMouseDown={(e) => e.stopPropagation()}
              >
                -
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Collapsed terminal preview — shows a placeholder since PTY output
 * is rendered by xterm in the expanded view.
 */
function CollapsedTerminal() {
  return (
    <div className="min-h-[120px] flex-1 overflow-hidden bg-[color:var(--Eulinx-color-background)] px-3 py-2 font-mono text-xs leading-relaxed">
      <span className="text-[color:var(--Eulinx-color-text-muted)]">expand to interact</span>
    </div>
  )
}
