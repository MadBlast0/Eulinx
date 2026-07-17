import * as React from "react"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/utils/cn"

type SortDirection = "asc" | "desc" | null

interface TableContextValue {
  variant: "default" | "bordered" | "striped"
  size: "sm" | "md" | "lg"
  responsive: boolean
}

const TableContext = React.createContext<TableContextValue>({
  variant: "default",
  size: "md",
  responsive: true,
})

function useTableContext() {
  const ctx = React.useContext(TableContext)
  if (!ctx) throw new Error("Table compound components must be used within <Table>")
  return ctx
}

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  variant?: "default" | "bordered" | "striped"
  size?: "sm" | "md" | "lg"
  responsive?: boolean
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      responsive = true,
      ...props
    },
    ref
  ) => (
    <TableContext.Provider value={{ variant, size, responsive }}>
      <div className="relative w-full overflow-auto">
        <table
          ref={ref}
          className={cn(
            "w-full caption-bottom text-sm",
            variant === "bordered" && "border [&_td]:border [&_th]:border",
            className
          )}
          {...props}
        />
      </div>
    </TableContext.Provider>
  )
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(
  ({ className, ...props }, ref) => {
    const { responsive } = useTableContext()
    return (
      <thead
        ref={ref}
        className={cn(
          "[&_tr]:border-b",
          responsive && "max-sm:hidden",
          className
        )}
        {...props}
      />
    )
  }
)
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
)
TableBody.displayName = "TableBody"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(
  ({ className, ...props }, ref) => {
    const { variant, responsive } = useTableContext()
    return (
      <tr
        ref={ref}
        className={cn(
          "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
          variant === "striped" &&
            "even:bg-muted/50 [&:hover]:even:bg-muted/70",
          responsive &&
            "max-sm:block max-sm:border max-sm:rounded-lg max-sm:p-3 max-sm:mb-3 max-sm:[&>td]:flex max-sm:[&>td]:items-center max-sm:[&>td]:justify-between max-sm:[&>td]:gap-4 max-sm:[&>td]:py-1",
          className
        )}
        {...props}
      />
    )
  }
)
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(
  ({ className, ...props }, ref) => {
    const { size } = useTableContext()
    return (
      <th
        ref={ref}
        className={cn(
          "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
          size === "sm" && "h-8 px-1 text-xs",
          size === "lg" && "h-12 px-4 text-base",
          className
        )}
        {...props}
      />
    )
  }
)
TableHead.displayName = "TableHead"

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  label?: string
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, label, children, ...props }, ref) => {
    const { size } = useTableContext()
    return (
      <td
        ref={ref}
        className={cn(
          "p-2 align-middle [&:has([role=checkbox])]:pr-0",
          size === "sm" && "p-1 text-xs",
          size === "lg" && "p-4 text-base",
          className
        )}
        {...props}
      >
        {label && (
          <span className="sr-only max-sm:not-sr-only max-sm:font-medium">
            {label}
          </span>
        )}
        {children}
      </td>
    )
  }
)
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

interface TableSortableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  onSort?: () => void
  direction?: SortDirection
}

const TableSortableHead = React.forwardRef<
  HTMLTableCellElement,
  TableSortableHeadProps
>(({ className, onSort, direction, children, ...props }, ref) => (
  <TableHead
    ref={ref}
    className={cn("cursor-pointer select-none", className)}
    onClick={onSort}
    {...props}
  >
    <div className="inline-flex items-center gap-1">
      {children}
      {direction === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : direction === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </div>
  </TableHead>
))
TableSortableHead.displayName = "TableSortableHead"

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableSortableHead,
}
export type { SortDirection }
