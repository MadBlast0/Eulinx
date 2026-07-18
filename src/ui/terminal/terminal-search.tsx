/**
 * TerminalView — search overlay (TerminalView-Part05 §Search).
 *
 * A token-styled overlay input that drives xterm's SearchAddon. The addon
 * owns the match scan over the rendered grid (truth); the UI only positions
 * the box, routes keys, and toggles options. Respect reduced-motion on the
 * overlay fade. Closes on Escape and restores focus to the terminal grid.
 */

import { useEffect, useRef, useState, type ReactNode, type MutableRefObject } from "react"
import { SearchAddon } from "@xterm/addon-search"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import { FOCUS_RING_STYLE } from "@/a11y/focus-ring"
import { captureFocus } from "@/a11y/focus-ring"

export interface TerminalSearchProps {
  /** Ref to the live SearchAddon owned by the view. */
  readonly searchAddon: MutableRefObject<SearchAddon | null>
  readonly onClose: () => void
  readonly reducedMotion: boolean
}

export function TerminalSearch({ searchAddon, onClose, reducedMotion }: TerminalSearchProps): ReactNode {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [regex, setRegex] = useState(false)
  const [activeMatch, setActiveMatch] = useState(0)

  const restoreFocus = useRef<() => void>(() => {})

  useEffect(() => {
    const addon = searchAddon.current
    restoreFocus.current = captureFocus()
    inputRef.current?.focus()
    // Build the search index lazily when the box opens (Part 01 "keep lazy").
    return () => {
      addon?.clearDecorations()
      restoreFocus.current()
    }
  }, [searchAddon])

  const run = (dir: "next" | "prev"): void => {
    const addon = searchAddon.current
    if (!addon || query.length === 0) return
    const opts = { caseSensitive, wholeWord, regex }
    if (dir === "next") addon.findNext(query, opts)
    else addon.findPrevious(query, opts)
    // SearchAddon does not expose counts directly; surface a best-effort flag.
    setActiveMatch((m) => (dir === "next" ? m + 1 : Math.max(0, m - 1)))
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    } else if (e.key === "Enter") {
      e.preventDefault()
      run(e.shiftKey ? "prev" : "next")
    } else if (e.key === "F3") {
      e.preventDefault()
      run(e.shiftKey ? "prev" : "next")
    }
  }

  const transition = reducedMotion
    ? "none"
    : `opacity ${token("--Eulinx-duration-fast")} var(--Eulinx-ease-standard)`

  return (
    <div
      role="dialog"
      aria-label="Find in terminal"
      className="absolute right-2 top-9 z-[var(--Eulinx-z-popover)] flex items-center gap-2 rounded border px-2 py-1 shadow-[var(--Eulinx-elev-md)]"
      style={{
        background: token("--Eulinx-color-elevated"),
        borderColor: token("--Eulinx-color-border"),
        transition,
      }}
    >
      <Icon name="domain.search" size="sm" aria-hidden />
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="Find…"
        aria-label="Search terminal output"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        style={{
          ...FOCUS_RING_STYLE,
          background: "transparent",
          color: token("--Eulinx-color-text-primary"),
          outline: "none",
          width: "14rem",
        }}
        className="text-role-label"
      />

      <SearchToggle label="Match case" active={caseSensitive} onClick={() => setCaseSensitive((v) => !v)} />
      <SearchToggle label="Whole word" active={wholeWord} onClick={() => setWholeWord((v) => !v)} />
      <SearchToggle label="Regex" active={regex} onClick={() => setRegex((v) => !v)} />

      <button
        type="button"
        aria-label="Previous match"
        title="Previous (Shift+F3)"
        onClick={() => run("prev")}
        style={FOCUS_RING_STYLE}
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-[color:var(--Eulinx-color-elevated-2)]"
      >
        <Icon name="nav.chevron.left" size="sm" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Next match"
        title="Next (F3)"
        onClick={() => run("next")}
        style={FOCUS_RING_STYLE}
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-[color:var(--Eulinx-color-elevated-2)]"
      >
        <Icon name="nav.chevron.right" size="sm" aria-hidden />
      </button>
      <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
        {query.length > 0 ? `match ${activeMatch}` : ""}
      </span>
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        style={FOCUS_RING_STYLE}
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-[color:var(--Eulinx-color-elevated-2)]"
      >
        <Icon name="nav.close" size="sm" aria-hidden />
      </button>
    </div>
  )
}

function SearchToggle({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}): ReactNode {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      style={{
        ...FOCUS_RING_STYLE,
        color: active ? token("--Eulinx-color-accent") : token("--Eulinx-color-text-muted"),
      }}
      className="flex h-6 min-w-6 items-center justify-center rounded px-1 text-role-caption hover:bg-[color:var(--Eulinx-color-elevated-2)]"
    >
      {label.slice(0, 1)}
    </button>
  )
}
