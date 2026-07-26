import { useCallback, useEffect, useRef, useState } from "react"

interface UseMenuKeyboardOptions {
  open: boolean
  itemCount: number
  onClose: () => void
  onExecute: (index: number) => void
  /** Ref to restore focus to when the menu closes */
  restoreFocusRef?: React.RefObject<HTMLElement | null>
}

export function useMenuKeyboard({
  open,
  itemCount,
  onClose,
  onExecute,
  restoreFocusRef,
}: UseMenuKeyboardOptions) {
  const [activeIndex, setActiveIndex] = useState(-1)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])

  // Reset active index when menu opens
  useEffect(() => {
    if (open) {
      setActiveIndex(-1)
      itemRefs.current = []
    }
  }, [open])

  // Restore focus when menu closes
  useEffect(() => {
    if (!open && restoreFocusRef?.current) {
      restoreFocusRef.current.focus()
    }
  }, [open, restoreFocusRef])

  const registerItem = useCallback((index: number, el: HTMLElement | null) => {
    itemRefs.current[index] = el
  }, [])

  const setHoverIndex = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  // Focus the active item when it changes via keyboard
  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < itemCount) {
      itemRefs.current[activeIndex]?.focus()
    }
  }, [activeIndex, itemCount])

  // Cleanup refs when items shrink
  useEffect(() => {
    itemRefs.current.length = itemCount
  }, [itemCount])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return

      switch (e.key) {
        case "Escape":
          e.preventDefault()
          e.stopPropagation()
          onClose()
          break
        case "ArrowDown":
          e.preventDefault()
          setActiveIndex((prev) => {
            const next = prev < itemCount - 1 ? prev + 1 : 0
            return next
          })
          break
        case "ArrowUp":
          e.preventDefault()
          setActiveIndex((prev) => {
            const next = prev > 0 ? prev - 1 : itemCount - 1
            return next
          })
          break
        case "Enter":
        case " ":
          e.preventDefault()
          if (activeIndex >= 0 && activeIndex < itemCount) {
            onExecute(activeIndex)
          }
          break
      }
    },
    [open, itemCount, activeIndex, onClose, onExecute],
  )

  return {
    menuRef,
    activeIndex,
    registerItem,
    setHoverIndex,
    handleKeyDown,
  }
}
