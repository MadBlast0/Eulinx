/**
 * Eulinx Sidebar — Search entry.
 *
 * The header search input is a single search surface: focusing/typing opens the
 * command palette (Sidebar-Part03 — do not also filter the tree; the tree has
 * its own inline filter). Ctrl/Cmd+K is the global palette shortcut; this entry
 * provides the same affordance via click/focus. Local typing also filters the
 * file tree below (Sidebar-Part01 lists a SearchEntry that routes to a Panel),
 * but the primary action is opening the palette.
 */

import { useEffect, useRef } from "react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import { SEARCH_DEBOUNCE_MS } from "./use-sidebar"
import type { SidebarOpenPalette } from "./sidebar-data"

export interface SidebarSearchProps {
  readonly onOpenPalette: SidebarOpenPalette
  /** Local filter text reported (debounced) for the file tree. */
  readonly onLocalFilter?: (query: string) => void
}

export function SidebarSearch({
  onOpenPalette,
  onLocalFilter,
}: SidebarSearchProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)
  const debounce = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (debounce.current !== null) window.clearTimeout(debounce.current)
    },
    [],
  )

  return (
    <div
      className="shrink-0 px-2 py-1"
      style={{ borderBottom: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}` }}
    >
      <button
        type="button"
        onClick={onOpenPalette}
        onFocus={() => onOpenPalette()}
        aria-label="Search or run command"
        className="flex w-full items-center gap-2 px-2 py-1 text-left"
        style={{
          color: token("--Eulinx-color-text-muted"),
          border: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
          borderRadius: "var(--Eulinx-radius-md)",
        }}
      >
        <Icon name="domain.search" size="xs" aria-hidden />
        <span className="flex-1 text-left text-role-caption">Search files, workers…</span>
        <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
          ⌘K
        </span>
      </button>
      <input
        ref={inputRef}
        type="text"
        aria-label="Filter tree (local)"
        placeholder="Quick filter…"
        className="mt-1 w-full bg-transparent px-2 py-1 text-role-caption outline-none"
        style={{ color: token("--Eulinx-color-text-primary") }}
        onChange={(e) => {
          const value = e.target.value
          if (debounce.current !== null) window.clearTimeout(debounce.current)
          debounce.current = window.setTimeout(() => {
            onLocalFilter?.(value)
          }, SEARCH_DEBOUNCE_MS)
        }}
      />
    </div>
  )
}
