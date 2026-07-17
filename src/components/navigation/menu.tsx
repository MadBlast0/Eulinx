import * as React from "react"
import { cn } from "@/utils/cn"

interface MenuItem {
  value: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
  active?: boolean
}

interface MenuProps {
  className?: string
  style?: React.CSSProperties
  items: MenuItem[]
  orientation?: "horizontal" | "vertical"
  onSelect?: (value: string) => void
}

const Menu = React.forwardRef<HTMLDivElement, MenuProps>(
  ({ className, items, orientation = "vertical", onSelect, ...props }, ref) => {
    const [focusedIndex, setFocusedIndex] = React.useState(-1)

    const enabledIndices = React.useMemo(
      () => items.map((_item, idx) => (_item.disabled ? -1 : idx)).filter((i) => i >= 0),
      [items]
    )

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (enabledIndices.length === 0) return

      const movePrev = () => {
        const idx = enabledIndices.indexOf(focusedIndex)
        const next = (idx - 1 + enabledIndices.length) % enabledIndices.length
        const target = enabledIndices[next]
        if (target !== undefined) setFocusedIndex(target)
      }
      const moveNext = () => {
        const idx = enabledIndices.indexOf(focusedIndex)
        const n = (idx + 1) % enabledIndices.length
        const target = enabledIndices[n]
        if (target !== undefined) setFocusedIndex(target)
      }

      if (orientation === "vertical") {
        if (e.key === "ArrowDown") { e.preventDefault(); moveNext() }
        if (e.key === "ArrowUp") { e.preventDefault(); movePrev() }
      } else {
        if (e.key === "ArrowRight") { e.preventDefault(); moveNext() }
        if (e.key === "ArrowLeft") { e.preventDefault(); movePrev() }
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        if (focusedIndex >= 0) {
          const item = items[focusedIndex]
          if (item && !item.disabled) {
            onSelect?.(item.value)
          }
        }
      }

      if (e.key === "Home") {
        e.preventDefault()
        const first = enabledIndices[0]
        if (first !== undefined) setFocusedIndex(first)
      }
      if (e.key === "End") {
        e.preventDefault()
        const last = enabledIndices[enabledIndices.length - 1]
        if (last !== undefined) setFocusedIndex(last)
      }
    }

    const handleItemClick = (value: string, disabled?: boolean) => {
      if (disabled) return
      onSelect?.(value)
    }

    return (
      <div
        ref={ref}
        role="menu"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-orientation={orientation}
        className={cn(
          "outline-none",
          orientation === "horizontal" && "flex items-center gap-1",
          orientation === "vertical" && "flex flex-col gap-0.5",
          className
        )}
        {...props}
      >
        {items.map((item, idx) => (
          <div
            key={item.value}
            role="menuitem"
            tabIndex={focusedIndex === idx ? 0 : -1}
            data-active={item.active ? "true" : undefined}
            data-disabled={item.disabled ? "true" : undefined}
            aria-disabled={item.disabled}
            className={cn(
              "flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors",
              "focus-visible:bg-accent focus-visible:text-accent-foreground",
              "aria-disabled:pointer-events-none aria-disabled:opacity-50",
              orientation === "horizontal" && "whitespace-nowrap",
              item.active && !item.disabled && "bg-accent text-accent-foreground",
              focusedIndex === idx && "bg-accent text-accent-foreground",
              className
            )}
            onClick={() => handleItemClick(item.value, item.disabled)}
            onMouseEnter={() => setFocusedIndex(idx)}
            onMouseLeave={() => setFocusedIndex(-1)}
          >
            {item.icon && (
              <span className="flex shrink-0 items-center justify-center [&_svg]:size-4">
                {item.icon}
              </span>
            )}
            <span className="flex-1 truncate">{item.label}</span>
          </div>
        ))}
      </div>
    )
  }
)
Menu.displayName = "Menu"

export { Menu }
export type { MenuProps, MenuItem }
