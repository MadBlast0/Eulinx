import * as React from "react"
import { cn } from "@/utils/cn"
import { useId } from "@/hooks/useId"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export interface ToggleProps {
  label?: string
  description?: string
  error?: string
  showLabel?: boolean
  className?: string
  id?: string
  disabled?: boolean
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  required?: boolean
  name?: string
  value?: string
}

const Toggle = React.forwardRef<React.ComponentRef<typeof Switch>, ToggleProps>(
  (
    {
      label,
      description,
      error,
      showLabel = true,
      className,
      id: externalId,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId("toggle")
    const id = externalId ?? generatedId
    const descriptionId = description ? `${id}-description` : undefined
    const errorId = error ? `${id}-error` : undefined

    return (
      <div className={cn("flex items-start gap-3", disabled && "opacity-60", className)}>
        <Switch
          ref={ref}
          id={id}
          disabled={disabled}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(" ") || undefined}
          {...props}
        />
        {(label || description || error) && showLabel && (
          <div className="flex flex-col gap-0.5 pt-0.5">
            {label && (
              <Label
                htmlFor={id}
                className={cn(
                  "text-sm font-medium cursor-pointer",
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
Toggle.displayName = "Toggle"

export { Toggle }
