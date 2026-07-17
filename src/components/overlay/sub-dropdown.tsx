import * as React from "react"
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { DropdownItem } from "./dropdown"

interface SubDropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
}

function SubDropdown({ trigger, items }: SubDropdownProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{trigger}</DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
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
                      {item.items.map((sub, si) => {
                        if (sub.separator) return <DropdownMenuSeparator key={`ssep-${si}`} />
                        return (
                          <DropdownMenuItem key={sub.label} disabled={sub.disabled} onClick={sub.onClick}>
                            {sub.icon && <span className="mr-2 [&_svg]:size-4">{sub.icon}</span>}
                            {sub.label}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              )
            }
            return (
              <DropdownMenuItem key={item.label} disabled={item.disabled} onClick={item.onClick}>
                {item.icon && <span className="mr-2 [&_svg]:size-4">{item.icon}</span>}
                {item.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}

SubDropdown.displayName = "SubDropdown"

export { SubDropdown }
export type { SubDropdownProps }
