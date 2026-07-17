import * as React from "react"
import { cn } from "@/utils/cn"
import { useDevice } from "@/hooks/useDevice"
import { FormField } from "@/components/forms/form-field"
import {
  Select as SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

export interface TimePickerProps {
  value?: string
  onChange: (time: string) => void
  label?: string
  error?: string
  minTime?: string
  maxTime?: string
  disabled?: boolean
  className?: string
  useNativeOnMobile?: boolean
}

function parseTime(time: string): { hours: number; minutes: number } | null {
  const match = time.match(/^(\d{2}):(\d{2})$/)
  if (!match) return null
  const hours = match[1]
  const minutes = match[2]
  if (!hours || !minutes) return null
  return { hours: parseInt(hours, 10), minutes: parseInt(minutes, 10) }
}

function isTimeInRange(
  time: string,
  minTime?: string,
  maxTime?: string
): boolean {
  if (!minTime && !maxTime) return true
  const parsed = parseTime(time)
  if (!parsed) return false
  const total = parsed.hours * 60 + parsed.minutes

  if (minTime) {
    const min = parseTime(minTime)
    if (min && total < min.hours * 60 + min.minutes) return false
  }
  if (maxTime) {
    const max = parseTime(maxTime)
    if (max && total > max.hours * 60 + max.minutes) return false
  }
  return true
}

function parseTimeSafe(time: string | undefined): { hours: number; minutes: number } | null {
  if (!time) return null
  return parseTime(time)
}

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
)
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0")
)

const TimePicker = React.forwardRef<HTMLDivElement, TimePickerProps>(
  (
    {
      value,
      onChange,
      label,
      error,
      minTime,
      maxTime,
      disabled,
      className,
      useNativeOnMobile = true,
    },
    _
  ) => {
    const { isTouch } = useDevice()
    const parsed = parseTimeSafe(value)

    const [selectedHours, setSelectedHours] = React.useState(
      parsed ? String(parsed.hours).padStart(2, "0") : ""
    )
    const [selectedMinutes, setSelectedMinutes] = React.useState(
      parsed ? String(parsed.minutes).padStart(2, "0") : ""
    )

    React.useEffect(() => {
      if (parsed) {
        setSelectedHours(String(parsed.hours).padStart(2, "0"))
        setSelectedMinutes(String(parsed.minutes).padStart(2, "0"))
      } else {
        setSelectedHours("")
        setSelectedMinutes("")
      }
    }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleHoursChange = (hours: string) => {
      setSelectedHours(hours)
      const newTime = `${hours}:${selectedMinutes || "00"}`
      if (isTimeInRange(newTime, minTime, maxTime)) {
        onChange(newTime)
      }
    }

    const handleMinutesChange = (minutes: string) => {
      setSelectedMinutes(minutes)
      const newTime = `${selectedHours || "00"}:${minutes}`
      if (isTimeInRange(newTime, minTime, maxTime)) {
        onChange(newTime)
      }
    }

    if (isTouch && useNativeOnMobile) {
      return (
        <FormField
          label={label}
          error={error}
          disabled={disabled}
          className={className}
        >
          <input
            type="time"
            value={value ?? ""}
            min={minTime}
            max={maxTime}
            disabled={disabled}
            onChange={(e) => {
              if (isTimeInRange(e.target.value, minTime, maxTime)) {
                onChange(e.target.value)
              }
            }}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus-visible:ring-destructive"
            )}
          />
        </FormField>
      )
    }

    return (
      <FormField
        label={label}
        error={error}
        disabled={disabled}
        className={className}
      >
        <div className="flex items-center gap-2">
          <SelectRoot
            value={selectedHours}
            onValueChange={handleHoursChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-[80px]" aria-label="Hours">
              <SelectValue placeholder="HH" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((hour) => {
                const testTime = `${hour}:${selectedMinutes || "00"}`
                const disabled = !isTimeInRange(testTime, minTime, maxTime)
                return (
                  <SelectItem key={hour} value={hour} disabled={disabled}>
                    {hour}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </SelectRoot>

          <span className="text-muted-foreground text-sm">:</span>

          <SelectRoot
            value={selectedMinutes}
            onValueChange={handleMinutesChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-[80px]" aria-label="Minutes">
              <SelectValue placeholder="MM" />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((minute) => {
                const testTime = `${selectedHours || "00"}:${minute}`
                const disabled = !isTimeInRange(testTime, minTime, maxTime)
                return (
                  <SelectItem key={minute} value={minute} disabled={disabled}>
                    {minute}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </SelectRoot>
        </div>
      </FormField>
    )
  }
)
TimePicker.displayName = "TimePicker"

export { TimePicker }
