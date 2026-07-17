import * as React from "react"
import { cn } from "@/utils/cn"
import { useDevice } from "@/hooks/useDevice"
import { FormField } from "@/components/forms/form-field"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

export interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  label?: string
  error?: string
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  className?: string
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      label,
      error,
      minDate,
      maxDate,
      disabled,
      className,
    },
    _
  ) => {
    const { isTouch } = useDevice()
    const [open, setOpen] = React.useState(false)
    const [viewDate, setViewDate] = React.useState(value ?? new Date())

    React.useEffect(() => {
      if (value) setViewDate(value)
    }, [value])

    if (isTouch) {
      const dateStr = value ? value.toISOString().split("T")[0] : ""
      return (
        <FormField
          label={label}
          error={error}
          disabled={disabled}
        >
          <input
            type="date"
            value={dateStr}
            min={minDate?.toISOString().split("T")[0]}
            max={maxDate?.toISOString().split("T")[0]}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value
              onChange(val ? new Date(val + "T00:00:00") : undefined)
            }}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
          />
        </FormField>
      )
    }

    const handlePrevMonth = () => {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
    }

    const handleNextMonth = () => {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
    }

    const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth())
    const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth())
    const today = new Date()

    const handleSelectDay = (day: number) => {
      const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
      onChange(selected)
      setOpen(false)
    }

    const canGoPrev = minDate
      ? new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1) >= new Date(minDate.getFullYear(), minDate.getMonth(), 1)
      : true

    const canGoNext = maxDate
      ? new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0) <= maxDate
      : true

    const isDayDisabled = (day: number): boolean => {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
      date.setHours(0, 0, 0, 0)
      if (minDate && date < minDate) return true
      if (maxDate && date > maxDate) return true
      return false
    }

    return (
      <FormField
        label={label}
        error={error}
        disabled={disabled}
        className={className}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild disabled={disabled}>
            <Button
              variant="outline"
              role="combobox"
              aria-label="Pick a date"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground",
                error && "border-destructive"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? formatDate(value) : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={!canGoPrev}
                  className="p-1 hover:bg-accent rounded-md transition-colors disabled:opacity-30"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-sm font-medium">
                  {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={!canGoNext}
                  className="p-1 hover:bg-accent rounded-md transition-colors disabled:opacity-30"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="flex h-7 w-7 items-center justify-center text-xs text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-7 w-7" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                  (day) => {
                    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
                    const isSelected = value ? isSameDay(date, value) : false
                    const isToday = isSameDay(date, today)
                    const disabled = isDayDisabled(day)

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleSelectDay(day)}
                        disabled={disabled}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md text-sm transition-colors",
                          isSelected && "bg-primary text-primary-foreground",
                          !isSelected && !disabled && "hover:bg-accent",
                          isToday && !isSelected && "border border-primary/50",
                          disabled && "opacity-30 cursor-not-allowed"
                        )}
                      >
                        {day}
                      </button>
                    )
                  }
                )}
              </div>

              {value && (
                <div className="border-t pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      onChange(undefined)
                      setOpen(false)
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </FormField>
    )
  }
)
DatePicker.displayName = "DatePicker"

export { DatePicker }
