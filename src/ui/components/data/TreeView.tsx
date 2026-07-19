/**
 * TreeView — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { type ReactNode, useState, useEffect, type KeyboardEvent } from "react";
import { cn } from "@/utils/cn";
import { ChevronRight, Folder, File } from "lucide-react";

export interface TreeNode<T = unknown> {
  id: string;
  label: string;
  children?: TreeNode<T>[];
  data?: T;
  disabled?: boolean;
  icon?: ReactNode;
}

interface TreeViewProps {
  items: TreeNode[];
  onSelect?: (node: TreeNode) => void;
  onExpand?: (node: TreeNode, expanded: boolean) => void;
  defaultExpanded?: string[];
  selectedId?: string;
  className?: string;
}

function TreeItem<T>({
  node,
  depth = 0,
  onSelect,
  onExpand,
  expandedIds,
  selectedId,
}: {
  node: TreeNode<T>;
  depth?: number;
  onSelect?: (node: TreeNode<T>) => void;
  onExpand?: (node: TreeNode<T>, expanded: boolean) => void;
  expandedIds: Set<string>;
  selectedId?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(() => expandedIds.has(node.id));
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  useEffect(() => {
    setIsExpanded(expandedIds.has(node.id));
  }, [expandedIds, node.id]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.disabled) return;
    if (hasChildren) {
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      onExpand?.(node, newExpanded);
    } else {
      onSelect?.(node);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (node.disabled) return;
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (hasChildren) {
          const newExpanded = !isExpanded;
          setIsExpanded(newExpanded);
          onExpand?.(node, newExpanded);
        } else {
          onSelect?.(node);
        }
        break;
      case "ArrowRight":
        if (hasChildren && !isExpanded) {
          e.preventDefault();
          setIsExpanded(true);
          onExpand?.(node, true);
        }
        break;
      case "ArrowLeft":
        if (hasChildren && isExpanded) {
          e.preventDefault();
          setIsExpanded(false);
          onExpand?.(node, false);
        }
        break;
    }
  };

  return (
    <div>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-disabled={node.disabled}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center gap-2",
          "px-2 py-1.5 rounded-[var(--Eulinx-radius-sm)]",
          "transition-colors duration-[var(--Eulinx-duration-hover)]",
          "focus)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--Eulinx-color-ring)] focus-visible:ring-offset-2",
          isSelected && "bg-[var(--Eulinx-color-selected)] text-[var(--Eulinx-color-text)]",
          !isSelected && "hover:bg-[var(--Eulinx-color-hover)]",
          node.disabled && "opacity-50 pointer-events-none",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const newExpanded = !isExpanded;
              setIsExpanded(newExpanded);
              onExpand?.(node, newExpanded);
            }}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded",
              "text-[var(--Eulinx-color-text-muted)]",
              "hover:text-[var(--Eulinx-color-text)] hover:bg-[var(--Eulinx-color-hover)]",
              "transition-transform duration-[var(--Eulinx-duration-hover)]",
              isExpanded && "rotate-90",
            )}
            aria-label={isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
        {node.icon || (hasChildren ? <Folder className="h-4 w-4" /> : <File className="h-4 w-4" />)}
        <span className="truncate text-sm">{node.label}</span>
      </div>
      {hasChildren && isExpanded && (
        <div role="group" aria-label={`${node.label} children`}>
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              onExpand={onExpand}
              expandedIds={expandedIds}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeView({ items, onSelect, onExpand, defaultExpanded = [], selectedId, className }: TreeViewProps) {
  const expandedIds = new Set(defaultExpanded);

  return (
    <div role="tree" className={cn("bg-[var(--Eulinx-color-surface)] rounded-[var(--Eulinx-radius-lg)] border border-[var(--Eulinx-color-border)] overflow-hidden", className)}>
      {items.map((item) => (
        <TreeItem
          key={item.id}
          node={item}
          onSelect={onSelect}
          onExpand={onExpand}
          expandedIds={expandedIds}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}