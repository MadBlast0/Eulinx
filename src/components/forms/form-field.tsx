import * as React from "react"
import { cn } from "@/utils/cn"
import { useId } from "@/hooks/useId"
import { Label } from "@/components/ui/label"

export interface FormFieldProps {
  label?: string
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
  children: React.ReactNode
  name?: string
  className?: string
  orientation?: "vertical" | "horizontal"
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      label,
      description,
      error,
      required,
      disabled,
      children,
      name,
      className,
      orientation = "vertical",
    },
    ref
  ) => {
    const generatedId = useId("form-field")
    const contentId = name ? `${name}-content` : generatedId
    const descriptionId = description ? `${contentId}-description` : undefined
    const errorId = error ? `${contentId}-error` : undefined

    const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined

    const wrappedChildren = React.isValidElement<{ id?: string; "aria-describedby"?: string; hasError?: boolean; disabled?: boolean }>(children)
      ? React.cloneElement(children, {
          id: contentId,
          "aria-describedby": describedBy,
          hasError: !!error,
          disabled: disabled || children.props.disabled,
        })
      : children

    return (
      <div
        ref={ref}
        className={cn(
          "group/form-field",
          orientation === "horizontal"
            ? "flex items-start gap-3"
            : "flex flex-col gap-1.5",
          disabled && "opacity-60 pointer-events-none",
          className
        )}
      >
        {label && (
          <Label
            htmlFor={contentId}
            className={cn(
              orientation === "horizontal" ? "pt-2 min-w-[120px]" : "",
              error && "text-destructive"
            )}
          >
            {label}
            {required && (
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            )}
          </Label>
        )}

        <div className="flex-1 flex flex-col gap-1">
          {wrappedChildren}

          {description && !error && (
            <p
              id={descriptionId}
              className="text-xs text-muted-foreground"
            >
              {description}
            </p>
          )}

          {error && (
            <p
              id={errorId}
              role="alert"
              className="text-xs text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    )
  }
)
FormField.displayName = "FormField"

export { FormField }
