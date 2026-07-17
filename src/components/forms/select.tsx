import * as React from "react"
import { cn } from "@/utils/cn"
import {
  Select as SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { FormField } from "@/components/forms/form-field"
import { Search } from "lucide-react"

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
  searchable?: boolean
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = "Select...",
      label,
      error,
      required,
      disabled,
      className,
      searchable = false,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    const filteredOptions = searchable
      ? options.filter((o) =>
          o.label.toLowerCase().includes(search.toLowerCase())
        )
      : options

    const handleOpenChange = (open: boolean) => {
      setOpen(open)
      if (!open) setSearch("")
    }

    if (searchable) {
      return (
        <FormField
          label={label}
          error={error}
          required={required}
          disabled={disabled}
        >
          <SelectRoot
            open={open}
            onOpenChange={handleOpenChange}
            value={value}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger
              ref={ref}
              className={cn(error && "border-destructive focus-visible:ring-destructive", className)}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <div
                className="flex items-center border-b px-3 pb-1"
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="flex h-8 w-full bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </SelectRoot>
        </FormField>
      )
    }

    return (
      <FormField
        label={label}
        error={error}
        required={required}
        disabled={disabled}
      >
        <SelectRoot
          value={value}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger
            ref={ref}
            className={cn(error && "border-destructive focus-visible:ring-destructive", className)}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
      </FormField>
    )
  }
)
Select.displayName = "Select"

export { Select }
