import * as React from "react"
import { cn } from "@/utils/cn"
import {
  Tooltip as ShadcnTooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import type { Placement } from "@/types/design-system"

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: Placement
  delayDuration?: number
  collisionDetection?: boolean
  className?: string
}

function Tooltip({
  content,
  children,
  side = "top",
  delayDuration = 700,
  collisionDetection = true,
  className,
}: TooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <ShadcnTooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side as "top" | "right" | "bottom" | "left" | undefined}
          avoidCollisions={collisionDetection}
          className={cn("z-50", className)}
        >
          {content}
        </TooltipContent>
      </ShadcnTooltip>
    </TooltipProvider>
  )
}

Tooltip.displayName = "Tooltip"

export { Tooltip }
export type { TooltipProps }
