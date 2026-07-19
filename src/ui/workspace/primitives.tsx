import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/utils/cn"

type DotColor = "g" | "a" | "r"

const DOT_BG: Record<DotColor, string> = {
  g: "var(--wsx-green)",
  a: "var(--wsx-amber)",
  r: "var(--wsx-red)",
}

export function Dot({ color }: { color: DotColor }) {
  return (
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: DOT_BG[color] }}
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
  ...rest
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      data-tip={tip}
      className={cn(
        "wsx-tip relative flex items-center justify-center rounded-[var(--wsx-r-sm)] transition-colors",
        active
          ? "text-[color:var(--wsx-text)]"
          : "text-[color:var(--wsx-text-muted)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text-sec)]",
        className,
      )}
      style={{ width: size, height: size, WebkitAppRegion: "no-drag" }}
      {...rest}
    >
      {children}
    </button>
  )
}

export function ToolbarSep() {
  return <div className="mx-[3px] h-[18px] w-px shrink-0 bg-[color:var(--wsx-border)]" />
}
