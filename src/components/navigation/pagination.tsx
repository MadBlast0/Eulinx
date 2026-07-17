import { cn } from "@/utils/cn"
import { useViewportContext } from "@/providers/ViewportProvider"
import { useKeyboard } from "@/hooks/useKeyboard"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  siblingCount?: number
  className?: string
  showFirstLast?: boolean
}

function range(start: number, end: number): number[] {
  const length = end - start + 1
  return Array.from({ length }, (_, i) => start + i)
}

function getPageNumbers(current: number, total: number, siblings: number): (number | "ellipsis")[] {
  const totalPageNumbers = siblings * 2 + 5

  if (total <= totalPageNumbers) {
    return range(1, total)
  }

  const leftSiblingIndex = Math.max(current - siblings, 1)
  const rightSiblingIndex = Math.min(current + siblings, total)

  const showLeftEllipsis = leftSiblingIndex > 2
  const showRightEllipsis = rightSiblingIndex < total - 1

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftCount = 3 + 2 * siblings
    const leftRange = range(1, leftCount)
    return [...leftRange, "ellipsis", total]
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightCount = 3 + 2 * siblings
    const rightRange = range(total - rightCount + 1, total)
    return [1, "ellipsis", ...rightRange]
  }

  const middleRange = range(leftSiblingIndex, rightSiblingIndex)
  return [1, "ellipsis", ...middleRange, "ellipsis", total]
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
  showFirstLast = false,
}: PaginationProps) {
  const viewport = useViewportContext()
  const isMobile = viewport.isMobile
  const effectiveSiblings = isMobile ? Math.min(siblingCount, 1) : siblingCount
  const pages = getPageNumbers(currentPage, totalPages, effectiveSiblings)

  useKeyboard("ArrowLeft", () => {
    if (currentPage > 1) onPageChange(currentPage - 1)
  })

  useKeyboard("ArrowRight", () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1)
  })

  if (totalPages <= 1) return null

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)}>
      {showFirstLast && (
        <Button
          variant="ghost"
          size="icon"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page, idx) =>
        page === "ellipsis" ? (
          <span key={`ellipsis-${idx}`} className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground">
            &hellip;
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "ghost"}
            size="icon"
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? "page" : undefined}
            aria-label={`Page ${page}`}
          >
            {page}
          </Button>
        )
      )}

      <Button
        variant="ghost"
        size="icon"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {showFirstLast && (
        <Button
          variant="ghost"
          size="icon"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      )}
    </nav>
  )
}

Pagination.displayName = "Pagination"

export { Pagination }
export type { PaginationProps }
