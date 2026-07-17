import * as React from "react"
import { cn } from "@/utils/cn"
import { useDebounce } from "@/hooks/useDebounce"
import { Search, X } from "lucide-react"

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onSubmit?: (value: string) => void
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, placeholder = "Search...", className, onSubmit }, ref) => {
    const [localValue, setLocalValue] = React.useState(value)
    const debouncedValue = useDebounce(localValue, 300)

    React.useEffect(() => {
      onChange(debouncedValue)
    }, [debouncedValue]) // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
      setLocalValue(value)
    }, [value])

    const handleClear = () => {
      setLocalValue("")
      onChange("")
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        handleClear()
      }
      if (e.key === "Enter" && onSubmit) {
        onSubmit(localValue)
      }
    }

    return (
      <div className={cn("relative flex items-center", className)}>
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={ref}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-9 py-1 text-sm shadow-sm transition-colors",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
SearchInput.displayName = "SearchInput"

export { SearchInput }
