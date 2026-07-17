import * as React from "react"
import { cn } from "@/utils/cn"
import { useDisclosure } from "@/hooks/useDisclosure"
import { useClickOutside } from "@/hooks/useClickOutside"

interface FABItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: "primary" | "secondary"
}

interface FloatingActionMenuProps {
  items: FABItem[]
  icon?: React.ReactNode
  direction?: "up" | "down" | "left" | "right"
  label?: string
  className?: string
}

const itemVariantStyles: Record<string, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90",
  secondary:
    "bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/80",
}

const directionAngles: Record<string, string> = {
  up: "flex-col-reverse",
  down: "flex-col",
  left: "flex-row-reverse",
  right: "flex-row",
}

const defaultIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const FloatingActionMenu = React.forwardRef<HTMLDivElement, FloatingActionMenuProps>(
  (
    {
      items,
      icon,
      direction = "up",
      label,
      className,
    },
    ref
  ) => {
    const { open, onToggle, onClose } = useDisclosure()
    const menuRef = React.useRef<HTMLDivElement>(null)

    useClickOutside(
      menuRef as React.RefObject<HTMLElement | null>,
      () => {
        if (open) onClose()
      },
      open
    )

    React.useEffect(() => {
      if (!open) return
      function handleEscape(e: KeyboardEvent) {
        if (e.key === "Escape") onClose()
      }
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }, [open, onClose])

    return (
      <div
        ref={ref}
        className={cn("fixed bottom-6 right-6 z-50", className)}
      >
        <div
          ref={menuRef}
          className={cn(
            "flex items-center gap-2",
            directionAngles[direction]
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2",
              directionAngles[direction],
              open ? "flex" : "hidden"
            )}
          >
            {items.map((item, i) => (
              <div key={i} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    item.onClick()
                    onClose()
                  }}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-xs font-medium shadow-sm transition-all duration-200",
                    itemVariantStyles[item.variant ?? "primary"],
                    "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                  style={{
                    animation: open
                      ? `fab-enter 0.2s ease-out ${i * 0.05}s both`
                      : undefined,
                  }}
                  aria-label={item.label}
                >
                  {item.icon}
                </button>
                {label === "always" && (
                  <span className="absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded bg-background px-1.5 py-0.5 text-xs text-foreground shadow">
                    {item.label}
                  </span>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              open
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            aria-label={open ? "Close menu" : label ?? "Open menu"}
            aria-expanded={open}
          >
            <span
              className={cn(
                "transition-transform duration-300",
                open && "rotate-45 scale-110"
              )}
            >
              {icon ?? defaultIcon}
            </span>
          </button>
        </div>

        {open && (
          <div
            className="fixed inset-0 -z-10 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
            aria-hidden="true"
          />
        )}

        <style>{`
          @keyframes fab-enter {
            from {
              opacity: 0;
              transform: scale(0.5);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    )
  }
)
FloatingActionMenu.displayName = "FloatingActionMenu"

export { FloatingActionMenu }
export type { FloatingActionMenuProps, FABItem }
