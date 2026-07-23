import { useCallback, useRef, useState } from "react"
import { useReactFlow, useViewport } from "@xyflow/react"
import { Minus, Plus } from "lucide-react"

/**
 * Floating zoom controls — bottom-left of the canvas.
 * Horizontal bar: [−] | editable % | [+]
 * The percentage is an editable input. On Enter/blur, the value is
 * clamped to [10%, 400%] and applied.
 */
export function ZoomControls() {
  const { zoomIn, zoomOut, getViewport, setViewport } = useReactFlow()
  const { zoom } = useViewport()

  const percent = Math.round(zoom * 100)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(percent))
  const inputRef = useRef<HTMLInputElement>(null)

  const applyZoom = useCallback(() => {
    const raw = parseInt(draft, 10)
    if (isNaN(raw)) {
      setDraft(String(percent))
      setEditing(false)
      return
    }

    // Clamp to [10%, 400%]
    const clamped = Math.max(10, Math.min(400, raw))
    const newZoom = clamped / 100

    const vp = getViewport()
    setViewport({ x: vp.x, y: vp.y, zoom: newZoom }, { duration: 150 })
    setDraft(String(clamped))
    setEditing(false)
  }, [draft, percent, getViewport, setViewport])

  return (
    <div className="absolute bottom-3 left-3 z-20 flex items-center overflow-hidden rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] shadow-[var(--Eulinx-elev-sm)]">
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => zoomOut()}
        className="flex h-7 w-7 items-center justify-center text-[color:var(--Eulinx-color-text-muted)] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      <div className="h-4 w-px bg-[color:var(--Eulinx-color-border)]" />

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onBlur={applyZoom}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyZoom()
            if (e.key === "Escape") {
              setDraft(String(percent))
              setEditing(false)
            }
          }}
          autoFocus
          className="h-7 w-10 bg-transparent text-center text-[11px] tabular-nums text-[color:var(--Eulinx-color-text)] outline-none"
        />
      ) : (
        <button
          type="button"
          aria-label="Edit zoom level"
          onClick={() => {
            setDraft(String(percent))
            setEditing(true)
            // Focus on next tick so the value is set before autoFocus
            requestAnimationFrame(() => inputRef.current?.select())
          }}
          className="flex h-7 min-w-[3rem] items-center justify-center px-2 text-[11px] tabular-nums text-[color:var(--Eulinx-color-text-secondary)] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
        >
          {percent}%
        </button>
      )}

      <div className="h-4 w-px bg-[color:var(--Eulinx-color-border)]" />

      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => zoomIn()}
        className="flex h-7 w-7 items-center justify-center text-[color:var(--Eulinx-color-text-muted)] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}
