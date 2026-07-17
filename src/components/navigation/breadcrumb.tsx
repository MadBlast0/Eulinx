import * as React from "react"
import { cn } from "@/utils/cn"
import { useViewportContext } from "@/providers/ViewportProvider"
import { ChevronRight, Ellipsis } from "lucide-react"

/* ─── Breadcrumb ─── */

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, ...props }, ref) => (
    <nav ref={ref} aria-label="breadcrumb" className={cn("", className)} {...props} />
  )
)
Breadcrumb.displayName = "Breadcrumb"

/* ─── BreadcrumbItem ─── */

interface BreadcrumbItemProps extends React.HTMLAttributes<HTMLLIElement> {
  isCurrentPage?: boolean
}

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, isCurrentPage, ...props }, ref) => (
    <li
      ref={ref}
      aria-current={isCurrentPage ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm",
        isCurrentPage && "font-medium text-foreground",
        !isCurrentPage && "text-muted-foreground",
        className
      )}
      {...props}
    />
  )
)
BreadcrumbItem.displayName = "BreadcrumbItem"

/* ─── BreadcrumbLink ─── */

interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean
}

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ className, asChild, ...props }, ref) => {
    if (asChild) {
      return <>{props.children}</>
    }
    return (
      <a
        ref={ref}
        className={cn(
          "transition-colors hover:text-foreground",
          className
        )}
        {...props}
      />
    )
  }
)
BreadcrumbLink.displayName = "BreadcrumbLink"

/* ─── BreadcrumbSeparator ─── */

interface BreadcrumbSeparatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode
}

const BreadcrumbSeparator = React.forwardRef<HTMLSpanElement, BreadcrumbSeparatorProps>(
  ({ className, children, ...props }, ref) => (
    <span
      ref={ref}
      role="presentation"
      aria-hidden
      className={cn("mx-1 text-muted-foreground", className)}
      {...props}
    >
      {children ?? <ChevronRight className="h-4 w-4" />}
    </span>
  )
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

/* ─── BreadcrumbEllipsis ─── */

type BreadcrumbEllipsisProps = React.HTMLAttributes<HTMLSpanElement>

const BreadcrumbEllipsis = React.forwardRef<HTMLSpanElement, BreadcrumbEllipsisProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      role="presentation"
      aria-hidden
      className={cn("flex h-5 w-5 items-center justify-center", className)}
      {...props}
    >
      <Ellipsis className="h-4 w-4" />
      <span className="sr-only">More</span>
    </span>
  )
)
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis"

/* ─── Responsive Breadcrumb (collapses middle items on mobile) ─── */

interface ResponsiveBreadcrumbProps extends BreadcrumbProps {
  items: { label: string; href?: string; onClick?: () => void }[]
  maxItems?: number
}

const ResponsiveBreadcrumb = React.forwardRef<HTMLElement, ResponsiveBreadcrumbProps>(
  ({ items, maxItems, className, ...props }, ref) => {
    const viewport = useViewportContext()
    const isMobile = viewport.isMobile
    const effectiveMax = maxItems ?? (isMobile ? 2 : 0)

    const visible: typeof items = []
    const showEllipsis = effectiveMax > 0 && items.length > effectiveMax

    if (showEllipsis) {
      const first = items[0]
      const last = items[items.length - 1]
      if (first) visible.push(first)
      if (effectiveMax > 2) {
        const middle = items.slice(1, -1)
        visible.push(...middle.slice(0, effectiveMax - 2))
      }
      if (last) visible.push(last)
    } else {
      visible.push(...items)
    }

    return (
      <Breadcrumb ref={ref} className={className} {...props}>
        <ol className="flex flex-wrap items-center gap-0.5">
          {visible.map((item, i) => {
            const isLast = i === visible.length - 1
            const isEllipsisPosition = showEllipsis && i > 0 && i < visible.length - 1 && effectiveMax <= 2

            return (
              <React.Fragment key={i}>
                <BreadcrumbItem isCurrentPage={isLast}>
                  {isEllipsisPosition ? (
                    <BreadcrumbEllipsis />
                  ) : item.href ? (
                    <BreadcrumbLink href={item.href} onClick={item.onClick}>
                      {item.label}
                    </BreadcrumbLink>
                  ) : (
                    <span
                      className={cn(
                        "cursor-pointer transition-colors hover:text-foreground"
                      )}
                      onClick={item.onClick}
                    >
                      {item.label}
                    </span>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            )
          })}
        </ol>
      </Breadcrumb>
    )
  }
)
ResponsiveBreadcrumb.displayName = "ResponsiveBreadcrumb"

export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  ResponsiveBreadcrumb,
}
export type {
  BreadcrumbProps,
  BreadcrumbItemProps,
  BreadcrumbLinkProps,
  BreadcrumbSeparatorProps,
  BreadcrumbEllipsisProps,
  ResponsiveBreadcrumbProps,
}
