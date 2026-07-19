// @Eulinx-exception:nodegraph-canvas
import { Globe, Map as MapIcon, Minus, TerminalSquare, X } from "lucide-react"
import { cn } from "@/utils/cn"
import type { CanvasNode, NodeKind, TerminalLine } from "./types"
import { Dot } from "./primitives"
import { TerminalView } from "./terminal"
import { useTerminal } from "./terminal/use-terminal"

const NODE_TOKEN: Record<NodeKind, string> = {
  terminal: "var(--Eulinx-color-node-terminal)",
  browser: "var(--Eulinx-color-node-browser)",
  map: "var(--Eulinx-color-node-map)",
}

const OUTPUT_COLOR: Record<NonNullable<TerminalLine["outputColor"]>, string> = {
  green: "var(--Eulinx-color-success)",
  amber: "var(--Eulinx-color-warning)",
  red: "var(--Eulinx-color-error)",
  muted: "var(--Eulinx-color-text-muted)",
}

function NodeIcon({ kind }: { kind: NodeKind }) {
  const cls = "h-3.5 w-3.5"
  if (kind === "terminal") return <TerminalSquare className={cls} strokeWidth={1.5} />
  if (kind === "browser") return <Globe className={cls} strokeWidth={1.5} />
  return <MapIcon className={cls} strokeWidth={1.5} />
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
              <Minus className="h-3 w-3" strokeWidth={1.5} />
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
                <X className="h-3 w-3" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {node.kind === "terminal" &&
          (node.selected ? (
            <div className="min-h-[120px] flex-1 p-2">
              <TerminalView ptyId={node.id} shell={node.shell} className="h-full" />
            </div>
          ) : (
            <CollapsedTerminal ptyId={node.id} shell={node.shell} />
          ))}

        {node.kind === "browser" && (
          <div className="min-h-[100px] bg-[color:var(--Eulinx-color-background)]">
            <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-2 py-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
              <Globe className="h-3 w-3" strokeWidth={1.5} />
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
 * Collapsed terminal preview: shows the live tail of the PTY output so a node
 * stays useful while collapsed. Reads the same PTY as the expanded view.
 */
function CollapsedTerminal({ ptyId, shell }: { ptyId: string; shell?: string }) {
  const { lines } = useTerminal(ptyId, shell)
  const tail = lines.slice(-6)
  return (
    <div className="min-h-[120px] flex-1 overflow-hidden bg-[color:var(--Eulinx-color-background)] px-3 py-2 font-mono text-xs leading-relaxed">
      {tail.length === 0 ? (
        <span className="text-[color:var(--Eulinx-color-text-muted)]">starting shell…</span>
      ) : (
        tail.map((line) => (
          <div key={line.id} className="truncate">
            <span style={{ color: OUTPUT_COLOR[line.kind === "error" ? "red" : line.kind === "success" ? "green" : "muted"] }}>
              {line.text}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
