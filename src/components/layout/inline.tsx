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

export interface InlineProps extends React.HTMLAttributes<HTMLElement> {
  gap?: number | keyof typeof gapMap
  align?: keyof typeof alignMap
  justify?: React.CSSProperties["justifyContent"]
  wrap?: boolean
  as?: React.ElementType
}

function resolveGap(gap: NonNullable<InlineProps["gap"]>): number {
  return typeof gap === "number" ? gap : gapMap[gap]
}

const Inline = React.forwardRef<HTMLElement, InlineProps>(
  ({ className, gap = "md", align = "center", justify, wrap = true, as: Component = "div", style, ...props }, ref) => {
    const gapValue = resolveGap(gap)
    return (
      <Component
        ref={ref}
        className={cn(
          "flex flex-row",
          alignMap[align],
          wrap && "flex-wrap",
          className
        )}
        style={{ ...style, gap: gapValue * 4 + "px", justifyContent: justify }}
        {...props}
      />
    )
  }
)
Inline.displayName = "Inline"

export { Inline }
