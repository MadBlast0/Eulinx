import * as React from "react"
import { cn } from "@/utils/cn"

interface TimelineProps extends React.HTMLAttributes<HTMLOListElement> {
  children: React.ReactNode
}

const Timeline = React.forwardRef<HTMLOListElement, TimelineProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <ol
        ref={ref}
        className={cn("space-y-0", className)}
        {...props}
      >
        {children}
      </ol>
    )
  }
)
Timeline.displayName = "Timeline"

interface TimelineItemProps extends React.HTMLAttributes<HTMLLIElement> {
  title: string
  description?: string
  time?: string
  icon?: React.ReactNode
  active?: boolean
  completed?: boolean
}

const TimelineItem = React.forwardRef<HTMLLIElement, TimelineItemProps>(
  (
    {
      title,
      description,
      time,
      icon,
      active = false,
      completed = false,
      className,
      ...props
    },
    ref
  ) => {
    const isActive = active || completed
    const dotColor = completed
      ? "bg-primary"
      : active
        ? "bg-blue-500"
        : "bg-muted-foreground/30"

    return (
      <li
        ref={ref}
        className={cn("relative flex gap-4 pb-8 last:pb-0", className)}
        {...props}
      >
        <div className="flex flex-col items-center">
          <span
            className={cn(
              "relative z-10 flex h-3 w-3 shrink-0 items-center justify-center rounded-full ring-2 ring-background",
              dotColor
            )}
          >
            {icon && (
              <span className="absolute inset-0 flex items-center justify-center">
                {icon}
              </span>
            )}
          </span>
          <div className="mt-0.5 h-full w-px bg-border" />
        </div>
        <div className={cn("flex-1 pb-2", !isActive && "opacity-60")}>
          <div className="flex items-baseline justify-between gap-2">
            <h4
              className={cn(
                "text-sm font-medium",
                completed && "text-primary",
                active && "text-blue-500"
              )}
            >
              {title}
            </h4>
            {time && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {time}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </li>
    )
  }
)
TimelineItem.displayName = "TimelineItem"

export { Timeline, TimelineItem }
export type { TimelineProps, TimelineItemProps }
