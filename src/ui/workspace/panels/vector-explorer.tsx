import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import {
  Search,
  Lasso,
  MousePointer2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  X,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToolbarButton, ToolbarSep, StateBadge } from "../primitives"
import { type Tone } from "../state"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VectorPoint {
  readonly id: string
  readonly content: string
  readonly kind: VectorMemoryKind
  readonly sessionId?: string
  readonly sensitivity: SensitivityLevel
  readonly createdAt: string
  readonly embedding: readonly number[]
  x: number
  y: number
}

type VectorMemoryKind = "stm" | "ltm" | "episodic" | "semantic" | "working"

type SensitivityLevel = "public" | "internal" | "confidential" | "secret"

type InteractionMode = "pan" | "lasso"

interface FilterState {
  readonly kinds: ReadonlySet<VectorMemoryKind>
  readonly sensitivity: ReadonlySet<SensitivityLevel>
  readonly sessionId: string
  readonly dateFrom: string
  readonly dateTo: string
}

interface ViewTransform {
  offsetX: number
  offsetY: number
  scale: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KIND_COLORS: Record<VectorMemoryKind, string> = {
  stm: "#3b82f6",
  ltm: "#22c55e",
  episodic: "#f59e0b",
  semantic: "#a855f7",
  working: "#ec4899",
}

const KIND_LABELS: Record<VectorMemoryKind, string> = {
  stm: "STM",
  ltm: "LTM",
  episodic: "Episodic",
  semantic: "Semantic",
  working: "Working",
}

const SENSITIVITY_COLORS: Record<SensitivityLevel, string> = {
  public: "#22c55e",
  internal: "#3b82f6",
  confidential: "#f59e0b",
  secret: "#ef4444",
}

const KIND_TONE: Record<VectorMemoryKind, Tone> = {
  stm: "info",
  ltm: "success",
  episodic: "warning",
  semantic: "accent",
  working: "error",
}

const ALL_KINDS: readonly VectorMemoryKind[] = ["stm", "ltm", "episodic", "semantic", "working"]
const ALL_SENSITIVITIES: readonly SensitivityLevel[] = ["public", "internal", "confidential", "secret"]
const SENSITIVITIES_ARRAY: SensitivityLevel[] = [...ALL_SENSITIVITIES]
const KINDS_ARRAY: VectorMemoryKind[] = [...ALL_KINDS]

const MAX_POINTS = 5000
const POINT_RADIUS = 4
const POINT_RADIUS_HOVER = 6
const HIGHLIGHT_GLOW_RADIUS = 14
const DEFAULT_SCALE = 1
const MIN_SCALE = 0.1
const MAX_SCALE = 20
const ZOOM_FACTOR = 1.1

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickRandom<T>(arr: readonly T[]): T {
  const idx = Math.floor(Math.random() * arr.length)
  const item = arr[idx]
  if (item === undefined) return arr[0] as T
  return item
}

// ---------------------------------------------------------------------------
// Demo data generator (used when HelixDB is unavailable)
// ---------------------------------------------------------------------------

function generateDemoPoints(count: number): VectorPoint[] {
  const points: VectorPoint[] = []

  for (let i = 0; i < count; i++) {
    const kind = pickRandom(KINDS_ARRAY)
    const embedding = generateRandomEmbedding(256)
    points.push({
      id: `demo_${i}`,
      content: generateDemoContent(kind, i),
      kind,
      sessionId: Math.random() > 0.5 ? `sess_${Math.floor(Math.random() * 5)}` : undefined,
      sensitivity: pickRandom(SENSITIVITIES_ARRAY),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      embedding,
      x: 0,
      y: 0,
    })
  }
  return points
}

function generateRandomEmbedding(dim: number): number[] {
  const vec: number[] = new Array<number>(dim).fill(0)
  for (let i = 0; i < dim; i++) {
    vec[i] = Math.random() * 2 - 1
  }
  let norm = 0
  for (let i = 0; i < dim; i++) {
    const v = vec[i]
    if (v !== undefined) norm += v * v
  }
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < dim; i++) {
    const v = vec[i]
    if (v !== undefined) vec[i] = v / norm
  }
  return vec
}

function generateDemoContent(kind: VectorMemoryKind, index: number): string {
  const prefixes: Record<VectorMemoryKind, string[]> = {
    stm: ["Session context for", "Working on", "Current task:", "In progress:"],
    ltm: ["Architecture decision:", "User preference:", "Known pattern:", "Fact:"],
    episodic: ["Event:", "Action taken:", "Workflow step:", "Observed:"],
    semantic: ["Definition of", "Relationship between", "Rule:", "Procedure for"],
    working: ["Active slot:", "Priority context:", "Worker state:", "Buffer:"],
  }
  const suffixes = [
    "authentication flow",
    "database schema design",
    "API endpoint configuration",
    "deployment pipeline",
    "error handling strategy",
    "caching mechanism",
    "user interface layout",
    "testing framework",
    "monitoring setup",
    "documentation structure",
    "performance optimization",
    "security audit",
    "code review process",
    "CI/CD integration",
    "dependency management",
  ]
  const items = prefixes[kind] ?? []
  const prefix = pickRandom(items.length > 0 ? items : ["Memory"])
  const suffix = pickRandom(suffixes)
  return `${prefix} ${suffix} (${index})`
}

