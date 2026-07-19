/**
 * P18-UI-DASH — Workspace Tab Strip (WorkspaceLayout-Part05).
 *
 * The multi-tab strip inside the canvas region: one pinned graph tab (never
 * closeable) plus worker/terminal/artifact-diff tabs. Clicking switches the
 * active tab; the "x" closes an unpinned tab. The "+" opens a new tab via the
 * `onAddTab` callback.
 */

import { useCallback, type CSSProperties, type ReactNode } from "react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import type { CanvasTab } from "@/stores/layout-store"
import { FOCUS_RING_STYLE } from "@/a11y/focus-ring"
import { usePrefersReducedMotion } from "@/ui/responsive/use-breakpoint"

export interface WorkspaceTabsProps {
  readonly tabs: readonly CanvasTab[]
  readonly activeTabId: string
  readonly onSelect: (tabId: string) => void
  readonly onClose: (tabId: string) => void
  readonly onAdd: () => void
  /** The region currently focused (to paint the active-tab focus ring). */
  readonly focusVisible?: boolean
}

const KIND_ICON: Record<CanvasTab["kind"], string> = {
  graph: "domain.graph",
  terminal: "domain.terminal",
  terminal_cards: "domain.terminal.square",
  artifact_diff: "domain.artifact",
  settings: "domain.settings",
}

function tabStyle(active: boolean, focusVisible: boolean, reducedMotion: boolean): CSSProperties {
  return {
    height: token("--Eulinx-space-8"),
    paddingLeft: token("--Eulinx-space-3"),
    paddingRight: token("--Eulinx-space-2"),
    borderRadius: token("--Eulinx-radius-sm"),
    background: active ? token("--Eulinx-color-surface-alt") : "transparent",
    color: active ? token("--Eulinx-color-text") : token("--Eulinx-color-text-muted"),
    display: "flex",
    alignItems: "center",
    gap: token("--Eulinx-space-1"),
    outline: focusVisible && active ? (FOCUS_RING_STYLE.outline as string) : "none",
    outlineOffset: focusVisible && active ? (FOCUS_RING_STYLE.outlineOffset as string) : undefined,
    transition: reducedMotion
      ? "none"
      : `background-color ${token("--Eulinx-duration-hover")} var(--Eulinx-ease-standard)`,
  }
}

export function WorkspaceTabs({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onAdd,
  focusVisible = false,
}: WorkspaceTabsProps): ReactNode {
  const reducedMotion = usePrefersReducedMotion()
  const handleClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation()
      onClose(tabId)
    },
    [onClose],
  )

  return (
    <div
      role="tablist"
      aria-label="Canvas tabs"
      data-eulinx-surface="graph"
      className="flex h-8 shrink-0 items-center gap-1 overflow-x-auto border-b px-2"
      style={{ borderColor: token("--Eulinx-color-border"), background: token("--Eulinx-color-surface") }}
    >
      {tabs.map((tab) => {
        const active = tab.tabId === activeTabId
        return (
          <div
            key={tab.tabId}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            title={tab.title}
            onClick={() => onSelect(tab.tabId)}
            className="cursor-pointer whitespace-nowrap text-role-caption transition-colors hover:bg-[color:var(--Eulinx-color-surface)]"
            style={tabStyle(active, focusVisible, reducedMotion)}
          >
            <Icon name={KIND_ICON[tab.kind] ?? "domain.graph"} size="xs" aria-hidden />
            <span className="max-w-[160px] truncate">{tab.title}</span>
            {!tab.pinned && (
              <button
                type="button"
                aria-label={`Close ${tab.title}`}
                onClick={(e) => handleClose(e, tab.tabId)}
                className="ml-1 flex items-center justify-center rounded hover:bg-[color:var(--Eulinx-color-error)]"
                style={{ width: "var(--Eulinx-space-4)", height: "var(--Eulinx-space-4)" }}
              >
                <Icon name="nav.close" size="xs" aria-hidden />
              </button>
            )}
          </div>
        )
      })}

      <button
        type="button"
        aria-label="New tab"
        onClick={onAdd}
        className="flex items-center justify-center rounded transition-colors hover:bg-[color:var(--Eulinx-color-surface)]"
        style={{
          width: "var(--Eulinx-space-6)",
          height: "var(--Eulinx-space-6)",
          color: token("--Eulinx-color-text-muted"),
        }}
      >
        <Icon name="action.add" size="sm" aria-hidden />
      </button>
    </div>
  )
}
