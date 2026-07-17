import * as React from "react"
import { cn } from "@/utils/cn"
import { Input as BaseInput, type InputProps as BaseInputProps } from "@/components/ui/input"
import { FormField } from "@/components/forms/form-field"
import { X } from "lucide-react"

export interface InputProps extends Omit<BaseInputProps, "hasError"> {
  label?: string
  error?: string
  description?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  clearable?: boolean
  onClear?: () => void
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      description,
      leftIcon,
      rightIcon,
      clearable,
      onClear,
      className,
      value,
      onChange,
      disabled,
      required,
      name,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const resolvedRef = (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }

    const hasValue = typeof value === "string" ? value.length > 0 : false

    return (
      <FormField
        label={label}
        description={description}
        error={error}
        required={required}
        disabled={disabled}
        name={name}
      >
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 flex items-center pointer-events-none text-muted-foreground [&_svg]:size-4">
              {leftIcon}
            </span>
          )}

          <BaseInput
            ref={resolvedRef}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            hasError={!!error}
            className={cn(
              leftIcon && "pl-9",
              (rightIcon || (clearable && hasValue)) && "pr-9",
              className
            )}
            {...props}
          />

          {clearable && hasValue && !disabled && (
            <button
              type="button"
              onClick={() => {
                onClear?.()
                inputRef.current?.focus()
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                  window.HTMLInputElement.prototype,
                  "value"
                )?.set
                if (nativeInputValueSetter && inputRef.current) {
                  nativeInputValueSetter.call(inputRef.current, "")
                  inputRef.current.dispatchEvent(new Event("input", { bubbles: true }))
                }
              }}
              className="absolute right-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear input"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {rightIcon && !(clearable && hasValue) && (
            <span className="absolute right-3 flex items-center pointer-events-none text-muted-foreground [&_svg]:size-4">
              {rightIcon}
            </span>
          )}
        </div>
      </FormField>
    )
  }
)
Input.displayName = "Input"

export { Input }
