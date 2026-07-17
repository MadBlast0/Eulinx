import * as React from "react"
import { cn } from "@/utils/cn"
import { FormField } from "@/components/forms/form-field"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronDown, X } from "lucide-react"

export interface MultiSelectOption {
  value: string
  label: string
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  maxItems?: number
  className?: string
}

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
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
      maxItems,
      className,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)

    const selectedOptions = options.filter((o) => value.includes(o.value))
    const canAddMore = maxItems ? value.length < maxItems : true

    const handleSelect = (optionValue: string) => {
      if (value.includes(optionValue)) {
        onChange(value.filter((v) => v !== optionValue))
      } else if (canAddMore) {
        onChange([...value, optionValue])
      }
    }

    const handleRemove = (optionValue: string) => {
      onChange(value.filter((v) => v !== optionValue))
    }

    const handleClear = () => {
      onChange([])
    }

    return (
      <FormField
        label={label}
        error={error}
        required={required}
        disabled={disabled}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild disabled={disabled}>
            <Button
              ref={ref}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "h-auto min-h-9 w-full justify-between px-3 py-1.5 font-normal",
                !value.length && "text-muted-foreground",
                error && "border-destructive focus-visible:ring-destructive",
                className
              )}
            >
              <div className="flex flex-wrap gap-1">
                {selectedOptions.length > 0 ? (
                  selectedOptions.map((option) => (
                    <Badge
                      key={option.value}
                      variant="secondary"
                      size="sm"
                      className="gap-1 pr-1"
                    >
                      {option.label}
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => handleRemove(option.value)}
                        className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                        aria-label={`Remove ${option.label}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => {
                    const isSelected = value.includes(option.value)
                    const isDisabled = !isSelected && !canAddMore
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => handleSelect(option.value)}
                        disabled={isDisabled}
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        {option.label}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
              {value.length > 0 && (
                <div className="border-t p-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </Command>
          </PopoverContent>
        </Popover>
      </FormField>
    )
  }
)
MultiSelect.displayName = "MultiSelect"

export { MultiSelect }
