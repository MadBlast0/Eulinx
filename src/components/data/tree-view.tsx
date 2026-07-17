import * as React from "react"
import { ChevronRight, File, Folder } from "lucide-react"
import { cn } from "@/utils/cn"

interface TreeNodeData {
  id: string
  label: string
  icon?: React.ReactNode
  children?: TreeNodeData[]
  disabled?: boolean
}

interface TreeViewContextValue {
  onSelect?: (node: TreeNodeData) => void
  selectedId: string | null
  expandedIds: Set<string>
  toggleExpanded: (id: string) => void
  selectNode: (node: TreeNodeData) => void
}

const TreeViewContext = React.createContext<TreeViewContextValue | null>(null)

function useTreeViewContext() {
  const ctx = React.useContext(TreeViewContext)
  if (!ctx)
    throw new Error("TreeNode must be used within <TreeView>")
  return ctx
}

interface TreeViewProps {
  data: TreeNodeData[]
  onSelect?: (node: TreeNodeData) => void
  defaultExpandedIds?: string[]
  className?: string
}

const TreeView = React.forwardRef<HTMLUListElement, TreeViewProps>(
  ({ data, onSelect, defaultExpandedIds = [], className }, ref) => {
    const [selectedId, setSelectedId] = React.useState<string | null>(null)
    const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
      () => new Set(defaultExpandedIds)
    )

    const toggleExpanded = React.useCallback((id: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    }, [])

    const selectNode = React.useCallback(
      (node: TreeNodeData) => {
        if (node.disabled) return
        setSelectedId(node.id)
        onSelect?.(node)
      },
      [onSelect]
    )

    return (
      <TreeViewContext.Provider
        value={{
          onSelect,
          selectedId,
          expandedIds,
          toggleExpanded,
          selectNode,
        }}
      >
        <ul
          ref={ref}
          role="tree"
          className={cn("m-0 list-none p-0", className)}
        >
          {data.map((node) => (
            <TreeNodeItem key={node.id} node={node} depth={0} />
          ))}
        </ul>
      </TreeViewContext.Provider>
    )
  }
)
TreeView.displayName = "TreeView"

interface TreeNodeItemProps {
  node: TreeNodeData
  depth: number
}

const TreeNodeItem = React.memo(function TreeNodeItem({
  node,
  depth,
}: TreeNodeItemProps) {
  const { expandedIds, toggleExpanded, selectNode, selectedId } =
    useTreeViewContext()
  const hasChildren = node.children && node.children.length > 0
  const expanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const nodeRef = React.useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" && hasChildren && !expanded) {
      e.preventDefault()
      toggleExpanded(node.id)
    } else if (e.key === "ArrowLeft" && hasChildren && expanded) {
      e.preventDefault()
      toggleExpanded(node.id)
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      selectNode(node)
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      const dir = e.key === "ArrowDown" ? 1 : -1
      const siblings = getSiblings(nodeRef.current)
      const idx = siblings.indexOf(nodeRef.current as HTMLElement)
      const next = siblings[idx + dir] as HTMLElement | undefined
      next?.focus()
    }
  }

  const defaultIcon = hasChildren ? (
    <Folder className="h-4 w-4 text-muted-foreground" />
  ) : (
    <File className="h-4 w-4 text-muted-foreground" />
  )

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
      <div
        ref={nodeRef}
        role="button"
        tabIndex={0}
        className={cn(
          "flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring",
          isSelected && "bg-accent text-accent-foreground",
          node.disabled && "pointer-events-none opacity-50"
        )}
        style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
        onClick={() => {
          if (hasChildren) toggleExpanded(node.id)
          selectNode(node)
        }}
        onKeyDown={handleKeyDown}
      >
        {hasChildren && (
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
              expanded && "rotate-90"
            )}
          />
        )}
        {hasChildren ? null : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className="flex items-center gap-1.5">
          {node.icon ?? defaultIcon}
          {node.label}
        </span>
      </div>
      {hasChildren && expanded && (
        <ul role="group" className="m-0 list-none p-0">
          {(node.children as TreeNodeData[]).map((child) => (
            <TreeNodeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
})

function getSiblings(el: HTMLElement | null): HTMLElement[] {
  if (!el?.parentElement) return []
  return Array.from(
    el.parentElement.querySelectorAll<HTMLElement>(
      'div[role="button"]'
    )
  )
}

export { TreeView, TreeNodeItem as TreeNode }
export type { TreeNodeData }
