import * as React from "react"
import { cn } from "@/utils/cn"
import { useId } from "@/hooks/useId"
import { Checkbox as BaseCheckbox } from "@/components/ui/checkbox"
import type { CheckboxProps as BaseCheckboxProps } from "@radix-ui/react-checkbox"
import { Label } from "@/components/ui/label"

export interface CheckboxProps extends BaseCheckboxProps {
  label?: string
  description?: string
  error?: string
  indeterminate?: boolean
  className?: string
}

const Checkbox = React.forwardRef<React.ComponentRef<typeof BaseCheckbox>, CheckboxProps>(
  (
      {
        label,
        description,
        error,
        className,
        id: externalId,
        disabled,
        ...props
      },
    ref
  ) => {
    const generatedId = useId("checkbox")
    const id = externalId ?? generatedId
    const descriptionId = description ? `${id}-description` : undefined
    const errorId = error ? `${id}-error` : undefined

    return (
      <div className={cn("flex items-start gap-2", disabled && "opacity-60", className)}>
        <BaseCheckbox
          ref={ref}
          id={id}
          disabled={disabled}
          className={cn("mt-0.5", error && "border-destructive")}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(" ") || undefined}
          aria-label={label}
          {...props}
        />
        {(label || description || error) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <Label
                htmlFor={id}
                className={cn(
                  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed cursor-pointer",
                  error && "text-destructive"
                )}
              >
                {label}
              </Label>
            )}
            {description && !error && (
              <p id={descriptionId} className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
            {error && (
              <p id={errorId} role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
