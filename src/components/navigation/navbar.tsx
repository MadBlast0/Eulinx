import * as React from "react"
import { cn } from "@/utils/cn"
import { useViewportContext } from "@/providers/ViewportProvider"
import { useKeyboard } from "@/hooks/useKeyboard"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavbarProps {
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
  title?: string | React.ReactNode
  logo?: React.ReactNode
  actions?: React.ReactNode
  mobileMenu?: React.ReactNode
  sticky?: boolean
}

const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  (
    { className, title, logo, actions, mobileMenu, sticky = true, children: _children, ...props },
    ref
  ) => {
    const viewport = useViewportContext()
    const isMobile = viewport.isMobile
    const [mobileOpen, setMobileOpen] = React.useState(false)

    useKeyboard("Escape", () => setMobileOpen(false), { enabled: mobileOpen })

    return (
      <header
        ref={ref}
        className={cn(
          "flex h-14 w-full items-center border-b bg-background/80 px-4",
          sticky && "sticky top-0 z-40",
          "backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
          className
        )}
        {...props}
      >
        <div className="flex flex-1 items-center gap-3">
          {logo && <div className="flex shrink-0 items-center">{logo}</div>}
          {title && (
            <div className="text-lg font-semibold tracking-tight">
              {typeof title === "string" ? title : title}
            </div>
          )}
        </div>

        {!isMobile && actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}

        {isMobile && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            {mobileOpen && mobileMenu && (
              <div
                className={cn(
                  "fixed inset-x-0 top-14 z-50 border-b bg-background p-4 shadow-lg animate-in slide-in-from-top-2"
                )}
              >
                {mobileMenu}
              </div>
            )}
          </>
        )}
      </header>
    )
  }
)
Navbar.displayName = "Navbar"

export { Navbar }
export type { NavbarProps }
