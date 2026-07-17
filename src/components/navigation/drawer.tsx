import * as React from "react"
import { cn } from "@/utils/cn"
import { useViewportContext } from "@/providers/ViewportProvider"
import { useScrollLock } from "@/hooks/useScrollLock"
import { useKeyboard } from "@/hooks/useKeyboard"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetOverlay,
} from "@/components/ui/sheet"

type DrawerSide = "left" | "right" | "top" | "bottom"
type DrawerSize = "sm" | "md" | "lg" | "full"

interface DrawerProps {
  open: boolean
  onClose: () => void
  side?: DrawerSide
  size?: DrawerSize
  children: React.ReactNode
  title?: string
  className?: string
}

const sizeMap: Record<DrawerSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  full: "max-w-full",
}

const sizeMapVertical: Record<DrawerSize, string> = {
  sm: "h-1/4",
  md: "h-1/2",
  lg: "h-3/4",
  full: "h-full",
}

function Drawer({
  open,
  onClose,
  side = "right",
  size = "md",
  children,
  title,
  className,
}: DrawerProps) {
  const viewport = useViewportContext()
  const isMobile = viewport.isMobile
  const contentRef = React.useRef<HTMLDivElement>(null)

  useScrollLock(open)
  useFocusTrap(contentRef as React.RefObject<HTMLElement | null>, open)
  useKeyboard("Escape", onClose, { enabled: open })

  const effectiveSide = isMobile && side === "bottom" ? "bottom" : side
  const isHorizontal = effectiveSide === "left" || effectiveSide === "right"
  const sizeClass = isHorizontal ? sizeMap[size] : sizeMapVertical[size]

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetOverlay />
      <SheetContent
        ref={contentRef}
        side={effectiveSide}
        className={cn(
          "flex flex-col",
          isHorizontal ? sizeClass : sizeClass,
          isMobile && effectiveSide === "bottom" && "rounded-t-xl",
          className
        )}
      >
        {title && (
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription />
          </SheetHeader>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

Drawer.displayName = "Drawer"

export { Drawer }
export type { DrawerProps, DrawerSide, DrawerSize }
