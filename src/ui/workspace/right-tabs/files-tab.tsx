import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronRight, File, Folder } from "lucide-react"
import { cn } from "@/utils/cn"
import { useProjects } from "../use-projects"
import { fs_read_text, listDir, type FileEntry } from "../fs-client"
import {
  EmptyState,
  SearchField,
  SegmentedControl,
} from "../right-sidebar"
import { ListRow } from "../primitives"

type LoadState = "idle" | "loading" | "loaded" | "error"
type Mode = "names" | "contents"

interface DirNode extends FileEntry {
  readonly depth: number
  readonly children: DirNode[]
  readonly loadState: LoadState
}

function makeNode(entry: FileEntry, depth: number): DirNode {
  return { ...entry, depth, children: [], loadState: "idle" }
}

function sortEntries(entries: readonly FileEntry[]): FileEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  })
}

export function FilesTab() {
  const { activeProject } = useProjects()
  const [mode, setMode] = useState<Mode>("names")
  const [query, setQuery] = useState("")
  const [tree, setTree] = useState<readonly DirNode[]>([])
  const [rootLoading, setRootLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())

  const rootPath = activeProject?.path ?? ""
  const noProject = !activeProject || !rootPath

  const loadChildren = useCallback(
    async (node: DirNode, path: string, depth: number) => {
      const entries = await listDir(path)
      const sorted = sortEntries(entries)
      const children = sorted.map((e) => makeNode(e, depth + 1))
      setTree((prev) => {
        const replace = (nodes: readonly DirNode[]): DirNode[] =>
          nodes.map((n) => {
            if (n.path === node.path) {
              return { ...n, children, loadState: "loaded" }
            }
            return { ...n, children: replace(n.children) }
          })
        return replace(prev)
      })
    },
    [],
  )

  useEffect(() => {
    if (!rootPath) {
      setTree([])
      setExpanded(new Set())
      return
    }
    let cancelled = false
    setRootLoading(true)
    void (async () => {
      try {
        const entries = await listDir(rootPath)
        if (cancelled) return
        setTree(sortEntries(entries).map((e) => makeNode(e, 0)))
      } finally {
        if (!cancelled) setRootLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [rootPath])

  const toggle = useCallback(
    (node: DirNode) => {
      setExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(node.path)) {
          next.delete(node.path)
        } else {
          next.add(node.path)
          if (node.isDir && node.loadState === "idle") {
            setTree((prevTree) =>
              prevTree.map((n) =>
                n.path === node.path ? { ...n, loadState: "loading" } : n,
              ),
            )
            void loadChildren(node, node.path, node.depth).catch(() => {
              setTree((prevTree) =>
                prevTree.map((n) =>
                  n.path === node.path ? { ...n, loadState: "error" } : n,
                ),
              )
            })
          }
        }
        return next
      })
    },
    [loadChildren],
  )

  const onFileClick = useCallback(
    async (node: DirNode) => {
      if (mode !== "contents") return
      try {
        const text = await fs_read_text(node.path)
        setPreview(text.length > 4000 ? `${text.slice(0, 4000)}\n…` : text)
      } catch {
        setPreview(`Unable to preview ${node.name}`)
      }
    },
    [mode],
  )

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return (node: DirNode): boolean => node.name.toLowerCase().includes(q)
  }, [query])

  // ── Tree renderer ──

  const renderNodes = (nodes: readonly DirNode[]): React.ReactNode => {
    return nodes.map((node) => {
      if (matches && !matches(node)) return null
      const isOpen = expanded.has(node.path)
      const isFolder = node.isDir
      const pad = 8 + node.depth * 14

      const children = isFolder && isOpen ? renderNodes(node.children) : null

      return (
        <div key={node.path}>
          <ListRow
            role="button"
            tabIndex={0}
            active={preview !== null}
            onClick={() => (isFolder ? toggle(node) : void onFileClick(node))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                if (isFolder) toggle(node)
                else void onFileClick(node)
              }
            }}
            className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--Eulinx-color-ring)]"
            style={{ paddingLeft: pad }}
          >
            {isFolder ? (
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0 text-[color:var(--Eulinx-color-text-muted)] transition-transform duration-150",
                  isOpen && "rotate-90",
                )}
                strokeWidth={1.5}
              />
            ) : (
              <span className="h-3 w-3 shrink-0" />
            )}
            {isFolder ? (
              <Folder className="h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
            ) : (
              <File className="h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
            )}
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-xs">
              {node.name}
            </span>
            {node.loadState === "loading" && (
              <span className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">…</span>
            )}
            {!isFolder && node.size !== undefined && (
              <span className="text-[10px] tabular-nums text-[color:var(--Eulinx-color-text-muted)]">
                {node.size >= 1024
                  ? `${(node.size / 1024).toFixed(1)}k`
                  : `${node.size}b`}
              </span>
            )}
          </ListRow>
          {isFolder && node.loadState === "loaded" && node.children.length === 0 && isOpen && (
            <div
              className="py-0.5 text-[11px] text-[color:var(--Eulinx-color-text-muted)]"
              style={{ paddingLeft: 8 + (node.depth + 1) * 14 }}
            >
              empty folder
            </div>
          )}
          {children}
        </div>
      )
    })
  }

  // ── Empty state ──

  if (noProject) {
    return (
      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
          </svg>
        }
        title="No project open"
        description="Add a project folder to browse files."
      />
    )
  }

  // ── Main render ──

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Path breadcrumb */}
      <div className="truncate px-3 pb-1 pt-2 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
        {rootPath}
      </div>

      {/* Search + mode toggle */}
      <div className="flex items-center gap-2 px-3 pb-2">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Find files"
          className="flex-1"
        />
        <SegmentedControl
          value={mode}
          options={[
            { value: "names", label: "Names" },
            { value: "contents", label: "Contents" },
          ]}
          onChange={setMode}
        />
      </div>

      {/* Content */}
      {mode === "contents" && preview !== null ? (
        <div className="flex-1 overflow-auto px-3 py-2">
          <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-[color:var(--Eulinx-color-text-secondary)]">
            {preview}
          </pre>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-1.5 py-0.5">
          {rootLoading ? (
            <div className="px-3 py-2 text-xs text-[color:var(--Eulinx-color-text-muted)]">Loading…</div>
          ) : (
            renderNodes(tree)
          )}
        </div>
      )}
    </div>
  )
}
