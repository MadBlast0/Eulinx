import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react"

const alertVariants = cva(
  "relative flex w-full items-start gap-3 rounded-lg border p-4",
  {
    variants: {
      type: {
        info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
        success:
          "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
        warning:
          "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
        error:
          "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
      },
    },
    defaultVariants: {
      type: "info",
    },
  }
)

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
} as const

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  type?: "info" | "success" | "warning" | "error"
  title?: string
  dismissible?: boolean
  onDismiss?: () => void
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      type = "info",
      title,
      children,
      dismissible = false,
      onDismiss,
      className,
      ...props
    },
    ref
  ) => {
    const Icon = iconMap[type ?? "info"]

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ type }), className)}
        {...props}
      >
        {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" />}
        <div className="flex-1 space-y-1">
          {title && <p className="text-sm font-semibold">{title}</p>}
          {children && <div className="text-sm opacity-90">{children}</div>}
        </div>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
Alert.displayName = "Alert"

export { Alert }
export type { AlertProps }
