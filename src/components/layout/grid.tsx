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

const colClassMap: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
  9: "grid-cols-9",
  10: "grid-cols-10",
  11: "grid-cols-11",
  12: "grid-cols-12",
}

const breakpointPrefixes: Record<string, string> = {
  sm: "sm:",
  md: "md:",
  lg: "lg:",
  xl: "xl:",
}

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number | { sm?: number; md?: number; lg?: number; xl?: number }
  gap?: number | keyof typeof gapMap
  align?: keyof typeof alignMap
  justify?: React.CSSProperties["justifyContent"]
}

function resolveGap(gap: NonNullable<GridProps["gap"]>): number {
  return typeof gap === "number" ? gap : gapMap[gap]
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 1, gap = "md", align = "stretch", justify, style, ...props }, ref) => {
    const gapValue = resolveGap(gap)

    const colClasses = typeof cols === "number"
      ? colClassMap[cols]
      : Object.entries(cols)
          .filter(([, value]) => value !== undefined)
          .map(([bp, value]) => `${breakpointPrefixes[bp]}${colClassMap[value as keyof typeof colClassMap]}`)
          .join(" ")

    return (
      <div
        ref={ref}
        className={cn(
          "grid",
          colClasses,
          alignMap[align],
          className
        )}
        style={{ ...style, gap: gapValue * 4 + "px", justifyContent: justify }}
        {...props}
      />
    )
  }
)
Grid.displayName = "Grid"

export { Grid }
