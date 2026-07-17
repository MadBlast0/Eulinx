import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"

const statisticCardVariants = cva(
  "rounded-xl border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "p-5",
        compact: "p-3",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface Trend {
  direction: "up" | "down" | "neutral"
  value: string
}

interface StatisticCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statisticCardVariants> {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: Trend
}

const trendIconMap = {
  up: ArrowUp,
  down: ArrowDown,
  neutral: Minus,
}

const trendColorMap = {
  up: "text-green-600 dark:text-green-400",
  down: "text-red-600 dark:text-red-400",
  neutral: "text-muted-foreground",
}

const StatisticCard = React.forwardRef<HTMLDivElement, StatisticCardProps>(
  (
    { title, value, icon, trend, variant = "default", className, ...props },
    ref
  ) => {
    const TrendIcon = trend ? trendIconMap[trend.direction] : null

    return (
      <div
        ref={ref}
        className={cn(statisticCardVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && (
            <div className="text-muted-foreground/60">{icon}</div>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          {trend && TrendIcon && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-sm font-medium",
                trendColorMap[trend.direction]
              )}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              {trend.value}
            </span>
          )}
        </div>
      </div>
    )
  }
)
StatisticCard.displayName = "StatisticCard"

export { StatisticCard }
export type { StatisticCardProps, Trend }
