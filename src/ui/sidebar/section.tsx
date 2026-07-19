/**
 * SidebarSection — collapsible section wrapper.
 *
 * Fixed vertical order owned by the Sidebar. Each section has a
 * header with count badge and collapse toggle. Clean, minimal styling
 * with proper spacing hierarchy.
 */

import { useEffect, useId, type ReactNode } from "react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import { useAnimation } from "@/ui/animations"

export interface SidebarSectionProps {
  readonly id: string
  readonly title: string
  readonly badge?: number
  readonly expanded: boolean
  readonly onToggle: () => void
  readonly children: ReactNode
  /** Render the body even when collapsed (used for the virtualized tree). */
  readonly keepBodyMounted?: boolean
  /** Optional right-aligned action in the header. */
  readonly headerAction?: ReactNode
}

export function SidebarSection({
  id,
  title,
  badge,
  expanded,
  onToggle,
  children,
  keepBodyMounted = false,
  headerAction,
}: SidebarSectionProps): React.ReactElement {
  const bodyId = useId()
  const anim = useAnimation("panel.open")

  // Play a reduced-motion-aware enter transition whenever the section expands.
  useEffect(() => {
    if (expanded) {
      anim.begin()
      return () => anim.end()
    }
  }, [expanded, anim])

  return (
    <section
      data-sidebar-section={id}
      className="flex min-h-0 flex-col"
      style={{ borderTop: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}` }}
    >
      <div
        role="heading"
        aria-level={2}
        className="flex shrink-0 items-center justify-between px-2 py-1.5"
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex flex-1 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider"
          style={{ color: token("--Eulinx-color-text-muted") }}
        >
          <Icon
            name={expanded ? "nav.chevron.down" : "nav.chevron.right"}
            size="xs"
            aria-hidden
          />
          <span>{title}</span>
          {badge !== undefined && badge > 0 ? (
            <span
              className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]"
              style={{
                background: token("--Eulinx-color-surface-alt"),
                color: token("--Eulinx-color-text-muted"),
              }}
            >
              {badge}
            </span>
          ) : null}
        </button>
        {headerAction}
      </div>
      {expanded || keepBodyMounted ? (
        <div
          id={bodyId}
          className="min-h-0 flex-1 overflow-y-auto"
          hidden={!expanded}
          style={{ ...anim.style }}
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}
