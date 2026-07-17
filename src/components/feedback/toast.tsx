import * as React from "react"
import { cn } from "@/utils/cn"
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react"

type ToastType = "success" | "error" | "warning" | "info"

interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string
  title: string
  description?: string
  type?: ToastType
  onDismiss: (id: string) => void
  duration?: number
}

const iconMap: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap: Record<ToastType, string> = {
  success:
    "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
  error:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
  warning:
    "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
  info:
    "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
}

const progressColorMap: Record<ToastType, string> = {
  success: "bg-green-500 dark:bg-green-400",
  error: "bg-red-500 dark:bg-red-400",
  warning: "bg-yellow-500 dark:bg-yellow-400",
  info: "bg-blue-500 dark:bg-blue-400",
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      id,
      title,
      description,
      type = "info",
      onDismiss,
      duration = 5000,
      className,
      ...props
    },
    ref
  ) => {
    const [progress, setProgress] = React.useState(100)
    const startTime = React.useRef(Date.now())
    const frameRef = React.useRef<number | null>(null)

    React.useEffect(() => {
      const animate = () => {
        const elapsed = Date.now() - startTime.current
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
        setProgress(remaining)
        if (remaining > 0) {
          frameRef.current = requestAnimationFrame(animate)
        } else {
          onDismiss(id)
        }
      }
      frameRef.current = requestAnimationFrame(animate)
      return () => {
        if (frameRef.current != null) cancelAnimationFrame(frameRef.current)
      }
    }, [id, duration, onDismiss])

    const Icon = iconMap[type]

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full overflow-hidden rounded-md border p-4 shadow-lg",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full data-[state=open]:fade-in",
          colorMap[type],
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-3">
          {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" />}
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold">{title}</p>
            {description && (
              <p className="text-sm opacity-90">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(id)}
            className="shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10">
          <div
            className={cn("h-full transition-all duration-150 linear", progressColorMap[type])}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }
)
Toast.displayName = "Toast"

export { Toast }
export type { ToastProps, ToastType }
