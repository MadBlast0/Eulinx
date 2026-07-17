import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"
import { Progress } from "@/components/ui/progress"

const progressBarVariants = cva("", {
  variants: {
    size: {
      sm: "h-1.5",
      md: "h-2.5",
      lg: "h-4",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressBarVariants> {
  value: number
  max?: number
  variant?: "default" | "success" | "warning" | "error" | "destructive"
  showLabel?: boolean
  animated?: boolean
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      max = 100,
      variant = "default",
      size = "md",
      showLabel = false,
      animated = false,
      className,
      ...props
    },
    ref
  ) => {
    const progressVariant = variant === "error" ? "destructive" : variant
    const clampedValue = Math.min(Math.max(0, value), max)
    const percentage = max > 0 ? Math.round((clampedValue / max) * 100) : 0

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <div className="flex items-center gap-3">
          <Progress
            value={percentage}
            variant={progressVariant}
            className={cn(
              progressBarVariants({ size }),
              animated && "[&>div]:transition-all [&>div]:duration-500 [&>div]:ease-out"
            )}
          />
          {showLabel && (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {percentage}%
            </span>
          )}
        </div>
      </div>
    )
  }
)
ProgressBar.displayName = "ProgressBar"

export { ProgressBar }
export type { ProgressBarProps }
