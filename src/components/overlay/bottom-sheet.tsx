import * as React from "react"
import { cn } from "@/utils/cn"
import { useScrollLock } from "@/hooks/useScrollLock"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { useKeyboard } from "@/hooks/useKeyboard"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

type BottomSheetHeight = "auto" | "medium" | "large" | "full"

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  height?: BottomSheetHeight
  className?: string
}

const heightMap: Record<BottomSheetHeight, string> = {
  auto: "max-h-[85vh]",
  medium: "h-[50vh]",
  large: "h-[75vh]",
  full: "h-full",
}

function BottomSheet({
  open,
  onClose,
  title,
  children,
  height = "auto",
  className,
}: BottomSheetProps) {
  const reducedMotion = useReducedMotion()
  const sheetRef = React.useRef<HTMLDivElement>(null)
  const [translateY, setTranslateY] = React.useState(0)
  const [dragging, setDragging] = React.useState(false)
  const startY = React.useRef(0)
  const currentY = React.useRef(0)

  useScrollLock(open)
  useFocusTrap(sheetRef as React.RefObject<HTMLElement | null>, open)
  useKeyboard("Escape", onClose, { enabled: open })

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    if (sheetRef.current && touch.clientY < sheetRef.current.getBoundingClientRect().top + 8) return
    startY.current = touch.clientY
    currentY.current = touch.clientY
    setDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return
    const touch = e.touches[0]
    if (!touch) return
    currentY.current = touch.clientY
    const diff = currentY.current - startY.current
    if (diff > 0) {
      setTranslateY(diff)
    }
  }

  const handleTouchEnd = () => {
    setDragging(false)
    const diff = currentY.current - startY.current
    const threshold = (sheetRef.current?.offsetHeight ?? 400) * 0.3
    if (diff > threshold) {
      onClose()
    }
    setTranslateY(0)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-300"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Bottom sheet"}
        className={cn(
          "relative z-10 flex w-full flex-col rounded-t-2xl border bg-background shadow-xl",
          heightMap[height],
          !reducedMotion && "animate-in slide-in-from-bottom duration-300 ease-out",
          className
        )}
        style={
          dragging
            ? { transform: `translateY(${translateY}px)`, transition: "none" }
            : translateY > 0
              ? { transform: `translateY(${translateY}px)`, transition: "transform 0.3s ease-out" }
              : undefined
        }
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex flex-1 items-center gap-2">
            <div
              className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30"
              aria-hidden
            />
          </div>
          {title && (
            <h2 className="flex-1 text-center text-sm font-semibold">{title}</h2>
          )}
          <div className="flex flex-1 justify-end">
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  )
}

BottomSheet.displayName = "BottomSheet"

export { BottomSheet }
export type { BottomSheetProps, BottomSheetHeight }
