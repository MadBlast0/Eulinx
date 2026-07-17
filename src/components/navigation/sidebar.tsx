import * as React from "react"
import { cn } from "@/utils/cn"
import { useViewportContext } from "@/providers/ViewportProvider"
import {
  Sheet,
  SheetContent,
  SheetOverlay,
} from "@/components/ui/sheet"
import { Slot } from "@radix-ui/react-slot"

/* ─── Context ─── */

interface SidebarContextValue {
  collapsed: boolean
  onToggle?: () => void
  width: number
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebarContext(): SidebarContextValue {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) throw new Error("Sidebar sub-components must be used within <Sidebar>")
  return ctx
}

/* ─── Props ─── */

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean
  onToggle?: () => void
  width?: number
  collapsible?: boolean
}

interface SidebarItemProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  label: string
  badge?: string | number
  active?: boolean
  asChild?: boolean
}

interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
}

interface SidebarSubItemProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  label: string
  active?: boolean
}

/* ─── Sidebar ─── */

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      className,
      children,
      collapsed = false,
      onToggle,
      width = 280,
      collapsible: _collapsible = true,
      ...props
    },
    ref
  ) => {
    const viewport = useViewportContext()
    const isMobile = viewport.isMobile

    const ctxValue = React.useMemo(
      () => ({ collapsed, onToggle, width }),
      [collapsed, onToggle, width]
    )

    if (isMobile) {
      return (
        <Sheet open={!collapsed} onOpenChange={(open) => { if (!open) onToggle?.() }}>
          <SheetOverlay />
          <SheetContent side="left" className="p-0 w-[300px] sm:max-w-[300px]" showClose={false}>
            <SidebarContext.Provider value={ctxValue}>
              <div className={cn("flex h-full flex-col bg-background", className)} {...props}>
                {children}
              </div>
            </SidebarContext.Provider>
          </SheetContent>
        </Sheet>
      )
    }

    return (
      <SidebarContext.Provider value={ctxValue}>
        <div
          ref={ref}
          data-state={collapsed ? "collapsed" : "expanded"}
          className={cn(
            "flex h-full flex-col border-r bg-background transition-all duration-300 ease-in-out",
            collapsed ? "w-[60px]" : "w-[var(--sidebar-width)]",
            className
          )}
          style={{ "--sidebar-width": `${width}px` } as React.CSSProperties}
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    )
  }
)
Sidebar.displayName = "Sidebar"

/* ─── SidebarHeader ─── */

const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { collapsed } = useSidebarContext()
    return (
      <div
        ref={ref}
        className={cn(
          "flex shrink-0 items-center border-b px-4 py-3",
          collapsed && "justify-center px-2",
          className
        )}
        {...props}
      />
    )
  }
)
SidebarHeader.displayName = "SidebarHeader"

/* ─── SidebarContent ─── */

const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-1 overflow-y-auto overflow-x-hidden py-2", className)}
      {...props}
    />
  )
)
SidebarContent.displayName = "SidebarContent"

/* ─── SidebarFooter ─── */

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { collapsed } = useSidebarContext()
    return (
      <div
        ref={ref}
        className={cn(
          "flex shrink-0 items-center border-t px-4 py-3",
          collapsed && "justify-center px-2",
          className
        )}
        {...props}
      />
    )
  }
)
SidebarFooter.displayName = "SidebarFooter"

/* ─── SidebarItem ─── */

const SidebarItem = React.forwardRef<HTMLDivElement, SidebarItemProps>(
  ({ className, icon, label, badge, active, asChild = false, ...props }, ref) => {
    const { collapsed } = useSidebarContext()
    const Comp = asChild ? Slot : "div"

    return (
      <Comp
        ref={ref}
        role="button"
        tabIndex={0}
        data-active={active ? "true" : undefined}
        className={cn(
          "group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
          "aria-disabled:pointer-events-none aria-disabled:opacity-50",
          active && "bg-accent text-accent-foreground",
          collapsed && "justify-center px-2",
          className
        )}
        {...props}
      >
        {icon && (
          <span className="flex shrink-0 items-center justify-center [&_svg]:size-5">
            {icon}
          </span>
        )}
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {badge != null && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {badge}
              </span>
            )}
          </>
        )}
      </Comp>
    )
  }
)
SidebarItem.displayName = "SidebarItem"

/* ─── SidebarGroup ─── */

const SidebarGroup = React.forwardRef<HTMLDivElement, SidebarGroupProps>(
  ({ className, title, children, ...props }, ref) => {
    const { collapsed } = useSidebarContext()
    return (
      <div ref={ref} className={cn("px-3 py-2", className)} {...props}>
        {title && !collapsed && (
          <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
        )}
        <div className="space-y-0.5">{children}</div>
      </div>
    )
  }
)
SidebarGroup.displayName = "SidebarGroup"

/* ─── SidebarSubItem ─── */

const SidebarSubItem = React.forwardRef<HTMLDivElement, SidebarSubItemProps>(
  ({ className, icon, label, active, ...props }, ref) => {
    const { collapsed } = useSidebarContext()

    if (collapsed) return null

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        data-active={active ? "true" : undefined}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-md py-1.5 pl-9 pr-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          "aria-disabled:pointer-events-none aria-disabled:opacity-50",
          active && "bg-accent text-accent-foreground",
          className
        )}
        {...props}
      >
        {icon && (
          <span className="flex shrink-0 items-center justify-center [&_svg]:size-4">
            {icon}
          </span>
        )}
        <span className="truncate">{label}</span>
      </div>
    )
  }
)
SidebarSubItem.displayName = "SidebarSubItem"

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarItem,
  SidebarGroup,
  SidebarSubItem,
}
export type { SidebarProps, SidebarItemProps, SidebarGroupProps, SidebarSubItemProps }
