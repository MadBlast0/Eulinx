/**
 * Eulinx Sidebar — collapsible section wrapper.
 *
 * Fixed vertical order is owned by the Sidebar (Part 01). Each section has a
 * header with a count badge and a collapse toggle. Collapse state is Tier 2
 * view state held in the Sidebar provider. The header respects reduced motion
 * via the token CSS (durations collapse to 0ms under prefers-reduced-motion).
 */

import { useId, type ReactNode } from "react"
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
}

export function SidebarSection({
  id,
  title,
  badge,
  expanded,
  onToggle,
  children,
  keepBodyMounted = false,
}: SidebarSectionProps): React.ReactElement {
  const bodyId = useId()
  const anim = useAnimation("panel.open")

  return (
    <section
      data-sidebar-section={id}
      className="flex min-h-0 flex-col"
      style={{ borderTop: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}` }}
    >
      <div
        role="heading"
        aria-level={2}
        className="flex shrink-0 items-center justify-between px-2 py-1"
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex flex-1 items-center gap-1 text-role-caption"
          style={{ color: token("--Eulinx-color-text-muted"), textTransform: "uppercase", letterSpacing: "0.04em" }}
        >
          <Icon
            name={expanded ? "nav.chevron.down" : "nav.chevron.right"}
            size="xs"
            aria-hidden
          />
          <span>{title}</span>
          {badge !== undefined && badge > 0 ? (
            <span
              className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-role-caption"
              style={{
                background: token("--Eulinx-color-elevated-2"),
                color: token("--Eulinx-color-text-primary"),
              }}
            >
              {badge}
            </span>
          ) : null}
        </button>
      </div>
      {expanded || keepBodyMounted ? (
        <div
          id={bodyId}
          className="min-h-0 flex-1"
          hidden={!expanded}
          style={{ ...anim.style }}
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}
