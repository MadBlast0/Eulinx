import { useEffect, useMemo, useRef, useState } from "react"
import { X, Keyboard } from "lucide-react"
import { AppIcon } from "../app-icon"
import { cn } from "@/utils/cn"
import type { Command, CommandCategory } from "./keymap-types"
import { displayChordSeq, detectPlatform } from "./chord"
import { useKeymap } from "./use-keyboard"

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[var(--Eulinx-radius-xs)] border border-[color:var(--Eulinx-color-border)] border-b-2 bg-[color:var(--Eulinx-color-surface)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
      {children}
    </kbd>
  )
}

/* ----------------------------------------------------------------------- */
/* Command palette (registry-driven, focus-trapped)                        */
/* ----------------------------------------------------------------------- */

interface CommandPaletteProps {
  readonly onClose: () => void
}

const CATEGORY_ORDER: readonly CommandCategory[] = [
  "application",
  "navigation",
  "view",
  "graph",
  "terminal",
  "workers",
  "workflow",
  "search",
  "merge",
]

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const { registry } = useKeymap()
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLButtonElement>(null)

  const commands = useMemo(() => registry.listCommands(), [registry])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    )
  }, [commands, query])

  const grouped = useMemo(() => {
    const byCat = new Map<CommandCategory, Command[]>()
    for (const cmd of filtered) {
      const list = byCat.get(cmd.category) ?? []
      list.push(cmd)
      byCat.set(cmd.category, list)
    }
    const groups: { category: CommandCategory; items: Command[] }[] = []
    for (const cat of CATEGORY_ORDER) {
      const items = byCat.get(cat)
      if (items && items.length > 0) {
        groups.push({ category: cat, items })
      }
    }
    for (const [cat, items] of byCat) {
      if (!CATEGORY_ORDER.includes(cat)) {
        groups.push({ category: cat, items })
      }
    }
    return groups
  }, [filtered])

  const flatItems = useMemo(() => {
    return grouped.flatMap((g) => g.items)
  }, [grouped])

  const activeCommand = flatItems[activeIndex]

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const run = (command: Command) => {
    const handler = registry.getCommandHandler(command.id)
    if (handler) handler()
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const max = flatItems.length - 1
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => (i < max ? i + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => (i > 0 ? i - 1 : max))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeCommand) run(activeCommand)
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const activeId = activeCommand ? `cp-option-${activeCommand.id}` : undefined

  return (
    <div
      className="fixed inset-0 z-[var(--Eulinx-z-modal)] flex items-start justify-center bg-[color:color-mix(in_srgb,var(--Eulinx-color-background)_55%,transparent)] pt-[14vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-[560px] max-w-[92vw] animate-[pal-in_160ms_ease] overflow-hidden border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] shadow-[var(--Eulinx-elev-xl)] rounded-[var(--Eulinx-radius-xl)]"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2.5 border-b border-[color:var(--Eulinx-color-border)] px-4 py-3.5">
          <AppIcon name="search" className="h-4 w-4 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2.25} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes, run commands…"
            className="h-5 flex-1 bg-transparent text-[14px] text-[color:var(--Eulinx-color-text)] outline-none placeholder:text-[color:var(--Eulinx-color-text-muted)]"
            aria-label="Command query"
            aria-autocomplete="list"
            aria-controls="cp-listbox"
            aria-activedescendant={activeId}
            role="combobox"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div
          ref={listRef}
          id="cp-listbox"
          role="listbox"
          aria-label="Commands"
          tabIndex={-1}
          className="max-h-[340px] overflow-y-auto p-1.5 outline-none"
          onMouseDown={(e) => {
            e.preventDefault()
            inputRef.current?.focus()
          }}
        >
          {flatItems.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12.5px] text-[color:var(--Eulinx-color-text-muted)]">
              {query ? <>No commands matching "<span className="font-medium text-[color:var(--Eulinx-color-text-secondary)]">{query}</span>"</> : "No commands available."}
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.category} role="group" aria-labelledby={`cp-cat-${group.category}`}>
                <div
                  id={`cp-cat-${group.category}`}
                  className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]"
                >
                  {group.category}
                </div>
                {group.items.map((cmd) => {
                  const globalIndex = flatItems.indexOf(cmd)
                  const isActive = globalIndex === activeIndex
                  return (
                    <button
                      key={cmd.id}
                      ref={isActive ? activeItemRef : undefined}
                      id={`cp-option-${cmd.id}`}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      aria-selected={isActive}
                      data-index={globalIndex}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      onMouseDown={(e) => { e.preventDefault(); inputRef.current?.focus() }}
                      onClick={() => run(cmd)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-[var(--Eulinx-radius-md)] px-2.5 py-2 text-left text-[13px] transition-colors",
                        isActive
                          ? "bg-[color:var(--Eulinx-color-selected)] text-[color:var(--Eulinx-color-text)] font-medium shadow-[inset_3px_0_0_var(--Eulinx-color-accent)]"
                          : "text-[color:var(--Eulinx-color-text-secondary)] hover:bg-[color:var(--Eulinx-color-hover)]",
                      )}
                    >
                      <span className="truncate">{cmd.title}</span>
                      <span
                        className="shrink-0 font-mono text-[11px] text-[color:var(--Eulinx-color-text-muted)]"
                      >
                        {displayChordFor(cmd.id, registry)}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* Shortcut help overlay (registry-driven, grouped by category)            */
/* ----------------------------------------------------------------------- */

const SHORTCUT_CATEGORY_ORDER: readonly CommandCategory[] = [
  "application",
  "navigation",
  "view",
  "graph",
  "terminal",
  "workers",
  "workflow",
  "search",
  "merge",
]

export function ShortcutHelpOverlay({ onClose }: { onClose: () => void }) {
  const { registry } = useKeymap()
  const platform = detectPlatform()

  const groups = useMemo(() => {
    const bindings = registry.listBindings()
    const byCat = new Map<CommandCategory, { label: string; keys: string }[]>()
    for (const b of bindings) {
      const command = registry.getCommand(b.command)
      if (!command) continue
      const list = byCat.get(command.category) ?? []
      list.push({ label: command.title, keys: displayChordSeq(b.chord, platform) })
      byCat.set(command.category, list)
    }
    return SHORTCUT_CATEGORY_ORDER.filter((c) => byCat.has(c)).map((c) => ({
      title: c.charAt(0).toUpperCase() + c.slice(1),
      rows: byCat.get(c) ?? [],
    }))
  }, [registry, platform])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[var(--Eulinx-z-modal)] flex items-center justify-center bg-[color:color-mix(in_srgb,var(--Eulinx-color-background)_50%,transparent)]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="max-h-[70vh] w-[600px] max-w-[92vw] overflow-hidden border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] shadow-[var(--Eulinx-elev-lg)] rounded-[var(--Eulinx-radius-lg)]"
      >
        <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] p-4">
          <h2 className="text-base font-semibold text-[color:var(--Eulinx-color-text)] flex items-center gap-2">
            <Keyboard className="h-4 w-4" strokeWidth={2.25} />
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            aria-label="Close"
            title="Close"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        </div>
        <div className="max-h-[calc(70vh-60px)] overflow-y-auto p-4">
          {groups.map((group) => (
            <div key={group.title} className="mb-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--Eulinx-color-text-muted)]">
                {group.title}
              </div>
              {group.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2 text-xs text-[color:var(--Eulinx-color-text-secondary)]"
                >
                  <span>{row.label}</span>
                  <Kbd>{row.keys}</Kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* Helper: resolve a command's first binding into a display chord          */
/* ----------------------------------------------------------------------- */

export function displayChordFor(
  commandId: string,
  registry: { bindingsForCommand: (id: string) => { chord: string }[] },
): string {
  const bindings = registry.bindingsForCommand(commandId)
  const first = bindings[0]
  if (!first) return ""
  return displayChordSeq(first.chord, detectPlatform())
}
