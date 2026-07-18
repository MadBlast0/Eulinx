/**
 * Eulinx Sidebar — virtualized file tree with accessible roving-tabindex
 * keyboard navigation (Sidebar-Part02 §Tree Virtualization / §Keyboard
 * Navigation).
 *
 * The tree is rendered from a FLAT row array. Expansion is tracked in a Set of
 * expanded directory paths; children are loaded lazily via `loadChildren` on
 * first expand only (Sidebar-Part01 §MUST NOT: no recursive prefetch).
 *
 * One tab stop. Roving tabindex: the focused row owns tabIndex=0; all others
 * are -1. Arrow keys move, Right/Left expand/collapse, Enter/Space navigate,
 * Home/End jump, type-ahead filters focus.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import { TREE_INDENT_PER_DEPTH } from "./use-sidebar"
import { VirtualList, type VirtualListHandle } from "./virtual-list"
import type { FileNode, SidebarNavigate } from "./sidebar-data"

/** A flattened render row. */
export interface TreeRow {
  readonly path: string
  readonly name: string
  readonly depth: number
  readonly kind: FileNode["kind"]
  readonly expanded: boolean
  readonly hasChildren: boolean
  readonly loading: boolean
}

export interface FileTreeProps {
  readonly rootNodes: readonly FileNode[]
  readonly loadChildren: (path: string) => Promise<readonly FileNode[]>
  /** Initial expanded paths (the active path's ancestors, e.g.). */
  readonly initialExpanded?: readonly string[]
  /** External filter text (e.g. from the sidebar search entry), merged with local. */
  readonly externalFilter?: string
  readonly onNavigate: SidebarNavigate
  readonly selection: string | null
}

/** Flatten the visible (expanded) portion of the tree into rows. */
function flatten(
  rootNodes: readonly FileNode[],
  childMap: ReadonlyMap<string, readonly FileNode[]>,
  expanded: ReadonlySet<string>,
  loading: ReadonlySet<string>,
): TreeRow[] {
  const rows: TreeRow[] = []
  const visit = (nodes: readonly FileNode[], depth: number): void => {
    for (const node of nodes) {
      const kids = childMap.get(node.path)
      const hasChildren = node.kind !== "file" && (kids !== undefined || node.childCount !== 0)
      const isExpanded = expanded.has(node.path)
      rows.push({
        path: node.path,
        name: node.name,
        depth,
        kind: node.kind,
        expanded: isExpanded,
        hasChildren,
        loading: loading.has(node.path),
      })
      if (isExpanded && kids !== undefined) {
        visit(kids, depth + 1)
      }
    }
  }
  visit(rootNodes, 0)
  return rows
}

