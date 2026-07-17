import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/utils/cn"

interface ExpandableRowProps {
  trigger: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  className?: string
}

const ExpandableRow = React.forwardRef<HTMLDivElement, ExpandableRowProps>(
  ({ trigger, children, defaultExpanded = false, className }, ref) => {
    const [expanded, setExpanded] = React.useState(defaultExpanded)

    return (
      <div ref={ref} className={cn("", className)}>
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="flex w-full items-center gap-2 text-left"
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-90"
            )}
          />
          {trigger}
        </button>
        <div
          className={cn(
            "grid transition-all duration-200",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden pl-6">{children}</div>
        </div>
      </div>
    )
  }
)
ExpandableRow.displayName = "ExpandableRow"

export { ExpandableRow }
