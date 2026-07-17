import * as React from "react"
import { cn } from "@/utils/cn"

// --- Context ---

type FieldState = {
  value: unknown
  error: string | null
  dirty: boolean
  touched: boolean
}

interface FormContextValue {
  values: Record<string, unknown>
  errors: Record<string, string | null>
  dirty: Record<string, boolean>
  touched: Record<string, boolean>
  registerField: (name: string, initialValue: unknown) => void
  unregisterField: (name: string) => void
  setFieldValue: (name: string, value: unknown) => void
  setFieldError: (name: string, error: string | null) => void
  setFieldTouched: (name: string, touched?: boolean) => void
  submitCount: number
  handleSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
}

const FormContext = React.createContext<FormContextValue | null>(null)

// --- Provider ---

export interface FormProps {
  onSubmit: (values: Record<string, unknown>) => void
  children: React.ReactNode
  className?: string
  initialValues?: Record<string, unknown>
}

const FormRoot = React.forwardRef<HTMLFormElement, FormProps>(
  ({ onSubmit, children, className, initialValues = {} }, ref) => {
    const [fields, setFields] = React.useState<Record<string, FieldState>>(() => {
      const fieldMap: Record<string, FieldState> = {}
      for (const [key, value] of Object.entries(initialValues)) {
        fieldMap[key] = { value, error: null, dirty: false, touched: false }
      }
      return fieldMap
    })
    const [submitCount, setSubmitCount] = React.useState(0)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const values = React.useMemo(() => {
      const result: Record<string, unknown> = {}
      for (const [key, state] of Object.entries(fields)) {
        result[key] = state.value
      }
      return result
    }, [fields])

    const errors = React.useMemo(() => {
      const result: Record<string, string | null> = {}
      for (const [key, state] of Object.entries(fields)) {
        result[key] = state.error
      }
      return result
    }, [fields])

    const dirty = React.useMemo(() => {
      const result: Record<string, boolean> = {}
      for (const [key, state] of Object.entries(fields)) {
        result[key] = state.dirty
      }
      return result
    }, [fields])

    const touched = React.useMemo(() => {
      const result: Record<string, boolean> = {}
      for (const [key, state] of Object.entries(fields)) {
        result[key] = state.touched
      }
      return result
    }, [fields])

    const registerField = React.useCallback(
      (name: string, initialValue: unknown) => {
        setFields((prev) => {
          if (name in prev) return prev
          return {
            ...prev,
            [name]: { value: initialValue, error: null, dirty: false, touched: false },
          }
        })
      },
      []
    )

    const unregisterField = React.useCallback((name: string) => {
      setFields((prev) => {
        return Object.fromEntries(
          Object.entries(prev).filter(([key]) => key !== name)
        ) as Record<string, FieldState>
      })
    }, [])

    const setFieldValue = React.useCallback(
      (name: string, value: unknown) => {
        setFields((prev) => {
          const existing = prev[name]
          return {
            ...prev,
            [name]: {
              value,
              error: existing?.error ?? null,
              dirty: existing?.dirty ?? value !== initialValues[name],
              touched: existing?.touched ?? false,
            },
          }
        })
      },
      [initialValues]
    )

    const setFieldError = React.useCallback(
      (name: string, error: string | null) => {
        setFields((prev) => {
          const existing = prev[name]
          return {
            ...prev,
            [name]: {
              value: existing?.value ?? null,
              error,
              dirty: existing?.dirty ?? false,
              touched: existing?.touched ?? false,
            },
          }
        })
      },
      []
    )

    const setFieldTouched = React.useCallback(
      (name: string, touchedValue = true) => {
        setFields((prev) => {
          const existing = prev[name]
          return {
            ...prev,
            [name]: {
              value: existing?.value ?? null,
              error: existing?.error ?? null,
              dirty: existing?.dirty ?? false,
              touched: touchedValue,
            },
          }
        })
      },
      []
    )

    const handleSubmit = React.useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitCount((c) => c + 1)
        setIsSubmitting(true)

        try {
          await onSubmit(values)
        } finally {
          setIsSubmitting(false)
        }
      },
      [onSubmit, values]
    )

    const contextValue = React.useMemo<FormContextValue>(
      () => ({
        values,
        errors,
        dirty,
        touched,
        registerField,
        unregisterField,
        setFieldValue,
        setFieldError,
        setFieldTouched,
        submitCount,
        handleSubmit,
        isSubmitting,
      }),
      [
        values,
        errors,
        dirty,
        touched,
        registerField,
        unregisterField,
        setFieldValue,
        setFieldError,
        setFieldTouched,
        submitCount,
        handleSubmit,
        isSubmitting,
      ]
    )

    return (
      <FormContext.Provider value={contextValue}>
        <form
          ref={ref}
          onSubmit={handleSubmit}
          className={cn("space-y-4", className)}
          noValidate
        >
          {children}
        </form>
      </FormContext.Provider>
    )
  }
)
FormRoot.displayName = "FormRoot"

// --- Hooks ---

export function useFormContext(): FormContextValue {
  const ctx = React.useContext(FormContext)
  if (!ctx) {
    throw new Error("useFormContext must be used within a FormRoot")
  }
  return ctx
}

export function useField(name: string, initialValue?: unknown) {
  const ctx = useFormContext()
  const { registerField, unregisterField, setFieldValue, setFieldError, setFieldTouched } = ctx

  React.useEffect(() => {
    registerField(name, initialValue)
    return () => unregisterField(name)
  }, [name]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    value: ctx.values[name],
    error: ctx.errors[name],
    dirty: ctx.dirty[name] ?? false,
    touched: ctx.touched[name] ?? false,
    setValue: (value: unknown) => setFieldValue(name, value),
    setError: (error: string | null) => setFieldError(name, error),
    setTouched: (touchedValue?: boolean) => setFieldTouched(name, touchedValue),
  }
}

// --- Sub-components ---

export interface FormFieldWrapperProps {
  name: string
  children: React.ReactNode
  className?: string
}

const FormFieldWrapper = React.forwardRef<HTMLDivElement, FormFieldWrapperProps>(
  ({ name, children, className }, ref) => {
    return (
      <div ref={ref} className={className} data-form-field={name}>
        {children}
      </div>
    )
  }
)
FormFieldWrapper.displayName = "FormFieldWrapper"

export interface FormSubmitProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

const FormSubmit = React.forwardRef<HTMLButtonElement, FormSubmitProps>(
  ({ children, className, asChild = false }, ref) => {
    const { isSubmitting } = useFormContext()

    if (asChild) {
      return (
        <span className={className}>
          {children}
        </span>
      )
    }

    return (
      <button
        ref={ref}
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          className
        )}
      >
        {children}
      </button>
    )
  }
)
FormSubmit.displayName = "FormSubmit"

export {
  FormRoot,
  FormFieldWrapper,
  FormSubmit,
  FormContext,
}
export type { FormContextValue }
