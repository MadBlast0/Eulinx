import * as React from "react"
import { cn } from "@/utils/cn"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SnackbarAction {
  label: string
  onClick: () => void
}

interface SnackbarProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean
  message: string
  action?: SnackbarAction
  onClose: () => void
  duration?: number
}

const Snackbar = React.forwardRef<HTMLDivElement, SnackbarProps>(
  (
    {
      open,
      message,
      action,
      onClose,
      duration = 4000,
      className,
      ...props
    },
    ref
  ) => {
    const timerRef = React.useRef<number | null>(null)

    React.useEffect(() => {
      if (open && duration > 0) {
        timerRef.current = window.setTimeout(() => onClose(), duration)
      }
      return () => {
        if (timerRef.current != null) window.clearTimeout(timerRef.current)
      }
    }, [open, duration, onClose])

    if (!open) return null

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn(
          "fixed bottom-4 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 items-center gap-3 rounded-md border bg-background px-4 py-3 shadow-lg",
          "animate-in slide-in-from-bottom-full fade-in duration-300",
          className
        )}
        {...props}
      >
        <p className="flex-1 text-sm text-foreground">{message}</p>
        {action && (
          <Button
            variant="ghost"
            size="sm"
            onClick={action.onClick}
            className="shrink-0"
          >
            {action.label}
          </Button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }
)
Snackbar.displayName = "Snackbar"

export { Snackbar }
export type { SnackbarProps, SnackbarAction }