// ---------------------------------------------------------------------------
// PCA Projection (client-side, no external dependencies)
// ---------------------------------------------------------------------------

function pcaProject(
  embeddings: readonly (readonly number[])[],
  nComponents: number = 2,
): number[][] {
  const n = embeddings.length
  if (n === 0) return []
  const first = embeddings[0]
  if (first === undefined) return []
  const dim = first.length
  if (n === 1) return [[0, 0]]

  // Center the data
  const meanArr: number[] = new Array<number>(dim).fill(0)
  for (const vec of embeddings) {
    for (let d = 0; d < dim; d++) {
      const val = vec[d]
      const curr = meanArr[d]
      if (val !== undefined && curr !== undefined) meanArr[d] = curr + val
    }
  }
  for (let d = 0; d < dim; d++) {
    const m = meanArr[d]
    if (m !== undefined) meanArr[d] = m / n
  }

  const centered: number[][] = embeddings.map((vec) =>
    vec.map((v, d) => v - (meanArr[d] ?? 0)),
  )

  // Use Gram matrix approach when n < dim (common for embeddings)
  if (n <= dim) {
    // Compute G = centered @ centered^T  (n x n)
    const gram = centered.map((_row, i) =>
      centered.map((_inner, j) => {
        let sum = 0
        for (let d = 0; d < dim; d++) {
          const a = centered[i]?.[d]
          const b = centered[j]?.[d]
          if (a !== undefined && b !== undefined) sum += a * b
        }
        return sum / (n - 1)
      }),
    )

    // Find top eigenvectors of gram matrix
    const eigenvectors = powerIterationMultiple(gram, nComponents)

    // Project: result_i = centered_i @ (centered^T @ v_k) / sqrt(eigenvalue_k)
    const result: number[][] = Array.from({ length: n }, () => [] as number[])
    for (const { vector, eigenvalue } of eigenvectors) {
      const scale = eigenvalue > 1e-10 ? 1 / Math.sqrt(eigenvalue) : 1
      for (let rowIdx = 0; rowIdx < n; rowIdx++) {
        const row = centered[rowIdx]
        if (row === undefined) continue
        let sum = 0
        for (let d = 0; d < dim; d++) {
          const rv = row[d]
          const vv = vector[d]
          if (rv !== undefined && vv !== undefined) sum += rv * vv
        }
        const target = result[rowIdx]
        if (target !== undefined) target.push(sum * scale)
      }
    }
    return result
  }

  // Standard approach: compute covariance X^T X
  const cov = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => {
      let sum = 0
      for (let k = 0; k < n; k++) {
        const a = centered[k]?.[i]
        const b = centered[k]?.[j]
        if (a !== undefined && b !== undefined) sum += a * b
      }
      return sum / (n - 1)
    }),
  )

  const eigenvectors = powerIterationMultiple(cov, nComponents)

  // Project centered data onto eigenvectors
  const result: number[][] = Array.from({ length: n }, () => [] as number[])
  for (const { vector } of eigenvectors) {
    for (let rowIdx = 0; rowIdx < n; rowIdx++) {
      const row = centered[rowIdx]
      if (row === undefined) continue
      let sum = 0
      for (let d = 0; d < dim; d++) {
        const rv = row[d]
        const vv = vector[d]
        if (rv !== undefined && vv !== undefined) sum += rv * vv
      }
      const target = result[rowIdx]
      if (target !== undefined) target.push(sum)
    }
  }
  return result
}

function powerIterationMultiple(
  matrix: number[][],
  k: number,
  maxIter: number = 100,
): { vector: number[]; eigenvalue: number }[] {
  const n = matrix.length
  const results: { vector: number[]; eigenvalue: number }[] = []

  // Working copy that gets deflated
  let A = matrix.map((row) => [...row])

  for (let comp = 0; comp < k; comp++) {
    // Random initial vector
    let v = Array.from({ length: n }, () => Math.random() * 2 - 1)
    const vNorm = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
    v = v.map((x) => x / vNorm)

    let eigenvalue = 0

    for (let iter = 0; iter < maxIter; iter++) {
      // w = A @ v
      const w = A.map((row) => {
        let sum = 0
        for (let j = 0; j < n; j++) {
          const rj = row[j]
          const vj = v[j]
          if (rj !== undefined && vj !== undefined) sum += rj * vj
        }
        return sum
      })

      // Normalize
      const wNorm = Math.sqrt(w.reduce((s, x) => s + x * x, 0))
      if (wNorm < 1e-12) break
      v = w.map((x) => x / wNorm)

      // Rayleigh quotient
      const Av = A.map((row) => {
        let sum = 0
        for (let j = 0; j < n; j++) {
          const rj = row[j]
          const vj = v[j]
          if (rj !== undefined && vj !== undefined) sum += rj * vj
        }
        return sum
      })
      eigenvalue = v.reduce((s, x, i) => {
        const av = Av[i]
        return av !== undefined ? s + x * av : s
      }, 0)
    }

    results.push({ vector: [...v], eigenvalue })

    // Deflate: A = A - eigenvalue * v * v^T
    const nextA: number[][] = []
    for (let i = 0; i < n; i++) {
      const row = A[i]
      const vi = v[i]
      if (row === undefined || vi === undefined) {
        nextA.push([...(row ?? [])])
        continue
      }
      const newRow = [...row]
      for (let j = 0; j < n; j++) {
        const cell = newRow[j]
        const vj = v[j]
        if (cell !== undefined && vj !== undefined) {
          newRow[j] = cell - eigenvalue * vi * vj
        }
      }
      nextA.push(newRow)
    }
    A = nextA
  }

  return results
}

