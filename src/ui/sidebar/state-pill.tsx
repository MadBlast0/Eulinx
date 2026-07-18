/**
 * Eulinx Sidebar — shared state pill.
 *
 * Renders the non-color triple for a state: color token + icon + label
 * (Accessibility-Part01 §StateSignal, no-color-alone rule). Workers use the
 * canonical `getStateSignal(state)` from `@/a11y`. Workflows/sessions reuse the
 * same glyph+label+color pattern via `StatePillProps` so a state is never
 * signalled by color alone.
 */

import { Icon } from "@/ui/icons"
import { getStateSignal, type WorkerState } from "@/a11y"

export interface StatePillProps {
  readonly icon: string
  readonly label: string
  /** A `--Eulinx-*` CSS custom property name (color role). */
  readonly colorToken: string
  readonly size?: "sm" | "md"
}

export function StatePill({ icon, label, colorToken, size = "sm" }: StatePillProps): React.ReactElement {
  return (
    <span
      className="inline-flex items-center gap-1 text-role-caption"
      style={{ color: `var(${colorToken})` }}
    >
      <Icon name={icon} size={size} label={label} />
      <span>{label}</span>
    </span>
  )
}

/** Build a pill from the canonical 13-state signal. */
export function WorkerStatePill({ state }: { state: WorkerState }): React.ReactElement {
  const sig = getStateSignal(state)
  return <StatePill icon={sig.icon} label={sig.label} colorToken={sig.colorToken} />
}
