import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { TerminalSquare, X } from "lucide-react"
import { CanvasNodeCard } from "./canvas-node"
import { ContextMenu } from "./context-menu"
import { useWorkspace } from "./use-workspace"

interface Point {
  readonly x: number
  readonly y: number
}

interface EdgePath {
  readonly d: string
  readonly active: boolean
}

export function Canvas() {
  const {
    nodes,
    connections,
    selectNode,
    moveNode,
    removeNode,
    openContextMenu,
  } = useWorkspace()

  const canvasRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState<readonly EdgePath[]>([])
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const computeEdges = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cr = canvas.getBoundingClientRect()

    const anchor = (id: string, toId: string): Point | null => {
      const el = canvas.querySelector<HTMLElement>(`[data-node-id="${id}"]`)
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cx = r.left - cr.left + r.width / 2
      const cy = r.top - cr.top + r.height / 2
      const t = canvas.querySelector<HTMLElement>(`[data-node-id="${toId}"]`)
      if (!t) return { x: cx, y: cy }
      const tr = t.getBoundingClientRect()
      const tx = tr.left - cr.left + tr.width / 2
      const ty = tr.top - cr.top + tr.height / 2
      const dx = tx - cx
      const dy = ty - cy
      const hw = r.width / 2
      const hh = r.height / 2
      return Math.abs(dx) / hw > Math.abs(dy) / hh
        ? { x: cx + (dx > 0 ? hw : -hw), y: cy }
        : { x: cx, y: cy + (dy > 0 ? hh : -hh) }
    }

    const next: EdgePath[] = []
    connections.forEach(({ from, to }, i) => {
      const f = anchor(from, to)
      const t = anchor(to, from)
      if (!f || !t) return
      const dx = t.x - f.x
      const c = Math.abs(dx) * 0.4
      next.push({
        d: `M ${f.x} ${f.y} C ${f.x + (dx > 0 ? c : -c)} ${f.y}, ${t.x - (dx > 0 ? c : -c)} ${t.y}, ${t.x} ${t.y}`,
        active: i === 0,
      })
    })
    setEdges(next)
  }, [connections])

  useLayoutEffect(() => {
    computeEdges()
  }, [computeEdges, nodes])

  useEffect(() => {
    window.addEventListener("resize", computeEdges)
    return () => window.removeEventListener("resize", computeEdges)
  }, [computeEdges])

  const onNodePointerDown = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      if (e.button !== 0) return
      const el = e.currentTarget as HTMLElement
      const r = el.getBoundingClientRect()
      dragRef.current = {
        id,
        offsetX: e.clientX - r.left,
        offsetY: e.clientY - r.top,
      }
      setDraggingId(id)
      selectNode(id)
      e.preventDefault()
    },
    [selectNode],
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current
      const canvas = canvasRef.current
      if (!drag || !canvas) return
      const cr = canvas.getBoundingClientRect()
      const x = Math.max(0, e.clientX - cr.left - drag.offsetX)
      const y = Math.max(0, e.clientY - cr.top - drag.offsetY)
      moveNode(drag.id, x, y)
    }
    const onUp = () => {
      dragRef.current = null
      setDraggingId(null)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
  }, [moveNode])

  return (
    <div
      ref={canvasRef}
      className="relative flex-1 overflow-hidden bg-[color:var(--wsx-bg-app)]"
      onContextMenu={(e) => {
        e.preventDefault()
        openContextMenu({ x: e.clientX, y: e.clientY })
      }}
    >
      <div className="wsx-canvas-grid" />

      <div className="wsx-tip absolute left-1/2 top-4 z-[5] flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-[var(--wsx-r-md)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-elevated)] px-3 py-2 text-xs text-[color:var(--wsx-text-sec)] hover:border-[color:var(--wsx-border-strong)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text)]">
        <TerminalSquare className="h-3.5 w-3.5 text-[color:var(--wsx-text-muted)]" strokeWidth={1.5} />
        Terminal 3 — <span className="text-[color:var(--wsx-text-muted)]">minimized</span>
        <X className="h-3 w-3 text-[color:var(--wsx-text-muted)]" strokeWidth={1.5} />
      </div>

      <svg className="wsx-edge-layer">
        <defs>
          <marker id="wsx-ah" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--wsx-border-strong)" />
          </marker>
        </defs>
        {edges.map((edge, i) => (
          <path
            key={i}
            d={edge.d}
            className={edge.active ? "active" : undefined}
            markerEnd="url(#wsx-ah)"
          />
        ))}
      </svg>

      {nodes.map((node) => (
        <CanvasNodeCard
          key={node.id}
          node={node}
          dragging={draggingId === node.id}
          onPointerDown={onNodePointerDown(node.id)}
          onRemove={() => removeNode(node.id)}
        />
      ))}

      <Minimap />
      <ContextMenu />
    </div>
  )
}

function Minimap() {
  const items = [
    { left: 30, top: 30, width: 50, height: 20 },
    { left: 90, top: 25, width: 40, height: 18 },
    { left: 145, top: 25, width: 35, height: 18 },
    { left: 95, top: 60, width: 45, height: 18 },
    { left: 30, top: 65, width: 40, height: 18 },
  ]
  return (
    <div className="absolute bottom-4 right-4 z-[5] h-[120px] w-[180px] overflow-hidden rounded-[var(--wsx-r-md)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-panel)] shadow-[var(--wsx-shadow-md)]">
      <div className="relative h-full w-full">
        {items.map((item, i) => (
          <div
            key={i}
            className="absolute rounded-[2px] opacity-70"
            style={{
              left: item.left,
              top: item.top,
              width: item.width,
              height: item.height,
              background: "var(--wsx-accent-dim)",
            }}
          />
        ))}
        <div
          className="absolute rounded-[2px]"
          style={{
            left: 10,
            top: 15,
            width: 80,
            height: 50,
            border: "1px solid var(--wsx-accent)",
            background: "rgba(110,156,255,.06)",
          }}
        />
      </div>
      <div className="absolute bottom-2 right-2 flex gap-0.5">
        <button
          type="button"
          className="flex h-5 w-5 items-center justify-center rounded border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-elevated)] text-xs text-[color:var(--wsx-text-sec)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text)]"
        >
          +
        </button>
        <button
          type="button"
          className="flex h-5 w-5 items-center justify-center rounded border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-elevated)] text-xs text-[color:var(--wsx-text-sec)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text)]"
        >
          -
        </button>
      </div>
    </div>
  )
}
