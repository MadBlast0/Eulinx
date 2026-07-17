import * as React from "react"
import { cn } from "@/utils/cn"
import { Textarea as BaseTextarea, type TextareaProps as BaseTextareaProps } from "@/components/ui/textarea"
import { FormField } from "@/components/forms/form-field"

export interface TextareaProps extends Omit<BaseTextareaProps, "hasError"> {
  label?: string
  error?: string
  description?: string
  autoResize?: boolean
  maxRows?: number
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      description,
      autoResize,
      maxRows = 10,
      className,
      disabled,
      required,
      name,
      ...props
    },
    ref
  ) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null)
    const resolvedRef = (node: HTMLTextAreaElement | null) => {
      internalRef.current = node
      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }

    const resize = React.useCallback(() => {
      const textarea = internalRef.current
      if (!textarea || !autoResize) return

      textarea.style.height = "0"
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight, 10) || 20
      const maxHeight = maxRows * lineHeight
      const scrollHeight = textarea.scrollHeight
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
      textarea.style.overflow = scrollHeight > maxHeight ? "auto" : "hidden"
    }, [autoResize, maxRows])

    React.useEffect(() => {
      resize()
    }, [resize, props.value])

    return (
      <FormField
        label={label}
        description={description}
        error={error}
        required={required}
        disabled={disabled}
        name={name}
      >
        <BaseTextarea
          ref={resolvedRef}
          disabled={disabled}
          required={required}
          hasError={!!error}
          className={cn(
            autoResize && "resize-none overflow-hidden",
            className
          )}
          onInput={(e) => {
            if (autoResize) {
              resize()
            }
            props.onInput?.(e)
          }}
          {...props}
        />
      </FormField>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
