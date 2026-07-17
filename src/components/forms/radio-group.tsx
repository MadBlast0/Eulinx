import * as React from "react"
import { cn } from "@/utils/cn"
import { FormField } from "@/components/forms/form-field"
import { RadioGroup as RadioGroupRoot, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface RadioGroupProps {
  options: RadioOption[]
  value?: string
  onChange: (value: string) => void
  label?: string
  error?: string
  orientation?: "vertical" | "horizontal"
  className?: string
  disabled?: boolean
  required?: boolean
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      options,
      value,
      onChange,
      label,
      error,
      orientation = "vertical",
      className,
      disabled,
      required,
    },
    ref
  ) => {
    return (
      <FormField
        label={label}
        error={error}
        required={required}
        disabled={disabled}
      >
        <RadioGroupRoot
          ref={ref}
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          className={cn(
            orientation === "horizontal" ? "flex flex-row gap-4" : "flex flex-col gap-2",
            className
          )}
        >
          {options.map((option) => {
            const optionId = `radio-${option.value}`
            return (
              <div key={option.value} className="flex items-start gap-2">
                <RadioGroupItem
                  value={option.value}
                  id={optionId}
                  disabled={option.disabled || disabled}
                  className="mt-0.5"
                />
                <div className="flex flex-col gap-0.5">
                  <Label
                    htmlFor={optionId}
                    className={cn(
                      "text-sm font-normal cursor-pointer",
                      (option.disabled || disabled) && "cursor-not-allowed opacity-60"
                    )}
                  >
                    {option.label}
                  </Label>
                  {option.description && (
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </RadioGroupRoot>
      </FormField>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

export { RadioGroup }
