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

const directionClasses: Record<string, string> = {
  row: "flex-row",
  column: "flex-col",
  "row-reverse": "flex-row-reverse",
  "column-reverse": "flex-col-reverse",
}

export interface FlexProps extends React.HTMLAttributes<HTMLElement> {
  direction?: keyof typeof directionClasses
  wrap?: boolean
  gap?: number | keyof typeof gapMap
  align?: keyof typeof alignMap
  justify?: React.CSSProperties["justifyContent"]
  as?: React.ElementType
}

function resolveGap(gap: NonNullable<FlexProps["gap"]>): number {
  return typeof gap === "number" ? gap : gapMap[gap]
}

const Flex = React.forwardRef<HTMLElement, FlexProps>(
  ({ className, direction = "row", wrap = false, gap = "md", align = "stretch", justify, as: Component = "div", style, ...props }, ref) => {
    const gapValue = resolveGap(gap)
    return (
      <Component
        ref={ref}
        className={cn(
          "flex",
          directionClasses[direction],
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
Flex.displayName = "Flex"

export { Flex }