export function FileTree({
  rootNodes,
  loadChildren,
  initialExpanded,
  externalFilter = "",
  onNavigate,
  selection,
}: FileTreeProps): React.ReactElement {
  const [childMap, setChildMap] = useState<Map<string, readonly FileNode[]>>(new Map())
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(initialExpanded ?? []),
  )
  const [loading, setLoading] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState("")
  const [focusIndex, setFocusIndex] = useState(0)
  const listRef = useRef<VirtualListHandle>(null)
  const typeahead = useRef<{ buffer: string; at: number }>({ buffer: "", at: 0 })

  const rows = useMemo(() => {
    const base = flatten(rootNodes, childMap, expanded, loading)
    const q = (externalFilter.trim() + " " + filter.trim()).trim().toLowerCase()
    if (q.length === 0) return base
    return base.filter((r) => r.name.toLowerCase().includes(q))
  }, [rootNodes, childMap, expanded, loading, filter, externalFilter])

  useEffect(() => {
    if (focusIndex >= rows.length) setFocusIndex(Math.max(0, rows.length - 1))
  }, [rows.length, focusIndex])

  const ensureChildren = useCallback(
    async (path: string, kind: FileNode["kind"]) => {
      if (kind === "file") return
      if (childMap.has(path) || loading.has(path)) return
      setLoading((prev) => new Set(prev).add(path))
      try {
        const kids = await loadChildren(path)
        setChildMap((prev) => {
          const next = new Map(prev)
          next.set(path, kids)
          return next
        })
      } finally {
        setLoading((prev) => {
          const next = new Set(prev)
          next.delete(path)
          return next
        })
      }
    },
    [childMap, loading, loadChildren],
  )

  const ensureChildrenRef = useRef(ensureChildren)
  ensureChildrenRef.current = ensureChildren

  const toggle = useCallback((row: TreeRow) => {
    if (!row.hasChildren) return
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(row.path)) {
        next.delete(row.path)
      } else {
        next.add(row.path)
        void ensureChildrenRef.current(row.path, row.kind)
      }
      return next
    })
  }, [])

  const focusRow = useCallback((index: number) => {
    const el = listRef.current
    if (!el) return
    const node = el.scrollEl?.querySelector<HTMLElement>(`[data-focus-index="${index}"]`)
    node?.focus()
  }, [])

  const onRowKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number, row: TreeRow) => {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault()
          const next = Math.min(rows.length - 1, index + 1)
          setFocusIndex(next)
          focusRow(next)
          break
        }
        case "ArrowUp": {
          e.preventDefault()
          const next = Math.max(0, index - 1)
          setFocusIndex(next)
          focusRow(next)
          break
        }
        case "Home": {
          e.preventDefault()
          setFocusIndex(0)
          focusRow(0)
          break
        }
        case "End": {
          e.preventDefault()
          const next = rows.length - 1
          setFocusIndex(next)
          focusRow(next)
          break
        }
        case "ArrowRight": {
          e.preventDefault()
          if (row.hasChildren && !row.expanded) {
            toggle(row)
          } else if (row.hasChildren && row.expanded && index + 1 < rows.length) {
            const next = index + 1
            setFocusIndex(next)
            focusRow(next)
          }
          break
        }
        case "ArrowLeft": {
          e.preventDefault()
          if (row.hasChildren && row.expanded) {
            toggle(row)
          } else {
            const parentDepth = row.depth - 1
            let target = index
            for (let i = index - 1; i >= 0; i--) {
              const r = rows[i]
              if (r && r.depth === parentDepth) {
                target = i
                break
              }
            }
            setFocusIndex(target)
            focusRow(target)
          }
          break
        }
        case "Enter":
        case " ": {
          e.preventDefault()
          if (row.hasChildren) {
            toggle(row)
          } else {
            onNavigate({ kind: row.kind === "directory" ? "folder" : "file", id: row.path })
          }
          break
        }
        default: {
          if (e.key.length === 1 && /\S/.test(e.key)) {
            const now = Date.now()
            const ta = typeahead.current
            ta.buffer = now - ta.at > 600 ? e.key : ta.buffer + e.key
            ta.at = now
            const q = ta.buffer.toLowerCase()
            const match = rows.findIndex((r) => r.name.toLowerCase().startsWith(q))
            if (match >= 0) setFocusIndex(match)
          }
        }
      }
    },
    [rows, toggle, onNavigate],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        role="search"
        className="px-2 py-1"
        style={{
          borderBottom: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
        }}
      >
        <input
          type="text"
          aria-label="Filter files"
          placeholder="Filter files…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-transparent px-2 py-1 text-role-caption outline-none"
          style={{ color: token("--Eulinx-color-text-primary") }}
        />
      </div>
      <VirtualList<TreeRow>
        ref={listRef}
        items={rows}
        getKey={(r) => r.path}
        ariaLabel="File explorer"
        role="tree"
        renderRow={(row, index) =>
          row.loading ? (
            <TreeRowSkeleton row={row} focused={index === focusIndex} />
          ) : (
            <TreeRowButton
              row={row}
              focused={index === focusIndex}
              selected={selection === row.path}
              focusIndex={index}
              onToggle={() => toggle(row)}
              onActivate={() =>
                onNavigate({
                  kind: row.kind === "directory" ? "folder" : "file",
                  id: row.path,
                })
              }
              onFocus={() => setFocusIndex(index)}
              onKeyDown={(e) => onRowKeyDown(e, index, row)}
            />
          )
        }
      />
    </div>
  )
}

function TreeRowButton({
  row,
  focused,
  selected,
  focusIndex,
  onToggle,
  onActivate,
  onFocus,
  onKeyDown,
}: {
  row: TreeRow
  focused: boolean
  selected: boolean
  focusIndex: number
  onToggle: () => void
  onActivate: () => void
  onFocus: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}): React.ReactElement {
  const indent = row.depth * TREE_INDENT_PER_DEPTH + 4
  const fileIcon = row.kind === "file" ? "domain.file" : row.kind === "symlink" ? "domain.link" : "domain.folder"

  return (
    <div
      role="treeitem"
      aria-selected={selected}
      aria-expanded={row.hasChildren ? row.expanded : undefined}
      data-focus-index={focusIndex}
      tabIndex={focused ? 0 : -1}
      onClick={() => (row.hasChildren ? onToggle() : onActivate())}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className="flex cursor-pointer items-center gap-1 px-1"
      style={{
        paddingLeft: indent,
        color: selected ? token("--Eulinx-color-accent") : token("--Eulinx-color-text-primary"),
        background: selected ? token("--Eulinx-color-elevated-2") : "transparent",
        outline: "none",
      }}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        {row.hasChildren ? (
          <button
            type="button"
            aria-label={row.expanded ? "Collapse" : "Expand"}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="flex h-4 w-4 items-center justify-center"
          >
            <Icon name={row.expanded ? "nav.chevron.down" : "nav.chevron.right"} size="xs" aria-hidden />
          </button>
        ) : (
          <Icon name={fileIcon} size="xs" aria-hidden />
        )}
      </span>
      <span className="truncate text-role-caption">{row.name}</span>
    </div>
  )
}

function TreeRowSkeleton({
  row,
  focused,
}: {
  row: TreeRow
  focused: boolean
}): React.ReactElement {
  return (
    <div
      role="treeitem"
      aria-busy="true"
      tabIndex={focused ? 0 : -1}
      className="flex items-center gap-1 px-1"
      style={{ paddingLeft: row.depth * TREE_INDENT_PER_DEPTH + 4 }}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        <Icon name="status.loading" size="xs" aria-hidden />
      </span>
      <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
        Loading…
      </span>
    </div>
  )
}
