import * as React from "react"
import { cn } from "@/utils/cn"
import { Skeleton } from "@/components/ui/skeleton"

interface SkeletonLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "card" | "table" | "avatar" | "custom"
  lines?: number
}

const SkeletonLoader = React.forwardRef<HTMLDivElement, SkeletonLoaderProps>(
  ({ variant = "text", lines = 3, className, children, ...props }, ref) => {
    if (variant === "custom") {
      return (
        <div ref={ref} className={cn("animate-pulse", className)} {...props}>
          {children}
        </div>
      )
    }

    return (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        {variant === "text" && <TextSkeleton lines={lines} />}
        {variant === "card" && <CardSkeleton />}
        {variant === "table" && <TableSkeleton rows={lines} />}
        {variant === "avatar" && <AvatarSkeleton />}
      </div>
    )
  }
)
SkeletonLoader.displayName = "SkeletonLoader"

function TextSkeleton({ lines }: { lines: number }) {
  return (
    <>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(i === lines - 1 && lines > 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/2" />
          <Skeleton variant="text" className="w-1/3" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-5/6" />
      </div>
    </div>
  )
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 pb-2">
        <Skeleton variant="text" className="h-4 w-1/4" />
        <Skeleton variant="text" className="h-4 w-1/4" />
        <Skeleton variant="text" className="h-4 w-1/4" />
        <Skeleton variant="text" className="h-4 w-1/4" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton variant="text" className="h-3 w-1/4" />
          <Skeleton variant="text" className="h-3 w-1/4" />
          <Skeleton variant="text" className="h-3 w-1/4" />
          <Skeleton variant="text" className="h-3 w-1/4" />
        </div>
      ))}
    </div>
  )
}

function AvatarSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton variant="circular" className="h-12 w-12" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-1/3" />
        <Skeleton variant="text" className="w-1/2" />
      </div>
    </div>
  )
}

export { SkeletonLoader }
export type { SkeletonLoaderProps }
