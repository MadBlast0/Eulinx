import * as React from "react"
import { announceToScreenReader } from "@/utils/accessibility"

export interface SrAnnounceProps {
  message: string
  priority?: "polite" | "assertive"
  clearAfterMs?: number
}

function SrAnnounce({ message, priority = "polite", clearAfterMs }: SrAnnounceProps) {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    announceToScreenReader(message, priority)

    if (clearAfterMs !== undefined) {
      timeoutRef.current = setTimeout(() => {
        announceToScreenReader("", priority)
      }, clearAfterMs)
    }

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [message, priority, clearAfterMs])

  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

SrAnnounce.displayName = "SrAnnounce"

export interface SrOnlyProps {
  children: React.ReactNode
  as?: React.ElementType
}

function SrOnly({ children, as: Component = "span" }: SrOnlyProps) {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  )
}

SrOnly.displayName = "SrOnly"

export interface SrDescriptionProps {
  id: string
  children: React.ReactNode
}

function SrDescription({ id, children }: SrDescriptionProps) {
  return (
    <div id={id} className="sr-only">
      {children}
    </div>
  )
}

SrDescription.displayName = "SrDescription"

export { SrAnnounce, SrOnly, SrDescription }
