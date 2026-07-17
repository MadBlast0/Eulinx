import * as React from "react"
import { cn } from "@/utils/cn"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface BottomNavItem {
  value: string
  label: string
  icon: React.ReactNode
  badge?: number | string
  disabled?: boolean
}

interface BottomNavigationProps {
  items: BottomNavItem[]
  value?: string
  onChange: (value: string) => void
  className?: string
}

const BottomNavigation = React.forwardRef<HTMLElement, BottomNavigationProps>(
  ({ items, value, onChange, className }, ref) => {
    const isDesktop = useMediaQuery("(min-width: 768px)")

    if (isDesktop) return null

    return (
      <nav
        ref={ref}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50",
          "border-t bg-background",
          "pb-safe pb-[env(safe-area-inset-bottom,0px)]",
          className
        )}
      >
        <div className="flex h-14 items-center justify-around">
          {items.map((item) => {
            const isActive = value === item.value
            return (
              <button
                key={item.value}
                type="button"
                disabled={item.disabled}
                onClick={() => onChange(item.value)}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-1 text-xs font-medium transition-colors",
                  "disabled:pointer-events-none disabled:opacity-40",
                  "min-h-11 min-w-[64px] touch-manipulation",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/80"
                )}
              >
                <span className="relative">
                  {item.icon}
                  {item.badge !== undefined && (
                    <span className="absolute -right-2 -top-1.5 flex min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    )
  }
)
BottomNavigation.displayName = "BottomNavigation"

export { BottomNavigation }
export type { BottomNavigationProps, BottomNavItem }
