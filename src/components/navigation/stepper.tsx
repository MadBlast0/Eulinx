import * as React from "react"
import { cn } from "@/utils/cn"
import { Check } from "lucide-react"

interface Step {
  label: string
  description?: string
}

interface StepperProps {
  orientation?: "horizontal" | "vertical"
  currentStep: number
  steps: Step[]
  className?: string
}

/* ─── Stepper ─── */

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ orientation = "horizontal", currentStep, steps, className }, ref) => {
    if (steps.length === 0) return null

    return (
      <div
        ref={ref}
        role="list"
        aria-label="Progress"
        className={cn(
          orientation === "horizontal"
            ? "flex items-center"
            : "flex flex-col gap-0",
          className
        )}
      >
        {steps.map((step, idx) => {
          const isCompleted = currentStep > idx + 1
          const isActive = currentStep === idx + 1
          const isDisabled = currentStep < idx + 1
          const isLast = idx === steps.length - 1

          return (
            <React.Fragment key={step.label}>
              <StepIndicator
                stepNumber={idx + 1}
                label={step.label}
                description={step.description}
                completed={isCompleted}
                active={isActive}
                disabled={isDisabled}
                orientation={orientation}
              />
              {!isLast && (
                <StepConnector
                  completed={isCompleted}
                  orientation={orientation}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    )
  }
)
Stepper.displayName = "Stepper"

/* ─── StepIndicator ─── */

interface StepIndicatorProps {
  stepNumber: number
  label: string
  description?: string
  completed: boolean
  active: boolean
  disabled: boolean
  orientation: "horizontal" | "vertical"
}

function StepIndicator({
  stepNumber,
  label,
  description,
  completed,
  active,
  disabled,
  orientation,
}: StepIndicatorProps) {
  return (
    <div
      role="listitem"
      aria-current={active ? "step" : undefined}
      className={cn(
        "flex items-start gap-3",
        orientation === "horizontal" && "flex-col items-center",
        disabled && "opacity-50"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
          completed && "border-primary bg-primary text-primary-foreground",
          active && "border-primary text-primary",
          !completed && !active && "border-muted-foreground/30 text-muted-foreground"
        )}
      >
        {completed ? <Check className="h-4 w-4" /> : stepNumber}
      </div>
      <div className={cn(orientation === "horizontal" && "text-center")}>
        <p
          className={cn(
            "text-sm font-medium",
            active && "text-foreground",
            !active && "text-muted-foreground"
          )}
        >
          {label}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

/* ─── StepConnector ─── */

interface StepConnectorProps {
  completed: boolean
  orientation: "horizontal" | "vertical"
}

function StepConnector({ completed, orientation }: StepConnectorProps) {
  return (
    <div
      role="presentation"
      aria-hidden
      className={cn(
        "shrink-0 transition-colors",
        orientation === "horizontal"
          ? "mx-2 h-px flex-1 self-start mt-4"
          : "ml-4 h-6 w-px",
        completed ? "bg-primary" : "bg-muted-foreground/30"
      )}
    />
  )
}

export { Stepper, StepConnector }
export type { StepperProps, Step }
