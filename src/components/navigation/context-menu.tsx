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

interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  separator?: boolean
  disabled?: boolean
  items?: ContextMenuItem[]
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  trigger: React.ReactNode
  onOpenChange?: (open: boolean) => void
  className?: string
}

function ContextMenu({ items, trigger, onOpenChange, className }: ContextMenuProps) {
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild className={cn("cursor-context-menu", className)}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[180px]">
        {items.map((item, idx) => {
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
                    {renderSubItems(item.items)}
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
            >
              {item.icon && <span className="mr-2 [&_svg]:size-4">{item.icon}</span>}
              {item.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

ContextMenu.displayName = "ContextMenu"

function renderSubItems(items: ContextMenuItem[]): React.ReactNode {
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
              {renderSubItems(item.items)}
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
      >
        {item.icon && <span className="mr-2 [&_svg]:size-4">{item.icon}</span>}
        {item.label}
      </DropdownMenuItem>
    )
  })
}

export { ContextMenu }
export type { ContextMenuProps, ContextMenuItem }
