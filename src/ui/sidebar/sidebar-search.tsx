/**
 * SidebarSearch — search entry in the sidebar header.
 *
 * The primary search surface: focusing/typing opens the command palette.
 * Local typing also filters the file tree below.
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
      className="shrink-0 px-2 py-1.5"
      style={{ borderBottom: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}` }}
    >
      <button
        type="button"
        onClick={onOpenPalette}
        onFocus={() => onOpenPalette()}
        aria-label="Search or run command"
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-[color:var(--Eulinx-color-hover)]"
        style={{
          color: token("--Eulinx-color-text-muted"),
          border: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
        }}
      >
        <Icon name="domain.search" size="xs" aria-hidden />
        <span className="flex-1 text-left text-xs">Search files, workers...</span>
        <kbd
          className="text-[10px] opacity-60"
          style={{ fontFamily: "var(--Eulinx-font-mono, monospace)" }}
        >
          Ctrl+K
        </kbd>
      </button>
      <input
        ref={inputRef}
        type="text"
        aria-label="Filter tree (local)"
        placeholder="Quick filter..."
        className="mt-1 w-full rounded bg-transparent px-2 py-1 text-xs outline-none"
        style={{ color: token("--Eulinx-color-text") }}
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
