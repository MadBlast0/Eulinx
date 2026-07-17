import * as React from "react"
import { cn } from "@/utils/cn"
import { useId } from "@/hooks/useId"

export interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  className?: string
}

interface OtpInputRefHandle {
  focus: () => void
  clear: () => void
}

const OtpInput = React.forwardRef<OtpInputRefHandle, OtpInputProps>(
  ({ length = 6, value, onChange, error, disabled, className }, ref) => {
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([])
    const id = useId("otp")

    const values = React.useMemo(() => {
      const chars = value.split("")
      return Array.from({ length }, (_, i) => chars[i] ?? "")
    }, [value, length])

    React.useImperativeHandle(ref, () => ({
      focus: () => inputRefs.current[0]?.focus(),
      clear: () => {
        onChange("")
        inputRefs.current[0]?.focus()
      },
    }))

    React.useEffect(() => {
      inputRefs.current[0]?.focus()
    }, [])

    const focusNext = (index: number) => {
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus()
      }
    }

    const focusPrev = (index: number) => {
      if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    }

    const handleChange = (index: number, char: string) => {
      if (char.length > 1) return

      const newChars = [...values]
      newChars[index] = char
      const newValue = newChars.join("")
      onChange(newValue)

      if (char && index < length - 1) {
        focusNext(index)
      }
    }

    const handleKeyDown = (
      index: number,
      e: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (e.key === "Backspace") {
        e.preventDefault()
        if (values[index] === "") {
          focusPrev(index)
        } else {
          const newChars = [...values]
          newChars[index] = ""
          onChange(newChars.join(""))
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        focusPrev(index)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        focusNext(index)
      } else if (e.key === "Delete") {
        e.preventDefault()
        const newChars = [...values]
        newChars[index] = ""
        onChange(newChars.join(""))
      }
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "")
      const chars = pasted.split("").slice(0, length)

      const newChars = [...values]
      chars.forEach((char, i) => {
        newChars[i] = char
      })
      onChange(newChars.join(""))

      const nextEmpty = newChars.findIndex((c) => c === "")
      const focusIndex = nextEmpty === -1 ? length - 1 : nextEmpty
      inputRefs.current[focusIndex]?.focus()
    }

    const setInputRef = (index: number) => (el: HTMLInputElement | null) => {
      inputRefs.current[index] = el
    }

    const isComplete = values.every((v) => v !== "")

    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div
          className="flex items-center gap-2"
          role="group"
          aria-label="One-time password input"
        >
          {values.map((char, index) => (
            <input
              key={`${id}-${index}`}
              ref={setInputRef(index)}
              type="tel"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={char}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={disabled}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md border border-input bg-transparent text-center text-sm font-medium shadow-sm transition-all",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-50",
                error && "border-destructive focus-visible:ring-destructive",
                char && "border-primary",
                isComplete && "border-emerald-500"
              )}
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }
)
OtpInput.displayName = "OtpInput"

export { OtpInput }
export type { OtpInputRefHandle }
