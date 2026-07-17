import * as React from "react"
import { cn } from "@/utils/cn"

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  label?: string
}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation = "horizontal", label, ...props }, ref) => {
    if (orientation === "vertical") {
      return (
        <div
          ref={ref}
          role="separator"
          aria-orientation="vertical"
          className={cn(
            "mx-2 h-full w-px shrink-0 self-stretch bg-border",
            className
          )}
          {...props}
        />
      )
    }

    if (label) {
      return (
        <div
          ref={ref}
          role="separator"
          aria-orientation="horizontal"
          className={cn("flex w-full items-center gap-3", className)}
          {...props}
        >
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation="horizontal"
        className={cn("h-px w-full bg-border", className)}
        {...props}
      />
    )
  }
)
Divider.displayName = "Divider"

export { Divider }
