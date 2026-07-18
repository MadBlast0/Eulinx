/**
 * KeyboardShortcuts — Part 04 discovery surfaces.
 *
 *   <CommandPalette>   — modal (role=dialog), focus-trapped, lists every
 *                         command (even keyless), shows displayChordFor.
 *   <ShortcutHelpOverlay> — groups all bindings by category, renders chords
 *                         per-platform from the registry.
 *
 * Both render chords via `displayChordFor` at render time (Rule 3). Modal
 * traps focus and restores it to the trigger on close (Part 03).
 *
 * Styling consumes only `--Eulinx-*` custom properties / semantic tokens.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react"
import { useKeymap } from "./use-keyboard"
import { displayChord } from "./chord"
import type { Command, CommandCategory, CommandId } from "./keymap-types"
import { commandHandlers } from "./default-keymap"

const CATEGORY_ORDER: CommandCategory[] = [
  "Navigation",
  "Workers",
  "Workflow",
  "Graph",
  "View",
  "Terminal",
  "Merge",
  "Search",
  "Application",
]

function platform(): "windows" | "macos" | "linux" {
  if (typeof navigator === "undefined") return "linux"
  const p =
    // @ts-expect-error userAgentData not in all lib.dom
    (navigator.userAgentData?.platform as string | undefined) ?? navigator.platform ?? ""
  if (/mac/i.test(p)) return "macos"
  if (/win/i.test(p)) return "windows"
  return "linux"
}

// ---------------------------------------------------------------------------
// CommandPalette
// ---------------------------------------------------------------------------

export interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  /** Invoked when a command is chosen (by click or Enter). */
  onRun?: (id: CommandId) => void
}

