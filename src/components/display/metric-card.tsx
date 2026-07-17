import * as React from "react"
import { cn } from "@/utils/cn"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  previousValue?: string | number
  icon?: React.ReactNode
  change?: number
  description?: string
  chart?: React.ReactNode
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  (
    {
      title,
      value,
      previousValue,
      icon,
      change,
      description,
      chart,
      className,
      ...props
    },
    ref
  ) => {
    const isPositive = change != null && change > 0
    const isNegative = change != null && change < 0
    const changeColor = isPositive
      ? "text-green-600 dark:text-green-400"
      : isNegative
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground"

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border bg-card p-5 text-card-foreground shadow-sm",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && <div className="text-muted-foreground/60">{icon}</div>}
        </div>

        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          {change != null && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-sm font-medium",
                changeColor
              )}
            >
              {isPositive ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : isNegative ? (
                <ArrowDown className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>

        {previousValue != null && (
          <p className="mt-1 text-xs text-muted-foreground">
            Previous: {previousValue}
          </p>
        )}

        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}

        {chart && <div className="mt-4">{chart}</div>}
      </div>
    )
  }
)
MetricCard.displayName = "MetricCard"

export { MetricCard }
export type { MetricCardProps }
