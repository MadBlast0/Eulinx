import * as React from "react"
import { cn } from "@/utils/cn"
import { useScrollLock } from "@/hooks/useScrollLock"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { useKeyboard } from "@/hooks/useKeyboard"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FullscreenDialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

function FullscreenDialog({
  open,
  onClose,
  title,
  children,
  className,
}: FullscreenDialogProps) {
  const contentRef = React.useRef<HTMLDivElement>(null)

  useScrollLock(open)
  useFocusTrap(contentRef as React.RefObject<HTMLElement | null>, open)
  useKeyboard("Escape", onClose, { enabled: open })

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in-0 duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Fullscreen dialog"}
    >
      <div
        ref={contentRef}
        className={cn(
          "flex flex-1 flex-col",
          className
        )}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          {title && (
            <h2 className="text-lg font-semibold">{title}</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}

FullscreenDialog.displayName = "FullscreenDialog"

export { FullscreenDialog }
export type { FullscreenDialogProps }