// ---------------------------------------------------------------------------
// Cosine Similarity
// ---------------------------------------------------------------------------

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const av = a[i]
    const bv = b[i]
    if (av !== undefined && bv !== undefined) {
      dot += av * bv
      normA += av * av
      normB += bv * bv
    }
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom > 0 ? dot / denom : 0
}

function findNearestNeighbors(
  points: readonly VectorPoint[],
  queryEmbedding: readonly number[],
  k: number,
): string[] {
  const scored = points.map((p) => ({
    id: p.id,
    score: cosineSimilarity(p.embedding, queryEmbedding),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, k).map((s) => s.id)
}

// ---------------------------------------------------------------------------
// Simple text search (match content, then find neighbors by embedding)
// ---------------------------------------------------------------------------

function textSearch(points: readonly VectorPoint[], query: string): Set<string> {
  const q = query.toLowerCase().trim()
  if (!q) return new Set()

  const matches = points.filter((p) =>
    p.content.toLowerCase().includes(q),
  )

  if (matches.length === 0) return new Set()

  // Collect neighbors of text matches
  const result = new Set<string>()
  for (const m of matches) {
    result.add(m.id)
    const neighbors = findNearestNeighbors(points, m.embedding, 5)
    for (const nid of neighbors) result.add(nid)
  }
  return result
}

// ---------------------------------------------------------------------------
// Canvas Renderer
// ---------------------------------------------------------------------------

class CanvasScatterRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private points: VectorPoint[] = []
  private projectedPoints: { x: number; y: number }[] = []
  private transform: ViewTransform = { offsetX: 0, offsetY: 0, scale: DEFAULT_SCALE }
  private highlightedIds: ReadonlySet<string> = new Set()
  private selectedId: string | null = null
  private lassoPath: { x: number; y: number }[] = []
  private isLassoDrawing = false
  private hoveredIndex: number | null = null
  private isPanning = false
  private lastPanX = 0
  private lastPanY = 0
  private dpr = 1
  private animationFrame: number | null = null

  // Callbacks
  onPointClick: ((point: VectorPoint | null) => void) | null = null
  onHoverPoint: ((point: VectorPoint | null) => void) | null = null
  onLassoComplete: ((ids: string[]) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D context not supported")
    this.ctx = ctx
    this.dpr = window.devicePixelRatio || 1
    this.setupEventListeners()
  }

  destroy(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame)
    }
    this.removeEventListeners()
  }

  setPoints(points: VectorPoint[]): void {
    this.points = points
    this.projectedPoints = points.map((p) => ({ x: p.x, y: p.y }))
    this.centerView()
    this.scheduleRender()
  }

  setHighlight(ids: ReadonlySet<string>): void {
    this.highlightedIds = ids
    this.scheduleRender()
  }

  setSelected(id: string | null): void {
    this.selectedId = id
    this.scheduleRender()
  }

  resetView(): void {
    this.centerView()
    this.scheduleRender()
  }

  zoomIn(): void {
    const cx = this.canvas.width / (2 * this.dpr)
    const cy = this.canvas.height / (2 * this.dpr)
    this.zoomAt(cx, cy, ZOOM_FACTOR)
  }

  zoomOut(): void {
    const cx = this.canvas.width / (2 * this.dpr)
    const cy = this.canvas.height / (2 * this.dpr)
    this.zoomAt(cx, cy, 1 / ZOOM_FACTOR)
  }

  private centerView(): void {
    if (this.projectedPoints.length === 0) {
      this.transform = { offsetX: 0, offsetY: 0, scale: DEFAULT_SCALE }
      return
    }

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (const p of this.projectedPoints) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }

    const dataWidth = maxX - minX || 1
    const dataHeight = maxY - minY || 1
    const canvasW = this.canvas.width / this.dpr
    const canvasH = this.canvas.height / this.dpr
    const padding = 60

    const scaleX = (canvasW - 2 * padding) / dataWidth
    const scaleY = (canvasH - 2 * padding) / dataHeight
    const scale = Math.min(scaleX, scaleY, 8)

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    this.transform = {
      scale,
      offsetX: canvasW / 2 - centerX * scale,
      offsetY: canvasH / 2 - centerY * scale,
    }
  }

  private zoomAt(cx: number, cy: number, factor: number): void {
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.transform.scale * factor))
    const ratio = newScale / this.transform.scale
    this.transform.offsetX = cx - (cx - this.transform.offsetX) * ratio
    this.transform.offsetY = cy - (cy - this.transform.offsetY) * ratio
    this.transform.scale = newScale
    this.scheduleRender()
  }

  // ---- Coordinate transforms ----

  private dataToCanvas(x: number, y: number): { cx: number; cy: number } {
    return {
      cx: x * this.transform.scale + this.transform.offsetX,
      cy: y * this.transform.scale + this.transform.offsetY,
    }
  }

  private canvasToData(cx: number, cy: number): { x: number; y: number } {
    return {
      x: (cx - this.transform.offsetX) / this.transform.scale,
      y: (cy - this.transform.offsetY) / this.transform.scale,
    }
  }

  // ---- Hit testing ----

  private findPointAt(cx: number, cy: number): number | null {
    const hitRadius = POINT_RADIUS_HOVER + 2
    for (let i = this.projectedPoints.length - 1; i >= 0; i--) {
      const p = this.projectedPoints[i]
      if (p === undefined) continue
      const { cx: pcx, cy: pcy } = this.dataToCanvas(p.x, p.y)
      const dx = cx - pcx
      const dy = cy - pcy
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return i
      }
    }
    return null
  }

  // ---- Rendering ----

  private scheduleRender(): void {
    if (this.animationFrame !== null) return
    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrame = null
      this.render()
    })
  }

  private render(): void {
    const { ctx, canvas, dpr } = this
    const w = canvas.width / dpr
    const h = canvas.height / dpr

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // Background
    ctx.fillStyle = "var(--Eulinx-color-background, #0a0a0a)"
    ctx.fillRect(0, 0, w, h)

    // Grid lines
    this.drawGrid(w, h)

    // Lasso path
    if (this.lassoPath.length > 0) {
      this.drawLasso()
    }

    // Points
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      const proj = this.projectedPoints[i]
      if (point === undefined || proj === undefined) continue
      const { cx, cy } = this.dataToCanvas(proj.x, proj.y)

      if (cx < -20 || cx > w + 20 || cy < -20 || cy > h + 20) continue

      const isHighlighted = this.highlightedIds.has(point.id)
      const isSelected = this.selectedId === point.id
      const isHovered = this.hoveredIndex === i

      let radius = POINT_RADIUS
      if (isHovered) radius = POINT_RADIUS_HOVER
      if (isSelected) radius = POINT_RADIUS_HOVER + 2

      // Glow for highlighted points
      if (isHighlighted && !isHovered) {
        ctx.save()
        ctx.shadowColor = KIND_COLORS[point.kind]
        ctx.shadowBlur = HIGHLIGHT_GLOW_RADIUS
        ctx.beginPath()
        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2)
        ctx.fillStyle = KIND_COLORS[point.kind]
        ctx.globalAlpha = 0.3
        ctx.fill()
        ctx.restore()
      }

      // Main point
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = KIND_COLORS[point.kind]
      ctx.globalAlpha = isHighlighted || isSelected || this.highlightedIds.size === 0 ? 0.9 : 0.25
      ctx.fill()
      ctx.globalAlpha = 1

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    // Cursor indicator for hovered point
    if (this.hoveredIndex !== null) {
      const proj = this.projectedPoints[this.hoveredIndex]
      const point = this.points[this.hoveredIndex]
      if (proj !== undefined && point !== undefined) {
        const { cx, cy } = this.dataToCanvas(proj.x, proj.y)
        ctx.strokeStyle = KIND_COLORS[point.kind]
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, POINT_RADIUS_HOVER + 4, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  private drawGrid(w: number, h: number): void {
    const { ctx } = this
    ctx.strokeStyle = "rgba(255,255,255,0.04)"
    ctx.lineWidth = 1

    // Determine grid spacing based on scale
    const minGridPx = 60
    const rawStep = minGridPx / this.transform.scale
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const residual = rawStep / magnitude
    let step: number
    if (residual <= 1.5) step = magnitude
    else if (residual <= 3.5) step = 2 * magnitude
    else if (residual <= 7.5) step = 5 * magnitude
    else step = 10 * magnitude

    const topLeft = this.canvasToData(0, 0)
    const bottomRight = this.canvasToData(w, h)

    const startX = Math.floor(topLeft.x / step) * step
    const endX = Math.ceil(bottomRight.x / step) * step
    const startY = Math.floor(topLeft.y / step) * step
    const endY = Math.ceil(bottomRight.y / step) * step

    for (let x = startX; x <= endX; x += step) {
      const { cx } = this.dataToCanvas(x, 0)
      ctx.beginPath()
      ctx.moveTo(cx, 0)
      ctx.lineTo(cx, h)
      ctx.stroke()
    }

    for (let y = startY; y <= endY; y += step) {
      const { cy } = this.dataToCanvas(0, y)
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(w, cy)
      ctx.stroke()
    }
  }

  private drawLasso(): void {
    const { ctx } = this
    if (this.lassoPath.length < 2) return

    ctx.save()
    ctx.strokeStyle = "rgba(99, 102, 241, 0.8)"
    ctx.fillStyle = "rgba(99, 102, 241, 0.08)"
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])

    ctx.beginPath()
    const first = this.lassoPath[0]
    if (first !== undefined) {
      ctx.moveTo(first.x, first.y)
    }
    for (let i = 1; i < this.lassoPath.length; i++) {
      const p = this.lassoPath[i]
      if (p !== undefined) ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.restore()
  }

  private getLassoIds(): string[] {
    if (this.lassoPath.length < 3) return []

    const ids: string[] = []
    for (let i = 0; i < this.points.length; i++) {
      const proj = this.projectedPoints[i]
      const point = this.points[i]
      if (proj === undefined || point === undefined) continue
      const { cx, cy } = this.dataToCanvas(proj.x, proj.y)
      if (this.pointInPolygon(cx, cy, this.lassoPath)) {
        ids.push(point.id)
      }
    }
    return ids
  }

  private pointInPolygon(
    x: number,
    y: number,
    polygon: { x: number; y: number }[],
  ): boolean {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const pi = polygon[i]
      const pj = polygon[j]
      if (pi === undefined || pj === undefined) continue
      const { x: xi, y: yi } = pi
      const { x: xj, y: yj } = pj
      if (
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
      ) {
        inside = !inside
      }
    }
    return inside
  }

  // ---- Event handling ----

  private pointerDownHandler: ((e: PointerEvent) => void) | null = null
  private pointerMoveHandler: ((e: PointerEvent) => void) | null = null
  private pointerUpHandler: ((e: PointerEvent) => void) | null = null
  private wheelHandler: ((e: WheelEvent) => void) | null = null

  private setupEventListeners(): void {
    this.pointerDownHandler = this.onPointerDown.bind(this)
    this.pointerMoveHandler = this.onPointerMove.bind(this)
    this.pointerUpHandler = this.onPointerUp.bind(this)
    this.wheelHandler = this.onWheel.bind(this)

    this.canvas.addEventListener("pointerdown", this.pointerDownHandler)
    window.addEventListener("pointermove", this.pointerMoveHandler)
    window.addEventListener("pointerup", this.pointerUpHandler)
    this.canvas.addEventListener("wheel", this.wheelHandler, { passive: false })
  }

  private removeEventListeners(): void {
    if (this.pointerDownHandler) {
      this.canvas.removeEventListener("pointerdown", this.pointerDownHandler)
    }
    if (this.pointerMoveHandler) {
      window.removeEventListener("pointermove", this.pointerMoveHandler)
    }
    if (this.pointerUpHandler) {
      window.removeEventListener("pointerup", this.pointerUpHandler)
    }
    if (this.wheelHandler) {
      this.canvas.removeEventListener("wheel", this.wheelHandler)
    }
  }

  private onPointerDown(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      this.isPanning = true
      this.lastPanX = e.clientX
      this.lastPanY = e.clientY
      this.canvas.style.cursor = "grabbing"
      return
    }

    if (e.button === 0) {
      const hitIdx = this.findPointAt(cx, cy)
      if (hitIdx !== null) {
        const hitPoint = this.points[hitIdx]
        if (hitPoint !== undefined) {
          this.selectedId = hitPoint.id
          this.onPointClick?.(hitPoint)
        }
        this.scheduleRender()
        return
      }

      if ((this.canvas as unknown as Record<string, unknown>).__lassoMode) {
        this.isLassoDrawing = true
        this.lassoPath = [{ x: cx, y: cy }]
        this.canvas.style.cursor = "crosshair"
        return
      }

      this.isPanning = true
      this.lastPanX = e.clientX
      this.lastPanY = e.clientY
      this.canvas.style.cursor = "grabbing"
    }
  }

  private onPointerMove(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    if (this.isPanning) {
      const dx = e.clientX - this.lastPanX
      const dy = e.clientY - this.lastPanY
      this.transform.offsetX += dx
      this.transform.offsetY += dy
      this.lastPanX = e.clientX
      this.lastPanY = e.clientY
      this.scheduleRender()
      return
    }

    if (this.isLassoDrawing) {
      this.lassoPath.push({ x: cx, y: cy })
      this.scheduleRender()
      return
    }

    const hitIdx = this.findPointAt(cx, cy)
    if (hitIdx !== this.hoveredIndex) {
      this.hoveredIndex = hitIdx
      const hitPoint = hitIdx !== null ? this.points[hitIdx] : null
      this.onHoverPoint?.(hitPoint ?? null)
      this.canvas.style.cursor = hitIdx !== null ? "pointer" : "default"
      this.scheduleRender()
    }
  }

  private onPointerUp(): void {
    if (this.isPanning) {
      this.isPanning = false
      this.canvas.style.cursor = "default"
      return
    }

    if (this.isLassoDrawing) {
      this.isLassoDrawing = false
      const ids = this.getLassoIds()
      this.lassoPath = []
      this.onLassoComplete?.(ids)
      this.scheduleRender()
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault()
    const rect = this.canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
    this.zoomAt(cx, cy, factor)
  }

  resize(width: number, height: number): void {
    this.dpr = window.devicePixelRatio || 1
    this.canvas.width = width * this.dpr
    this.canvas.height = height * this.dpr
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.scheduleRender()
  }
}

