import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/utils/cn"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { type Tone, TONE_FG } from "./state"

export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  return (
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: TONE_FG[tone] }}
    />
  )
}

interface ToolbarButtonProps {
  readonly tip?: string
  readonly active?: boolean
  readonly size?: number
  readonly children: ReactNode
  readonly className?: string
  readonly disabled?: boolean
  readonly onClick?: () => void
}

export function ToolbarButton({
  tip,
  active = false,
  size = 28,
  className,
  children,
  disabled,
  onClick,
}: ToolbarButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      data-tip={tip}
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md",
        active && "bg-accent text-accent-foreground",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {children}
    </Button>
  )
}

export function ToolbarSep() {
  return <Separator orientation="vertical" className="mx-1 h-[18px]" />
}

interface PanelSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  readonly as?: "div" | "section" | "aside"
}

/** A raised surface shell: bordered, token-background, consistent radius. */
export function PanelSurface({
  className,
  as: Tag = "div",
  ...rest
}: PanelSurfaceProps) {
  return (
    <Tag
      className={cn(
        "border border-border bg-card rounded-lg",
        className,
      )}
      {...rest}
    />
  )
}

interface StateBadgeProps {
  readonly tone?: Tone
  readonly children: ReactNode
  readonly className?: string
}

/** Small token-tinted status pill used across lists, tabs, and node cards. */
export function StateBadge({ tone = "neutral", children, className }: StateBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={{
        color: TONE_FG[tone],
        background: `color-mix(in srgb, ${TONE_FG[tone]} 14%, transparent)`,
      }}
    >
      {children}
    </Badge>
  )
}

interface ListRowProps extends HTMLAttributes<HTMLDivElement> {
  readonly active?: boolean
  readonly interactive?: boolean
}

/** Reusable sidebar/list row with shared hover/select tokens. */
export function ListRow({
  active = false,
  interactive = true,
  className,
  ...rest
}: ListRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1 text-sm",
        "transition-colors",
        interactive && "cursor-pointer",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        className,
      )}
      {...rest}
    />
  )
}
