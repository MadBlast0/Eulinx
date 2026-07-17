import * as React from "react"
import { cn } from "@/utils/cn"
import { useId } from "@/hooks/useId"
import { FormField } from "@/components/forms/form-field"

export interface SliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  error?: string
  showValue?: boolean
  formatValue?: (value: number) => string
  className?: string
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      value,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      label,
      error,
      showValue = true,
      formatValue,
      className,
      disabled,
    },
    ref
  ) => {
    const id = useId("slider")
    const [isDragging, setIsDragging] = React.useState(false)
    const displayValue = formatValue ? formatValue(value) : String(value)

    const percentage = ((value - min) / (max - min)) * 100

    return (
      <FormField
        label={label}
        error={error}
        disabled={disabled}
      >
        <div className="relative pt-1">
          <input
            ref={ref}
            type="range"
            id={id}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onPointerDown={() => setIsDragging(true)}
            onPointerUp={() => setIsDragging(false)}
            className={cn(
              "w-full h-2 appearance-none cursor-pointer rounded-full bg-secondary outline-none",
              " [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
              " [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow [&::-moz-range-thumb]:hover:scale-110",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              className
            )}
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percentage}%, hsl(var(--secondary)) ${percentage}%, hsl(var(--secondary)) 100%)`,
            }}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-label={label ?? "Slider"}
          />
          {showValue && (
            <div
              className={cn(
                "absolute -top-1 translate-x-1/2 text-xs font-medium tabular-nums text-muted-foreground transition-all",
                isDragging && "text-foreground"
              )}
              style={{
                left: `${percentage}%`,
                transform: `translateX(-50%)`,
              }}
            >
              {displayValue}
            </div>
          )}
        </div>
      </FormField>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
