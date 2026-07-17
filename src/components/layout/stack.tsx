import * as React from "react"
import { cn } from "@/utils/cn"

const gapMap: Record<"sm" | "md" | "lg" | "xl", number> = {
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
}

const alignMap: Record<string, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
}

export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  gap?: number | keyof typeof gapMap
  align?: keyof typeof alignMap
  justify?: React.CSSProperties["justifyContent"]
  as?: React.ElementType
}

function resolveGap(gap: NonNullable<StackProps["gap"]>): number {
  return typeof gap === "number" ? gap : gapMap[gap]
}

const Stack = React.forwardRef<HTMLElement, StackProps>(
  ({ className, gap = "md", align = "stretch", justify, as: Component = "div", style, ...props }, ref) => {
    const gapValue = resolveGap(gap)
    return (
      <Component
        ref={ref}
        className={cn(
          "flex flex-col",
          alignMap[align],
          className
        )}
        style={{ ...style, gap: gapValue * 4 + "px", justifyContent: justify }}
        {...props}
      />
    )
  }
)
Stack.displayName = "Stack"

export { Stack }
