/**
 * CommandPalette — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { Fragment, useRef, useEffect, useState, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";
import { Search, Keyboard } from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon?: ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}

interface CommandGroup {
  label?: string;
  items: CommandItem[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CommandGroup[];
  placeholder?: string;
  className?: string;
}

export function CommandPalette({ open, onOpenChange, groups, placeholder = "Search commands...", className }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const flatItems = useMemo(
    () =>
      groups.flatMap((group, groupIndex) =>
        group.items.map((item, itemIndex) => ({ ...item, groupIndex, itemIndex })),
      ),
    [groups],
  );

  const filteredItems = useMemo(
    () =>
      flatItems.filter((item) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.shortcut?.toLowerCase().includes(q)
        );
      }),
    [flatItems, query],
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        onOpenChange(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = filteredItems[selectedIndex];
        if (item && !item.disabled) {
          item.onSelect();
          onOpenChange(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredItems, selectedIndex, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <Fragment>
      <div
        className="fixed inset-0 z-[var(--Eulinx-z-modal)] bg-black/30 animate-in fade-in duration-[var(--Eulinx-duration-dialog)]"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          "fixed left-1/2 top-1/4 z-[calc(var(--Eulinx-z-modal)+1)] w-full max-w-2xl -translate-x-1/2",
          "rounded-[var(--Eulinx-radius-lg)]",
          "bg-[var(--Eulinx-color-surface)]",
          "border border-[var(--Eulinx-color-border)]",
          "shadow-[var(--Eulinx-elev-xl)]",
          "animate-in zoom-in-95 fade-in duration-[var(--Eulinx-duration-dialog)]",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 p-4 border-b border-[var(--Eulinx-color-border)]">
          <Search className="h-5 w-5 text-[var(--Eulinx-color-text-muted)] flex-shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={placeholder}
            className={cn(
              "flex-1 bg-transparent border-none outline-none text-sm",
              "text-[var(--Eulinx-color-text)]",
              "placeholder:text-[var(--Eulinx-color-text-muted)]",
            )}
            aria-label="Search commands"
            autoComplete="off"
          />
          <kbd className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--Eulinx-color-text-muted)] bg-[var(--Eulinx-color-hover)]">
            <Keyboard className="h-3 w-3" aria-hidden="true" />
            <span>⌘K</span>
          </kbd>
        </div>
        <ul
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto p-2"
          role="listbox"
          aria-label="Commands"
        >
          {filteredItems.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-[var(--Eulinx-color-text-muted)]">
              No commands found
            </li>
          ) : (
            filteredItems.map((item, index) => (
              <li
                key={item.id}
                role="option"
                aria-selected={index === selectedIndex}
                aria-disabled={item.disabled}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-[var(--Eulinx-radius-md)]",
                  "text-sm",
                  "transition-colors duration-[var(--Eulinx-duration-hover)]",
                  index === selectedIndex
                    ? "bg-[var(--Eulinx-color-hover)] text-[var(--Eulinx-color-text)]"
                    : "text-[var(--Eulinx-color-text-secondary)] hover:bg-[var(--Eulinx-color-hover)]",
                  item.disabled && "opacity-50 pointer-events-none",
                )}
                onClick={() => {
                  if (!item.disabled) {
                    item.onSelect();
                    onOpenChange(false);
                  }
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {item.icon && <span className="flex-shrink-0 h-5 w-5">{item.icon}</span>}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.label}</div>
                  {item.description && <div className="text-xs text-[var(--Eulinx-color-text-muted)] truncate">{item.description}</div>}
                </div>
                {item.shortcut && (
                  <kbd className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-[var(--Eulinx-color-text-muted)] bg-[var(--Eulinx-color-surface-alt)]">
                    {item.shortcut}
                  </kbd>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </Fragment>,
    document.body,
  );
}