// ---------------------------------------------------------------------------
// Filter Sidebar
// ---------------------------------------------------------------------------

interface FilterSidebarProps {
  readonly filters: FilterState
  readonly onChange: (filters: FilterState) => void
  readonly pointCount: number
  readonly totalCount: number
}

function FilterSidebar({ filters, onChange, pointCount, totalCount }: FilterSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    kind: true,
    sensitivity: true,
    session: false,
    date: false,
  })

  const toggle = useCallback((section: string) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }))
  }, [])

  const isExpanded = useCallback(
    (section: string): boolean => expanded[section] === true,
    [expanded],
  )

  const toggleKind = useCallback(
    (kind: VectorMemoryKind) => {
      const next = new Set(filters.kinds)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      onChange({ ...filters, kinds: next })
    },
    [filters, onChange],
  )

  const toggleSensitivity = useCallback(
    (s: SensitivityLevel) => {
      const next = new Set(filters.sensitivity)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      onChange({ ...filters, sensitivity: next })
    },
    [filters, onChange],
  )

  return (
    <div className="flex h-full w-52 flex-col border-r border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]">
      <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] px-3 py-2">
        <Filter className="h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
        <span className="text-xs font-medium text-[color:var(--Eulinx-color-text)]">Filters</span>
        <div className="flex-1" />
        <span className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
          {pointCount}/{totalCount}
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {/* Kind filter */}
          <FilterSection
            title="Kind"
            expanded={isExpanded("kind")}
            onToggle={() => toggle("kind")}
          >
            {ALL_KINDS.map((kind) => (
              <label
                key={kind}
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-0.5 text-xs hover:bg-[color:var(--Eulinx-color-hover)]"
              >
                <input
                  type="checkbox"
                  checked={filters.kinds.has(kind)}
                  onChange={() => toggleKind(kind)}
                  className="h-3 w-3 accent-[color:var(--Eulinx-color-accent)]"
                />
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: KIND_COLORS[kind] }}
                />
                <span className="text-[color:var(--Eulinx-color-text-secondary)]">
                  {KIND_LABELS[kind]}
                </span>
              </label>
            ))}
          </FilterSection>

          {/* Sensitivity filter */}
          <FilterSection
            title="Sensitivity"
            expanded={isExpanded("sensitivity")}
            onToggle={() => toggle("sensitivity")}
          >
            {ALL_SENSITIVITIES.map((s) => (
              <label
                key={s}
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-0.5 text-xs hover:bg-[color:var(--Eulinx-color-hover)]"
              >
                <input
                  type="checkbox"
                  checked={filters.sensitivity.has(s)}
                  onChange={() => toggleSensitivity(s)}
                  className="h-3 w-3 accent-[color:var(--Eulinx-color-accent)]"
                />
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: SENSITIVITY_COLORS[s] }}
                />
                <span className="text-[color:var(--Eulinx-color-text-secondary)] capitalize">
                  {s}
                </span>
              </label>
            ))}
          </FilterSection>

          {/* Session filter */}
          <FilterSection
            title="Session"
            expanded={isExpanded("session")}
            onToggle={() => toggle("session")}
          >
            <Input
              value={filters.sessionId}
              onChange={(e) => onChange({ ...filters, sessionId: e.target.value })}
              placeholder="Session ID..."
              className="h-6 text-xs"
            />
          </FilterSection>

          {/* Date range filter */}
          <FilterSection
            title="Date Range"
            expanded={isExpanded("date")}
            onToggle={() => toggle("date")}
          >
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                className="rounded border border-[color:var(--Eulinx-color-border)] bg-transparent px-1.5 py-0.5 text-xs text-[color:var(--Eulinx-color-text)]"
              />
              <label className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                className="rounded border border-[color:var(--Eulinx-color-border)] bg-transparent px-1.5 py-0.5 text-xs text-[color:var(--Eulinx-color-text)]"
              />
            </div>
          </FilterSection>
        </div>
      </ScrollArea>
    </div>
  )
}

function FilterSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  readonly title: string
  readonly expanded: boolean
  readonly onToggle: () => void
  readonly children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
        ) : (
          <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
        )}
        {title}
      </button>
      {expanded && (
        <div className="flex flex-col gap-0.5 pb-1 pl-2">{children}</div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------

interface DetailPanelProps {
  readonly point: VectorPoint | null
  readonly onClose: () => void
}

function DetailPanel({ point, onClose }: DetailPanelProps) {
  if (!point) return null

  return (
    <div className="flex h-full w-64 flex-col border-l border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]">
      <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] px-3 py-2">
        <span className="text-xs font-medium text-[color:var(--Eulinx-color-text)]">Details</span>
        <div className="flex-1" />
        <ToolbarButton tip="Close" size={20} onClick={onClose}>
          <X className="h-3 w-3" strokeWidth={1.5} />
        </ToolbarButton>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-3">
          {/* Kind badge */}
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: KIND_COLORS[point.kind] }}
            />
            <StateBadge tone={KIND_TONE[point.kind]}>
              {KIND_LABELS[point.kind]}
            </StateBadge>
          </div>

          {/* Content */}
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[color:var(--Eulinx-color-text-muted)]">
              Content
            </label>
            <p className="text-xs leading-relaxed text-[color:var(--Eulinx-color-text-secondary)]">
              {point.content}
            </p>
          </div>

          {/* Metadata */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--Eulinx-color-text-muted)]">
              Metadata
            </label>
            <MetaRow label="ID" value={point.id} />
            <MetaRow label="Sensitivity" value={point.sensitivity} />
            {point.sessionId && <MetaRow label="Session" value={point.sessionId} />}
            <MetaRow
              label="Created"
              value={new Date(point.createdAt).toLocaleDateString()}
            />
            <MetaRow
              label="Embedding"
              value={`${point.embedding.length}d`}
            />
          </div>

          {/* Similarity info */}
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[color:var(--Eulinx-color-text-muted)]">
              Similarity
            </label>
            <div className="rounded border border-[color:var(--Eulinx-color-border)] p-2">
              <span className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                L2 norm: {Math.sqrt(point.embedding.reduce((s, v) => s + v * v, 0)).toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function MetaRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[color:var(--Eulinx-color-text-muted)]">{label}</span>
      <span className="font-mono text-[10px] text-[color:var(--Eulinx-color-text-secondary)]">
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function Tooltip({
  point,
  position,
}: {
  readonly point: VectorPoint | null
  readonly position: { x: number; y: number } | null
}) {
  if (!point || !position) return null

  return (
    <div
      className="pointer-events-none absolute z-50 max-w-xs rounded border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-2.5 py-1.5 shadow-lg"
      style={{ left: position.x + 12, top: position.y - 8 }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: KIND_COLORS[point.kind] }}
        />
        <span className="text-[11px] font-medium text-[color:var(--Eulinx-color-text)]">
          {KIND_LABELS[point.kind]}
        </span>
      </div>
      <p className="mt-0.5 max-w-[200px] truncate text-[10px] text-[color:var(--Eulinx-color-text-secondary)]">
        {point.content}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const INITIAL_FILTERS: FilterState = {
  kinds: new Set(ALL_KINDS),
  sensitivity: new Set(ALL_SENSITIVITIES),
  sessionId: "",
  dateFrom: "",
  dateTo: "",
}

export function VectorExplorer({ workspaceId }: { readonly workspaceId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<CanvasScatterRenderer | null>(null)

  const [allPoints, setAllPoints] = useState<VectorPoint[]>([])
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPoint, setSelectedPoint] = useState<VectorPoint | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<VectorPoint | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("pan")
  const [lassoIds, setLassoIds] = useState<readonly string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // ---- Load data ----

  useEffect(() => {
    let cancelled = false

    async function loadPoints(): Promise<void> {
      setIsLoading(true)

      let points: VectorPoint[] = []

      try {
        const { HelixDBClient } = await import("@/integrations/helixdb/helixdb-client")
        const { LABEL_MEMORY } = await import("@/integrations/helixdb/helixdb-types")

        const client = new HelixDBClient({
          enabled: true,
          host: "127.0.0.1",
          port: 9743,
          timeout: 10_000,
          retryAttempts: 1,
        })

        const health = await client.health()
        if (health.ok) {
          const result = await client.query({
            query: `nWithLabelWhere("${LABEL_MEMORY}", eq("workspaceId", "${workspaceId}")).limit(${MAX_POINTS}).valueMap(["id", "content", "kind", "sessionId", "sensitivity", "createdAt", "embedding"])`,
          })

          if (result.ok) {
            points = result.value.results
              .filter(
                (r): r is Record<string, unknown> & { embedding: number[] } =>
                  Array.isArray((r as Record<string, unknown>).embedding),
              )
              .slice(0, MAX_POINTS)
              .map((r) => ({
                id: String(r.id ?? ""),
                content: String(r.content ?? ""),
                kind: (r.kind as VectorMemoryKind) ?? "stm",
                sessionId: r.sessionId ? String(r.sessionId) : undefined,
                sensitivity: (r.sensitivity as SensitivityLevel) ?? "internal",
                createdAt: String(r.createdAt ?? new Date().toISOString()),
                embedding: r.embedding,
                x: 0,
                y: 0,
              }))
          }

          await client.close()
        }
      } catch {
        // HelixDB not available, use demo data
      }

      if (points.length === 0) {
        points = generateDemoPoints(200)
      }

      if (cancelled) return

      // Project embeddings to 2D using PCA
      if (points.length > 1) {
        const embeddings = points.map((p) => [...p.embedding])
        const projected = pcaProject(embeddings, 2)

        let minX = Infinity
        let maxX = -Infinity
        let minY = Infinity
        let maxY = -Infinity
        for (const coord of projected) {
          const px = coord[0] ?? 0
          const py = coord[1] ?? 0
          if (px < minX) minX = px
          if (px > maxX) maxX = px
          if (py < minY) minY = py
          if (py > maxY) maxY = py
        }

        const rangeX = maxX - minX || 1
        const rangeY = maxY - minY || 1

        for (let i = 0; i < points.length; i++) {
          const coord = projected[i]
          const point = points[i]
          if (coord !== undefined && point !== undefined) {
            const px = coord[0] ?? 0
            const py = coord[1] ?? 0
            point.x = ((px - minX) / rangeX - 0.5) * 2
            point.y = ((py - minY) / rangeY - 0.5) * 2
          }
        }
      }

      setAllPoints(points)
      setIsLoading(false)
    }

    loadPoints()

    return () => {
      cancelled = true
    }
  }, [workspaceId])

  // ---- Initialize renderer ----

  useEffect(() => {
    if (!canvasRef.current) return

    const renderer = new CanvasScatterRenderer(canvasRef.current)
    rendererRef.current = renderer

    renderer.onPointClick = (point) => {
      setSelectedPoint(point)
    }

    renderer.onHoverPoint = (point) => {
      setHoveredPoint(point)
    }

    renderer.onLassoComplete = (ids) => {
      setLassoIds(ids)
    }

    return () => {
      renderer.destroy()
      rendererRef.current = null
    }
  }, [])

  // ---- Resize handling ----

  useEffect(() => {
    const container = containerRef.current
    const renderer = rendererRef.current
    if (!container || !renderer) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          renderer.resize(width, height)
        }
      }
    })

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  // ---- Filter points ----

  const filteredPoints = useMemo(() => {
    return allPoints.filter((p) => {
      if (!filters.kinds.has(p.kind)) return false
      if (!filters.sensitivity.has(p.sensitivity)) return false
      if (filters.sessionId && p.sessionId !== filters.sessionId) return false
      if (filters.dateFrom && p.createdAt < filters.dateFrom) return false
      if (filters.dateTo && p.createdAt > filters.dateTo) return false
      return true
    })
  }, [allPoints, filters])

  // ---- Update renderer with filtered points ----

  useEffect(() => {
    rendererRef.current?.setPoints(filteredPoints)
  }, [filteredPoints])

  // ---- Search ----

  useEffect(() => {
    if (!searchQuery.trim()) {
      rendererRef.current?.setHighlight(new Set())
      return
    }

    const ids = textSearch(filteredPoints, searchQuery)
    rendererRef.current?.setHighlight(ids)
  }, [searchQuery, filteredPoints])

  // ---- Lasso mode ----

  useEffect(() => {
    if (canvasRef.current) {
      ;(canvasRef.current as unknown as Record<string, unknown>).__lassoMode =
        interactionMode === "lasso"
    }
  }, [interactionMode])

  // ---- Selection ----

  useEffect(() => {
    rendererRef.current?.setSelected(selectedPoint?.id ?? null)
  }, [selectedPoint])

  // ---- Mouse position for tooltip ----

  const handleMouseMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    setHoverPosition({ x: e.clientX, y: e.clientY })
  }, [])

  // ---- Actions ----

  const handleResetView = useCallback(() => {
    rendererRef.current?.resetView()
  }, [])

  const handleZoomIn = useCallback(() => {
    rendererRef.current?.zoomIn()
  }, [])

  const handleZoomOut = useCallback(() => {
    rendererRef.current?.zoomOut()
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery("")
    rendererRef.current?.setHighlight(new Set())
  }, [])

  const clearLasso = useCallback(() => {
    setLassoIds([])
  }, [])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filter sidebar */}
      <FilterSidebar
        filters={filters}
        onChange={setFilters}
        pointCount={filteredPoints.length}
        totalCount={allPoints.length}
      />

      {/* Main area */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex h-8 shrink-0 items-center gap-1.5 border-b border-[color:var(--Eulinx-color-border)] px-3"
          style={{ background: "var(--Eulinx-color-toolbar)" }}
        >
          <span className="text-xs font-medium text-[color:var(--Eulinx-color-text)]">
            Vector Explorer
          </span>
          <ToolbarSep />

          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]"
              strokeWidth={1.5}
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search points..."
              aria-label="Search vector points"
              className="h-6 w-44 pl-6 pr-6 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-[color:var(--Eulinx-color-hover)]"
              >
                <X className="h-3 w-3 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
              </button>
            )}
          </div>
          <ToolbarSep />

          {/* Interaction mode */}
          <ToolbarButton
            tip="Pan mode"
            active={interactionMode === "pan"}
            size={24}
            onClick={() => setInteractionMode("pan")}
          >
            <MousePointer2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ToolbarButton>
          <ToolbarButton
            tip="Lasso select"
            active={interactionMode === "lasso"}
            size={24}
            onClick={() => setInteractionMode("lasso")}
          >
            <Lasso className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ToolbarButton>

          {lassoIds.length > 0 && (
            <>
              <ToolbarSep />
              <span className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                {lassoIds.length} selected
              </span>
              <ToolbarButton tip="Clear selection" size={24} onClick={clearLasso}>
                <X className="h-3 w-3" strokeWidth={1.5} />
              </ToolbarButton>
            </>
          )}

          <div className="flex-1" />

          {/* Zoom controls */}
          <ToolbarButton tip="Zoom in" size={24} onClick={handleZoomIn}>
            <ZoomIn className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ToolbarButton>
          <ToolbarButton tip="Zoom out" size={24} onClick={handleZoomOut}>
            <ZoomOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ToolbarButton>
          <ToolbarButton tip="Reset view" size={24} onClick={handleResetView}>
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ToolbarButton>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden"
          onPointerMove={handleMouseMove}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
          />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--Eulinx-color-background)]/80">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--Eulinx-color-border)] border-t-[color:var(--Eulinx-color-accent)]" />
                <span className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
                  Loading embeddings...
                </span>
              </div>
            </div>
          )}

          {filteredPoints.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm text-[color:var(--Eulinx-color-text-muted)]">
                  No data points
                </span>
                <span className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                  Adjust filters or check HelixDB connection
                </span>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-3 left-3 rounded border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]/90 px-2.5 py-1.5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {ALL_KINDS.map((kind) => (
                <div key={kind} className="flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: KIND_COLORS[kind] }}
                  />
                  <span className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                    {KIND_LABELS[kind]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tooltip */}
          <Tooltip point={hoveredPoint} position={hoverPosition} />
        </div>
      </div>

      {/* Detail panel */}
      <DetailPanel
        point={selectedPoint}
        onClose={() => setSelectedPoint(null)}
      />
    </div>
  )
}

export default VectorExplorer
