import { useEffect } from "react"
import { getFocusableElements, focusFirstElement } from "@/utils/accessibility"

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean
): void {
  useEffect(() => {
    if (!active) return

    const container = containerRef.current
    if (!container) return

    focusFirstElement(container)

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentContainer = containerRef.current
      if (!currentContainer) return
      if (e.key !== "Tab") return

      const elements = getFocusableElements(currentContainer)
      if (elements.length === 0) {
        e.preventDefault()
        return
      }

      const first = elements[0] as HTMLElement
      const last = elements[elements.length - 1] as HTMLElement

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [active, containerRef])
}
