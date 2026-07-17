import * as React from "react"
import { cn } from "@/utils/cn"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { useKeyboard } from "@/hooks/useKeyboard"
import { focusFirstElement, focusLastElement } from "@/utils/accessibility"

export interface FocusManagerProps {
  children: React.ReactNode
  initialFocus?: "first" | "last" | "none" | string
  restoreFocus?: boolean
  onEscape?: () => void
  enabled?: boolean
  className?: string
}

function FocusManager({
  children,
  initialFocus = "first",
  restoreFocus = true,
  onEscape,
  enabled = true,
  className,
}: FocusManagerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const previousFocusRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!enabled) return

    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement | null
    }

    const container = containerRef.current
    if (!container) return

    if (initialFocus === "first") {
      focusFirstElement(container)
    } else if (initialFocus === "last") {
      focusLastElement(container)
    } else if (typeof initialFocus === "string" && initialFocus !== "none") {
      const target = container.querySelector<HTMLElement>(initialFocus)
      target?.focus()
    }

    return () => {
      if (restoreFocus && previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus()
      }
    }
  }, [enabled, initialFocus, restoreFocus])

  useFocusTrap(containerRef as React.RefObject<HTMLElement | null>, enabled)

  useKeyboard("Escape", () => {
    onEscape?.()
  }, { enabled: enabled && !!onEscape })

  return (
    <div ref={containerRef} className={cn(className)}>
      {children}
    </div>
  )
}

FocusManager.displayName = "FocusManager"

export { FocusManager }
