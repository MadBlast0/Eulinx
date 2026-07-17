import * as React from "react"
import { cn } from "@/utils/cn"

interface MobileHeaderProps {
  title: string
  leftAction?: React.ReactNode
  rightAction?: React.ReactNode
  className?: string
  variant?: "default" | "transparent" | "prominent"
}

const variantStyles: Record<string, string> = {
  default: "bg-background/80 border-b backdrop-blur-md",
  transparent: "bg-transparent border-b border-border/30",
  prominent:
    "bg-background border-b shadow-sm",
}

const MobileHeader = React.forwardRef<HTMLElement, MobileHeaderProps>(
  ({ title, leftAction, rightAction, className, variant = "default" }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          "sticky top-0 z-40",
          "flex h-12 items-center justify-between px-4",
          "pt-safe pt-[env(safe-area-inset-top,0px)]",
          variantStyles[variant],
          className
        )}
      >
        <div className="flex min-w-12 items-center justify-start">
          {leftAction && (
            <div className="flex items-center">
              {leftAction}
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center">
          <h1 className="truncate text-center text-base font-semibold">
            {title}
          </h1>
        </div>

        <div className="flex min-w-12 items-center justify-end gap-1">
          {rightAction && (
            <div className="flex items-center gap-1">
              {rightAction}
            </div>
          )}
        </div>
      </header>
    )
  }
)
MobileHeader.displayName = "MobileHeader"

export { MobileHeader }
export type { MobileHeaderProps }
