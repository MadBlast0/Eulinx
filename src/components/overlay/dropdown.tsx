import * as React from "react"
import { cn } from "@/utils/cn"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"

interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  separator?: boolean
  disabled?: boolean
  items?: DropdownItem[]
  variant?: "default" | "destructive"
}

interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: "start" | "center" | "end"
  collisionDetection?: boolean
  className?: string
}

function Dropdown({ trigger, items, align = "start", collisionDetection = true, className }: DropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className={cn("cursor-pointer", className)}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        avoidCollisions={collisionDetection}
        collisionBoundary={
          collisionDetection ? (typeof document !== "undefined" ? document.body : undefined) : undefined
        }
      >
        {renderItems(items)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

Dropdown.displayName = "Dropdown"

function renderItems(items: DropdownItem[]): React.ReactNode {
  return items.map((item, idx) => {
    if (item.separator) {
      return <DropdownMenuSeparator key={`sep-${idx}`} />
    }
    if (item.items && item.items.length > 0) {
      return (
        <DropdownMenuSub key={item.label}>
          <DropdownMenuSubTrigger disabled={item.disabled}>
            {item.icon && <span className="mr-2 [&_svg]:size-4">{item.icon}</span>}
            {item.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {renderItems(item.items)}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      )
    }
    return (
      <DropdownMenuItem
        key={item.label}
        disabled={item.disabled}
        onClick={item.onClick}
        className={cn(item.variant === "destructive" && "text-destructive focus:text-destructive")}
      >
        {item.icon && <span className="mr-2 [&_svg]:size-4">{item.icon}</span>}
        {item.label}
      </DropdownMenuItem>
    )
  })
}

export { Dropdown }
export type { DropdownProps, DropdownItem }
