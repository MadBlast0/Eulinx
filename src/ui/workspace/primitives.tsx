import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react"
import { cn } from "@/utils/cn"
import { type Tone, TONE_FG } from "./state"

export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  return (
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: TONE_FG[tone] }}
    />
  )
}

interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly tip?: string
  readonly active?: boolean
  readonly size?: number
  readonly children: ReactNode
}

export function ToolbarButton({
  tip,
  active = false,
  size = 28,
  className,
  children,
  disabled,
  ...rest
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      data-tip={tip}
      disabled={disabled}
      className={cn(
        "relative flex items-center justify-center rounded-[var(--Eulinx-radius-sm)] transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        disabled && "pointer-events-none opacity-30",
        !disabled && (active
          ? "bg-[color:var(--Eulinx-color-selected)] text-[color:var(--Eulinx-color-text)]"
          : "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"),
        className,
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      {children}
    </button>
  )
}

export function ToolbarSep() {
  return (
    <div className="mx-[3px] h-[18px] w-px shrink-0 bg-[color:var(--Eulinx-color-border)]" />
  )
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
        "border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]",
        "rounded-[var(--Eulinx-radius-md)]",
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
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none",
        className,
      )}
      style={{
        color: TONE_FG[tone],
        background: `color-mix(in srgb, ${TONE_FG[tone]} 14%, transparent)`,
      }}
    >
      {children}
    </span>
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
        "flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] px-2 py-1 text-sm",
        "transition-colors",
        interactive && "cursor-pointer",
        active
          ? "bg-[color:var(--Eulinx-color-selected)] text-[color:var(--Eulinx-color-text)]"
          : "text-[color:var(--Eulinx-color-text-secondary)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]",
        className,
      )}
      {...rest}
    />
  )
}
