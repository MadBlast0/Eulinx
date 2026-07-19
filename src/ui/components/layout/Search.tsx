/**
 * Search — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { useRef, useState, useEffect, useCallback, type ReactNode, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";
import { Search as SearchIcon, X, Loader2 } from "lucide-react";

interface SearchResult {
  id: string;
  label: string;
  description?: string;
  onSelect: () => void;
  icon?: ReactNode;
}

interface SearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => Promise<SearchResult[]> | SearchResult[];
  onSelect?: (result: SearchResult) => void;
  debounceMs?: number;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function SearchInput({
  placeholder = "Search...",
  value: controlledValue,
  onChange,
  onSearch,
  onSelect,
  debounceMs = 200,
  className,
  disabled = false,
  loading = false,
}: SearchProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (!isControlled) setUncontrolledValue(newValue);
      onChange?.(newValue);

      setSelectedIndex(-1);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (newValue.trim() && onSearch) {
        setIsLoading(true);
        debounceRef.current = setTimeout(async () => {
          try {
            const searchResults = await Promise.resolve(onSearch(newValue));
            setResults(searchResults);
            setOpen(searchResults.length > 0);
          } finally {
            setIsLoading(false);
          }
        }, debounceMs);
      } else {
        setResults([]);
        setOpen(false);
      }
    },
    [onChange, onSearch, debounceMs, isControlled],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        setOpen(true);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        const result = results[selectedIndex];
        if (result) {
          result.onSelect();
          onSelect?.(result);
          setOpen(false);
          if (!isControlled) setUncontrolledValue("");
          else onChange?.("");
        }
      } else if (e.key === "Tab") {
        setOpen(false);
      }
    },
    [results, selectedIndex, onSelect, onChange, isControlled],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && selectedIndex >= 0) {
      const item = listRef.current?.children[selectedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, open]);

  const handleFocus = () => {
    if (value.trim() && results.length > 0) setOpen(true);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--Eulinx-color-text-muted)] pointer-events-none" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full h-9 pl-9 pr-10",
            "rounded-[var(--Eulinx-radius-md)]",
            "bg-[var(--Eulinx-color-surface)]",
            "border border-[var(--Eulinx-color-border)]",
            "text-sm text-[var(--Eulinx-color-text)]",
            "placeholder:text-[var(--Eulinx-color-text-muted)]",
            "transition-[border-color,box-shadow] duration-[var(--Eulinx-duration-hover)]",
            "outline-none",
            "focus-visible:ring-2 focus-visible:ring-[var(--Eulinx-color-ring)] focus-visible:ring-offset-2",
            "hover:border-[var(--Eulinx-color-border-strong)]",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={open}
          aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
          role="combobox"
        />
        {loading || isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--Eulinx-color-text-muted)]" aria-hidden="true" />
        ) : value ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isControlled) setUncontrolledValue("");
              onChange?.("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--Eulinx-color-hover)] text-[var(--Eulinx-color-text-muted)] transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open && results.length > 0 && (
        createPortal(
          <ul
            ref={listRef}
            id="search-results"
            role="listbox"
            className={cn(
              "fixed z-[var(--Eulinx-z-popover)] mt-1 w-full max-h-60",
              "rounded-[var(--Eulinx-radius-md)]",
              "bg-[var(--Eulinx-color-surface)]",
              "border border-[var(--Eulinx-color-border)]",
              "shadow-[var(--Eulinx-elev-lg)]",
              "overflow-y-auto",
              "animate-in fade-in-0 zoom-in-95 duration-[var(--Eulinx-duration-card)]",
            )}
          >
            {results.map((result, index) => (
              <li
                key={result.id}
                id={`search-result-${index}`}
                role="option"
                aria-selected={index === selectedIndex}
                className={cn(
                  "flex items-center gap-3 px-3 py-2",
                  "text-sm",
                  "transition-colors duration-[var(--Eulinx-duration-hover)]",
                  index === selectedIndex
                    ? "bg-[var(--Eulinx-color-hover)] text-[var(--Eulinx-color-text)]"
                    : "text-[var(--Eulinx-color-text-secondary)] hover:bg-[var(--Eulinx-color-hover)]",
                )}
                onClick={() => {
                  result.onSelect();
                  onSelect?.(result);
                  setOpen(false);
                  if (!isControlled) setUncontrolledValue("");
                  else onChange?.("");
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {result.icon && <span className="flex-shrink-0 h-5 w-5">{result.icon}</span>}
                <div className="min-w-0">
                  <div className="font-medium truncate">{result.label}</div>
                  {result.description && <div className="text-xs text-[var(--Eulinx-color-text-muted)] truncate">{result.description}</div>}
                </div>
              </li>
            ))}
          </ul>,
          document.body,
        )
      )}
    </div>
  );
}