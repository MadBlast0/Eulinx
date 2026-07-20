import { useCallback, useRef } from "react"

interface PaneDividerProps {
  readonly direction: "horizontal" | "vertical"
  readonly onResize: (delta: number) => void
}

export function PaneDivider({ direction, onResize }: PaneDividerProps) {
  const dragging = useRef(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragging.current = true
      let lastPos = direction === "horizontal" ? e.clientY : e.clientX

      document.body.style.cursor =
        direction === "horizontal" ? "row-resize" : "col-resize"
      document.body.style.userSelect = "none"

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return
        const currentPos =
          direction === "horizontal" ? ev.clientY : ev.clientX
        const delta = currentPos - lastPos
        lastPos = currentPos
        onResize(delta)
      }

      const handleMouseUp = () => {
        dragging.current = false
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [direction, onResize],
  )

  return (
    <div
      className="wsx-pane-divider"
      data-direction={direction}
      onMouseDown={handleMouseDown}
      role="separator"
      tabIndex={0}
      aria-orientation={direction === "horizontal" ? "horizontal" : "vertical"}
    />
  )
}
