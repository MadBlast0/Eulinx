import * as React from "react"
import { cn } from "@/utils/cn"
import {
  Popover as ShadcnPopover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import type { Placement } from "@/types/design-system"

interface PopoverProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: Placement
  align?: "start" | "center" | "end"
  open?: boolean
  onOpenChange?: (open: boolean) => void
  collisionDetection?: boolean
  className?: string
}

function Popover({
  content,
  children,
  side = "bottom",
  align = "center",
  open,
  onOpenChange,
  collisionDetection = true,
  className,
}: PopoverProps) {
  return (
    <ShadcnPopover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side as "top" | "right" | "bottom" | "left" | undefined}
        align={align}
        avoidCollisions={collisionDetection}
        collisionBoundary={
          collisionDetection ? (typeof document !== "undefined" ? document.body : undefined) : undefined
        }
        className={cn("z-50", className)}
      >
        {content}
      </PopoverContent>
    </ShadcnPopover>
  )
}

Popover.displayName = "Popover"

export { Popover }
export type { PopoverProps }
