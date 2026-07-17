import * as React from "react"

const sizeMap: Record<string, number> = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
}

export interface SpacerProps {
  size?: number | keyof typeof sizeMap
  axis?: "vertical" | "horizontal"
}

const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
  ({ size = "md", axis = "vertical" }, ref) => {
    const px = typeof size === "number" ? size : sizeMap[size]
    return (
      <div
        ref={ref}
        aria-hidden="true"
        style={axis === "horizontal" ? { width: px, minWidth: px, height: 1 } : { height: px, minHeight: px, width: 1 }}
      />
    )
  }
)
Spacer.displayName = "Spacer"

export { Spacer }
