import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const bannerVariants = cva(
  "flex w-full items-center justify-center gap-x-4 gap-y-2 px-4 py-3 text-sm",
  {
    variants: {
      type: {
        info: "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
        success:
          "bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
        warning:
          "bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100",
        error: "bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
        promotional:
          "bg-gradient-to-r from-purple-50 to-pink-50 text-purple-900 dark:from-purple-950 dark:to-pink-950 dark:text-purple-100",
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
  promotional: Sparkles,
} as const

interface BannerAction {
  label: string
  onClick: () => void
}

interface BannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bannerVariants> {
  type?: "info" | "success" | "warning" | "error" | "promotional"
  message: string
  action?: BannerAction
  dismissible?: boolean
  onDismiss?: () => void
  fixed?: boolean
}

const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  (
    {
      type = "info",
      message,
      action,
      dismissible = false,
      onDismiss,
      fixed = false,
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
        className={cn(
          bannerVariants({ type }),
          fixed && "fixed inset-x-0 top-0 z-50",
          "flex-wrap text-center sm:flex-nowrap sm:text-left",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span>{message}</span>
        </div>
        <div className="flex items-center gap-2">
          {action && (
            <Button
              variant="ghost"
              size="sm"
              onClick={action.onClick}
              className="shrink-0 text-inherit underline-offset-4 hover:underline"
            >
              {action.label}
            </Button>
          )}
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
      </div>
    )
  }
)
Banner.displayName = "Banner"

export { Banner }
export type { BannerProps, BannerAction }
