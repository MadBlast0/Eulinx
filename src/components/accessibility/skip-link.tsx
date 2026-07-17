import { cn } from "@/utils/cn"

export interface SkipLinkProps {
  targetId: string
  label?: string
  className?: string
}

function SkipLink({
  targetId,
  label = "Skip to content",
  className,
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999]",
        "focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground",
        "focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
    >
      {label}
    </a>
  )
}

SkipLink.displayName = "SkipLink"

export { SkipLink }
