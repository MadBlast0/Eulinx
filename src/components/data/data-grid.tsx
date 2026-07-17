import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { useDebounce } from "@/hooks"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./table"

type SortDirection = "asc" | "desc"

interface ColumnDef {
  key: string
  header: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
  width?: string
  align?: "left" | "center" | "right"
}

interface DataGridProps {
  columns: ColumnDef[]
  data: Record<string, unknown>[]
  pageSize?: number
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
  onRowClick?: (row: Record<string, unknown>) => void
  className?: string
}

function DataGrid({
  columns,
  data,
  pageSize = 10,
  sortable = true,
  filterable = false,
  searchable = true,
  onRowClick,
  className,
}: DataGridProps) {
  const [sortKey, setSortKey] = React.useState<string | null>(null)
  const [sortDir, setSortDir] = React.useState<SortDirection>("asc")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const debouncedSearch = useDebounce(searchQuery, 300)

  const handleSort = React.useCallback(
    (key: string) => {
      if (!sortable) return
      setSortKey((prev) => {
        if (prev === key) {
          setSortDir((d) => (d === "asc" ? "desc" : "asc"))
          return key
        }
        setSortDir("asc")
        return key
      })
      setPage(1)
    },
    [sortable]
  )

  const processed = React.useMemo(() => {
    let rows = [...data]

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      rows = rows.filter((row) =>
        Object.values(row).some((v) => {
          if (v === null || v === undefined) return false
          return String(v).toLowerCase().includes(q)
        })
      )
    }

    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        if (av === bv) return 0
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = av < bv ? -1 : 1
        return sortDir === "asc" ? cmp : -cmp
      })
    }

    return rows
  }, [data, debouncedSearch, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const pageRows = processed.slice(start, start + pageSize)

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  return (
    <div className={cn("space-y-3", className)}>
      {(searchable || filterable) && (
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="pl-8"
              />
            </div>
          )}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => {
                const isSorted = sortKey === col.key
                const SortIcon = isSorted
                  ? sortDir === "asc"
                    ? ArrowUp
                    : ArrowDown
                  : null
                return (
                  <TableHead
                    key={col.key}
                    className={cn(
                      sortable && col.sortable !== false && "cursor-pointer select-none",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right"
                    )}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => {
                      if (sortable && col.sortable !== false) handleSort(col.key)
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {SortIcon && <SortIcon className="h-3 w-3" />}
                    </span>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row, i) => (
                <TableRow
                  key={i}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right"
                      )}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : formatCellValue(row[col.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {start + 1}–{Math.min(start + pageSize, processed.length)} of{" "}
            {processed.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded p-1 hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
              disabled={safePage <= 1}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded p-1 hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {getPageNumbers(safePage, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded text-xs",
                    safePage === p
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setPage(Number(p))}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              className="rounded p-1 hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded p-1 hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
              disabled={safePage >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | "...")[] = []
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push("...")
    pages.push(total)
  } else if (current >= total - 3) {
    pages.push(1)
    pages.push("...")
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    pages.push("...")
    pages.push(current - 1)
    pages.push(current)
    pages.push(current + 1)
    pages.push("...")
    pages.push(total)
  }
  return pages
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

export { DataGrid }
export type { ColumnDef, SortDirection }
