import { Globe, Map as MapIcon, Minus, TerminalSquare, X } from "lucide-react"
import { cn } from "@/utils/cn"
import type { CanvasNode, TerminalLine } from "./types"

const ACCENT_COLOR: Record<NonNullable<CanvasNode["accent"]>, string> = {
  accent: "var(--wsx-accent)",
  green: "var(--wsx-green)",
  amber: "var(--wsx-amber)",
  red: "var(--wsx-red)",
  purple: "var(--wsx-purple)",
}

const OUTPUT_COLOR: Record<NonNullable<TerminalLine["outputColor"]>, string> = {
  green: "var(--wsx-green)",
  amber: "var(--wsx-amber)",
  red: "var(--wsx-red)",
  muted: "var(--wsx-text-muted)",
}

function NodeIcon({ kind }: { kind: CanvasNode["kind"] }) {
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
  const accent = ACCENT_COLOR[node.accent ?? "accent"]

  return (
    <div
      data-node-id={node.id}
      onMouseDown={onPointerDown}
      className={cn(
        "group absolute select-none overflow-hidden rounded-[var(--wsx-r-lg)] border bg-[color:var(--wsx-bg-surface)] transition-shadow",
        dragging ? "cursor-grabbing" : "cursor-grab",
        node.selected
          ? "border-[color:var(--wsx-accent)]"
          : "border-[color:var(--wsx-border)] hover:border-[color:var(--wsx-border-strong)]",
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        boxShadow: node.selected
          ? "0 0 0 2px var(--wsx-accent-dim), var(--wsx-shadow-md)"
          : "var(--wsx-shadow-sm)",
      }}
    >
      <div className="flex items-center gap-2 border-b border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-elevated)] px-3 py-2 text-xs font-medium">
        <span className="flex h-4 w-4 items-center justify-center" style={{ color: accent }}>
          <NodeIcon kind={node.kind} />
        </span>
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{node.label}</span>
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded text-[color:var(--wsx-text-muted)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text-sec)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Minus className="h-3 w-3" strokeWidth={1.5} />
          </button>
          {node.kind !== "map" && (
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded text-[color:var(--wsx-text-muted)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text-sec)]"
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

      {node.kind === "terminal" && (
        <div className="min-h-[120px] bg-[color:var(--wsx-bg-app)] px-3 py-2 font-mono text-xs leading-relaxed">
          {node.lines?.map((line, i) => (
            <div key={i} className="flex gap-2">
              {line.prompt && (
                <span style={{ color: "var(--wsx-accent)" }}>{line.prompt}</span>
              )}
              {line.command && <span className="text-[color:var(--wsx-text)]">{line.command}</span>}
              {line.output && (
                <span style={{ color: OUTPUT_COLOR[line.outputColor ?? "muted"] }}>
                  {line.output}
                </span>
              )}
              {line.cursor && <span className="wsx-cursor" />}
            </div>
          ))}
        </div>
      )}

      {node.kind === "browser" && (
        <div className="min-h-[100px] bg-[color:var(--wsx-bg-app)]">
          <div className="flex items-center gap-2 border-b border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)] px-2 py-1 text-[11px] text-[color:var(--wsx-text-muted)]">
            <Globe className="h-3 w-3" strokeWidth={1.5} />
            <span className="font-mono text-[11px] text-[color:var(--wsx-text-sec)]">
              {node.url}
            </span>
          </div>
          <div className="p-3">
            <div className="flex h-[60px] w-full items-center justify-center rounded bg-[color:var(--wsx-bg-surface)] text-[11px] text-[color:var(--wsx-text-muted)]">
              Live preview
            </div>
          </div>
        </div>
      )}

      {node.kind === "map" && (
        <div className="flex min-h-[50px] flex-col gap-2 p-3 font-mono text-xs text-[color:var(--wsx-text-sec)]">
          <div className="flex h-[50px] w-full items-center justify-center rounded bg-[color:var(--wsx-bg-app)] text-[11px] text-[color:var(--wsx-text-muted)]">
            Graph overview
          </div>
          <div className="flex justify-center gap-1">
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded-[3px] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-elevated)] text-xs text-[color:var(--wsx-text-sec)]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              +
            </button>
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded-[3px] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-elevated)] text-xs text-[color:var(--wsx-text-sec)]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              -
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
