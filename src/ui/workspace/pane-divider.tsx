import { useCallback, useRef } from "react"

const HIT_AREA_STEP_PX = 10

interface PaneDividerProps {
  readonly direction: "horizontal" | "vertical"
  readonly onResize: (delta: number) => void
}

export function PaneDivider({ direction, onResize }: PaneDividerProps) {
  const dragging = useRef(false)
  const dividerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragging.current = true
      dividerRef.current?.classList.add("wsx-dividing")

      let lastPos = direction === "horizontal" ? e.clientY : e.clientX
      let rafId = 0

      document.body.style.cursor =
        direction === "horizontal" ? "row-resize" : "col-resize"
      document.body.style.userSelect = "none"
      document.body.style.pointerEvents = "none"

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return
        const currentPos =
          direction === "horizontal" ? ev.clientY : ev.clientX
        const delta = currentPos - lastPos
        lastPos = currentPos
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => onResize(delta))
      }

      const handleMouseUp = () => {
        dragging.current = false
        dividerRef.current?.classList.remove("wsx-dividing")
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        document.body.style.pointerEvents = ""
        if (rafId) cancelAnimationFrame(rafId)
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [direction, onResize],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = HIT_AREA_STEP_PX
      if (direction === "horizontal") {
        if (e.key === "ArrowUp") { e.preventDefault(); onResize(-step) }
        if (e.key === "ArrowDown") { e.preventDefault(); onResize(step) }
      } else {
        if (e.key === "ArrowLeft") { e.preventDefault(); onResize(-step) }
        if (e.key === "ArrowRight") { e.preventDefault(); onResize(step) }
      }
    },
    [direction, onResize],
  )

  return (
    <div
      ref={dividerRef}
      className="wsx-pane-divider"
      data-direction={direction}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      role="separator"
      tabIndex={0}
      aria-orientation={direction === "horizontal" ? "horizontal" : "vertical"}
    />
  )
}