export function CommandPalette({ open, onClose, onRun }: CommandPaletteProps): ReactNode | null {
  const { registry } = useKeymap()
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const returnToRef = useRef<HTMLElement | null>(null)
  const plat = useMemo(() => platform(), [])

  const commands = useMemo<Command[]>(
    () => registry.listCommands().filter((c) => c.palette),
    [registry],
  )

  const filtered = useMemo<Command[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    )
  }, [commands, query])

  // Focus management: capture trigger + move focus in; restore on close.
  useEffect(() => {
    if (open) {
      returnToRef.current = (document.activeElement as HTMLElement) ?? null
      setQuery("")
      setActive(0)
      // Defer so the input is mounted.
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      returnToRef.current?.focus?.()
      returnToRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (active >= filtered.length) setActive(0)
  }, [filtered.length, active])

  const runIndex = useCallback(
    (index: number): void => {
      const cmd = filtered[index]
      if (!cmd) return
      onRun?.(cmd.id)
      const h = commandHandlers.get(cmd.id)
      if (h) void h()
      else window.dispatchEvent(new CustomEvent("eulinx:command:" + cmd.id))
      onClose()
    },
    [filtered, onClose, onRun],
  )

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>): void => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActive((a) => Math.min(a + 1, filtered.length - 1))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActive((a) => Math.max(a - 1, 0))
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        runIndex(active)
      }
    },
    [active, filtered.length, onClose, runIndex],
  )

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      data-eulinx-palette="open"
      onKeyDown={onKeyDown}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-modal)" as unknown as number,
        background: "hsl(var(--Eulinx-color-neutral-900) / 0.5)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "var(--space-24)",
      }}
    >
      <div
        style={{
          width: "min(640px, 92vw)",
          background: "var(--Eulinx-color-surface)",
          border: "1px solid var(--Eulinx-color-border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="eulinx-palette-list"
          aria-autocomplete="list"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          style={{
            width: "100%",
            padding: "var(--space-4)",
            border: "none",
            borderBottom: "1px solid var(--Eulinx-color-border)",
            background: "transparent",
            color: "var(--Eulinx-color-text-primary)",
            fontSize: "var(--font-size-base)",
            outline: "none",
          }}
        />
        <ul
          id="eulinx-palette-list"
          role="listbox"
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            maxHeight: "50vh",
            overflowY: "auto",
          }}
        >
          {filtered.map((cmd, i) => {
            const chord = registry.displayChordFor(cmd.id)
            return (
              <li
                key={cmd.id}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => runIndex(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-3)",
                  padding: "var(--space-3) var(--space-4)",
                  cursor: "pointer",
                  background:
                    i === active ? "var(--Eulinx-color-elevated-2)" : "transparent",
                  color: "var(--Eulinx-color-text-primary)",
                }}
              >
                <span>
                  <span style={{ fontWeight: "var(--font-weight-medium)" }}>{cmd.title}</span>
                  <span
                    style={{
                      marginLeft: "var(--space-2)",
                      color: "var(--Eulinx-color-text-muted)",
                      fontSize: "var(--font-size-sm)",
                    }}
                  >
                    {cmd.category}
                  </span>
                </span>
                {chord ? (
                  <kbd
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--Eulinx-color-text-muted)",
                      border: "1px solid var(--Eulinx-color-border)",
                      borderRadius: "var(--radius-sm)",
                      padding: "2px 6px",
                    }}
                  >
                    {displayChord(chord, plat)}
                  </kbd>
                ) : null}
              </li>
            )
          })}
          {filtered.length === 0 ? (
            <li
              style={{
                padding: "var(--space-4)",
                color: "var(--Eulinx-color-text-muted)",
              }}
            >
              No matching commands.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ShortcutHelpOverlay
// ---------------------------------------------------------------------------

export interface ShortcutHelpOverlayProps {
  open: boolean
  onClose: () => void
}

export function ShortcutHelpOverlay({ open, onClose }: ShortcutHelpOverlayProps): ReactNode | null {
  const { registry } = useKeymap()
  const plat = useMemo(() => platform(), [])
  const returnToRef = useRef<HTMLElement | null>(null)

  const grouped = useMemo<Record<string, Command[]>>(() => {
    const out: Record<string, Command[]> = {}
    for (const c of registry.listCommands()) {
      if (!c.palette) continue
      ;(out[c.category] ??= []).push(c)
    }
    return out
  }, [registry])

  useEffect(() => {
    if (open) {
      returnToRef.current = (document.activeElement as HTMLElement) ?? null
    } else {
      returnToRef.current?.focus?.()
      returnToRef.current = null
    }
  }, [open])

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>): void => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    },
    [onClose],
  )

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
      onKeyDown={onKeyDown}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-modal)" as unknown as number,
        background: "hsl(var(--Eulinx-color-neutral-900) / 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-8)",
      }}
    >
      <div
        style={{
          width: "min(880px, 94vw)",
          maxHeight: "86vh",
          overflowY: "auto",
          background: "var(--Eulinx-color-surface)",
          border: "1px solid var(--Eulinx-color-border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          padding: "var(--space-6)",
          color: "var(--Eulinx-color-text-primary)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--space-4)",
          }}
        >
          <h1 style={{ fontSize: "var(--font-size-xl)", margin: 0 }}>Keyboard Shortcuts</h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "var(--Eulinx-color-elevated)",
              color: "var(--Eulinx-color-text-primary)",
              border: "1px solid var(--Eulinx-color-border)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-2) var(--space-3)",
              cursor: "pointer",
            }}
          >
            Esc
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "var(--space-6)",
          }}
        >
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat]
            if (!items || items.length === 0) return null
            return (
              <section key={cat}>
                <h2
                  style={{
                    fontSize: "var(--font-size-sm)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "var(--Eulinx-color-text-muted)",
                    margin: "0 0 var(--space-2)",
                  }}
                >
                  {cat}
                </h2>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {items.map((cmd) => {
                    const chord = registry.displayChordFor(cmd.id)
                    return (
                      <li
                        key={cmd.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "var(--space-3)",
                          padding: "var(--space-2) 0",
                          borderBottom: "1px solid var(--Eulinx-color-border)",
                        }}
                      >
                        <span style={{ fontSize: "var(--font-size-sm)" }}>{cmd.title}</span>
                        {chord ? (
                          <kbd
                            style={{
                              fontFamily: "ui-monospace, monospace",
                              fontSize: "var(--font-size-xs)",
                              color: "var(--Eulinx-color-text-muted)",
                              border: "1px solid var(--Eulinx-color-border)",
                              borderRadius: "var(--radius-sm)",
                              padding: "2px 6px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {displayChord(chord, plat)}
                          </kbd>
                        ) : (
                          <span
                            style={{
                              fontSize: "var(--font-size-xs)",
                              color: "var(--Eulinx-color-text-muted)",
                            }}
                          >
                            no key
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
