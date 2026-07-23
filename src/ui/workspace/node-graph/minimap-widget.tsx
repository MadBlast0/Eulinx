import { useCallback, useEffect, useRef, useState } from "react"
import { useReactFlow, useStoreApi, type Node } from "@xyflow/react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { getNodeTypeMeta } from "./node-types"
import type { CustomNodeData } from "./custom-node"

// ---------------------------------------------------------------------------
// Custom minimap widget — live-updating floating navigation.
// Reads directly from ReactFlow's Zustand store via useStoreApi.
// Uses requestAnimationFrame for smooth, lag-free rendering.
// ---------------------------------------------------------------------------

const MINIMAP_W = 220
const MINIMAP_H = 140
const MINIMAP_PAD = 10

// ── CSS variable resolution (cached) ──

function resolveCSS(varName: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName)
  return (v || "").trim() || "#888"
}

let _colorCache: Record<string, string> | null = null

function css(varName: string): string {
  if (!_colorCache) _colorCache = {}
  if (!(varName in _colorCache)) {
    _colorCache[varName] = resolveCSS(varName)
  }
  const v = _colorCache[varName]
  return v ?? "#888"
}

const NODE_COLOR_MAP: Record<string, string> = {}

function nodeColor(node: Node): string {
  const data = node.data as Partial<CustomNodeData>
  const kind = data?.kind
  if (!kind) return css("--Eulinx-color-node-graph-edge")
  if (!(kind in NODE_COLOR_MAP)) {
    const varName = getNodeTypeMeta(kind).accentVar
    const match = varName.match(/var\(--(.+?)\)/)
    NODE_COLOR_MAP[kind] = match ? css(`--${match[1]}`) : "#888"
  }
  return NODE_COLOR_MAP[kind] || "#888"
}

// ── Graph bounds ──

interface GraphBounds {
  minX: number; minY: number
  scale: number; ox: number; oy: number
}

function computeBounds(nodes: readonly Node[]): GraphBounds | null {
  if (nodes.length === 0) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const node of nodes) {
    const w = node.measured?.width ?? 200
    const h = node.measured?.height ?? 80
    if (node.position.x < minX) minX = node.position.x
    if (node.position.y < minY) minY = node.position.y
    if (node.position.x + w > maxX) maxX = node.position.x + w
    if (node.position.y + h > maxY) maxY = node.position.y + h
  }
  const gw = maxX - minX || 200
  const gh = maxY - minY || 150
  const pad = MINIMAP_PAD
  const scale = Math.min((MINIMAP_W - pad * 2) / gw, (MINIMAP_H - pad * 2) / gh, 1)
  const ox = pad + ((MINIMAP_W - pad * 2) - gw * scale) / 2
  const oy = pad + ((MINIMAP_H - pad * 2) - gh * scale) / 2
  return { minX, minY, scale, ox, oy }
}

// ---------------------------------------------------------------------------
// Canvas — live rendering via store polling + rAF
// ---------------------------------------------------------------------------

function MiniMapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { getViewport, setViewport } = useReactFlow()
  const storeApi = useStoreApi()
  const rafRef = useRef(0)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1

    const draw = () => {
      canvas.width = MINIMAP_W * dpr
      canvas.height = MINIMAP_H * dpr
      canvas.style.width = `${MINIMAP_W}px`
      canvas.style.height = `${MINIMAP_H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Background
      ctx.fillStyle = css("--Eulinx-color-surface")
      ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H)

      // Read live state from store
      const state = storeApi.getState()
      const nodes = state.nodes
      const vp = getViewport()

      const bounds = computeBounds(nodes)

      if (!bounds) {
        ctx.fillStyle = css("--Eulinx-color-text-muted")
        ctx.globalAlpha = 0.4
        ctx.font = "10px system-ui, sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText("No nodes", MINIMAP_W / 2, MINIMAP_H / 2)
        ctx.globalAlpha = 1
        return
      }

      const { minX, minY, scale, ox, oy } = bounds

      // Draw nodes
      for (const node of nodes) {
        const w = node.measured?.width ?? 200
        const h = node.measured?.height ?? 80
        const nx = ox + (node.position.x - minX) * scale
        const ny = oy + (node.position.y - minY) * scale
        const nw = Math.max(w * scale, 3)
        const nh = Math.max(h * scale, 2)
        ctx.globalAlpha = 0.55
        ctx.fillStyle = nodeColor(node)
        ctx.beginPath()
        ctx.roundRect(nx, ny, nw, nh, Math.min(3, nw / 2, nh / 2))
        ctx.fill()
      }

      ctx.globalAlpha = 1

      // Viewport rectangle — use ReactFlow container dimensions
      const zoom = vp.zoom
      const vpWorldX = -vp.x / zoom
      const vpWorldY = -vp.y / zoom
      const rfEl = document.querySelector(".react-flow")
      const containerW = rfEl?.clientWidth ?? window.innerWidth
      const containerH = rfEl?.clientHeight ?? window.innerHeight
      const vpWorldW = containerW / zoom
      const vpWorldH = containerH / zoom
      const vrx = ox + (vpWorldX - minX) * scale
      const vry = oy + (vpWorldY - minY) * scale
      const vrw = vpWorldW * scale
      const vrh = vpWorldH * scale

      ctx.fillStyle = css("--Eulinx-color-accent")
      ctx.globalAlpha = 0.06
      ctx.beginPath()
      ctx.roundRect(vrx, vry, vrw, vrh, 2)
      ctx.fill()

      ctx.globalAlpha = 0.7
      ctx.strokeStyle = css("--Eulinx-color-accent")
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(vrx, vry, vrw, vrh, 2)
      ctx.stroke()

      ctx.globalAlpha = 1
    }

    // rAF loop — polls store every frame
    let running = true
    const loop = () => {
      if (!running) return
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }

    const onInput = () => draw()
    window.addEventListener("pointermove", onInput, { passive: true })
    window.addEventListener("wheel", onInput, { passive: true })
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("pointermove", onInput)
      window.removeEventListener("wheel", onInput)
    }
  }, [storeApi, getViewport])

  // Click to navigate
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top

      const state = storeApi.getState()
      const bounds = computeBounds(state.nodes)
      if (!bounds) return

      dragging.current = true
      lastPos.current = { x: px, y: py }
      canvas.setPointerCapture(e.pointerId)

      const worldX = bounds.minX + (px - bounds.ox) / bounds.scale
      const worldY = bounds.minY + (py - bounds.oy) / bounds.scale
      const vp = getViewport()
      setViewport(
        {
          x: -worldX * vp.zoom + window.innerWidth / 2,
          y: -worldY * vp.zoom + window.innerHeight / 2,
          zoom: vp.zoom,
        },
        { duration: 150 },
      )
    },
    [storeApi, getViewport, setViewport],
  )

  // Drag to pan
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!dragging.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const dx = px - lastPos.current.x
      const dy = py - lastPos.current.y
      lastPos.current = { x: px, y: py }
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return

      const state = storeApi.getState()
      const bounds = computeBounds(state.nodes)
      if (!bounds) return

      const vp = getViewport()
      setViewport({
        x: vp.x + (-dx / bounds.scale) * vp.zoom,
        y: vp.y + (-dy / bounds.scale) * vp.zoom,
        zoom: vp.zoom,
      })
    },
    [storeApi, getViewport, setViewport],
  )

  const handlePointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="cursor-pointer rounded-lg"
      style={{ width: MINIMAP_W, height: MINIMAP_H }}
    />
  )
}

// ---------------------------------------------------------------------------
// Minimap widget
// ---------------------------------------------------------------------------

export function MinimapWidget() {
  const [collapsed, setCollapsed] = useState(false)
  const { fitView } = useReactFlow()

  if (collapsed) {
    return (
      <div className="absolute bottom-3 right-3 z-20">
        <button
          type="button"
          aria-label="Expand minimap"
          onClick={() => setCollapsed(false)}
          className="flex h-7 items-center gap-1 rounded-lg border border-[color:var(--Eulinx-color-border)]/60 bg-[color:var(--Eulinx-color-surface)]/90 px-2 text-[11px] text-[color:var(--Eulinx-color-text-muted)] shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-[color:var(--Eulinx-color-border)] hover:bg-[color:var(--Eulinx-color-surface)] hover:text-[color:var(--Eulinx-color-text-secondary)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
          </svg>
          <span>Canvas</span>
          <ChevronRight className="h-2.5 w-2.5" strokeWidth={2.5} />
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-3 right-3 z-20 flex flex-col overflow-hidden rounded-[14px] border border-[color:var(--Eulinx-color-border)]/50 bg-[color:var(--Eulinx-color-surface)]/90 shadow-lg backdrop-blur-sm transition-all duration-200">
      <div className="px-1.5 pt-1.5">
        <MiniMapCanvas />
      </div>
      <div className="flex items-center px-1 pb-1 pt-0.5">
        <button
          type="button"
          aria-label="Fit entire graph"
          onClick={() => fitView({ duration: 300 })}
          className="flex items-center justify-start gap-1 rounded-md py-1 px-1.5 text-[10px] text-[color:var(--Eulinx-color-text-muted)]/70 transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)]/50 hover:text-[color:var(--Eulinx-color-text-muted)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5" aria-hidden="true">
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
          <span>Fit</span>
        </button>

        <div className="flex-1" />

        <div className="h-3.5 w-px bg-[color:var(--Eulinx-color-border)]/40" />

        <button
          type="button"
          aria-label="Collapse minimap"
          onClick={() => setCollapsed(true)}
          className="flex items-center justify-center rounded-md p-1 text-[color:var(--Eulinx-color-text-muted)]/50 transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)]/50 hover:text-[color:var(--Eulinx-color-text-muted)]"
        >
          <ChevronDown className="h-2.5 w-2.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
