/**
 * Panels — accessible tab drag-to-reorder (Panels-Part06 §Accessibility Rules).
 *
 * Reorder is available by BOTH pointer drag and keyboard: a focused tab moves
 * left/right with the arrow keys (grab with Space/Enter first for an explicit
 * "grabbed" mode, matching the ARIA reorder pattern). A pointer-only reorder is
 * an accessibility failure for a primary control, so the keyboard path is the
 * source of truth and the pointer path merely mirrors it.
 *
 * This component owns NO layout state; it reports reorder intents to its parent.
 */

import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from "react"

export interface UseTabDragOptions {
  readonly count: number
  readonly onReorder: (fromIndex: number, toIndex: number) => void
  readonly reorderable: boolean
}

export interface TabDragHandlers {
  /** Whether the tab at `index` is currently grabbed for keyboard reorder. */
  grabbedIndex: number | null
  /** Spread onto each draggable tab element. */
  getTabProps(index: number): {
    draggable: boolean
    "aria-grabbed": boolean | undefined
    onKeyDown: (e: KeyboardEvent) => void
    onDragStart: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
    onDragEnd: () => void
  }
}

/**
 * Keyboard + pointer reorder controller for a single tab group.
 *
 * Keyboard: focus a tab, press Space/Enter to grab, ArrowLeft/ArrowRight to
 * move it, Space/Enter/Escape to drop. Pointer: native HTML5 drag and drop.
 */
export function useTabDrag(options: UseTabDragOptions): TabDragHandlers {
  const { count, onReorder, reorderable } = options
  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null)
  const dragFrom = useRef<number | null>(null)

  const move = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= count || from === to) return
      onReorder(from, to)
    },
    [count, onReorder],
  )

  const onKeyDown = useCallback(
    (index: number, e: KeyboardEvent) => {
      if (!reorderable) return
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        setGrabbedIndex((g) => (g === index ? null : index))
        return
      }
      if (grabbedIndex === null) return
      if (e.key === "Escape") {
        e.preventDefault()
        setGrabbedIndex(null)
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        const to = grabbedIndex - 1
        move(grabbedIndex, to)
        if (to >= 0) setGrabbedIndex(to)
        return
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        const to = grabbedIndex + 1
        move(grabbedIndex, to)
        if (to < count) setGrabbedIndex(to)
      }
    },
    [reorderable, grabbedIndex, move, count],
  )

  const getTabProps = useCallback(
    (index: number) => ({
      draggable: reorderable,
      "aria-grabbed": reorderable ? grabbedIndex === index : undefined,
      onKeyDown: (e: KeyboardEvent) => onKeyDown(index, e),
      onDragStart: (e: React.DragEvent) => {
        if (!reorderable) return
        dragFrom.current = index
        e.dataTransfer.effectAllowed = "move"
      },
      onDragOver: (e: React.DragEvent) => {
        if (!reorderable || dragFrom.current === null) return
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
      },
      onDrop: (e: React.DragEvent) => {
        if (!reorderable || dragFrom.current === null) return
        e.preventDefault()
        move(dragFrom.current, index)
        dragFrom.current = null
      },
      onDragEnd: () => {
        dragFrom.current = null
      },
    }),
    [reorderable, grabbedIndex, onKeyDown, move],
  )

  return { grabbedIndex, getTabProps }
}

/**
 * A live-region announcement string for a grab/move, so screen readers get
 * feedback during keyboard reorder. Parent wires this into `LiveRegion`.
 */
export function reorderAnnouncement(title: string, index: number, count: number): string {
  return `${title}, tab ${index + 1} of ${count}`
}

/** Convenience wrapper: a visually-hidden drag hint for the strip. */
export function DragHint({ children }: { children: ReactNode }): ReactNode {
  return (
    <span
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  )
}
