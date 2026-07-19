/**
 * Switch — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface SwitchProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, id, disabled, ...props }, ref) => {
    const switchId = id || `switch-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            role="switch"
            className={cn(
              "peer h-5 w-9 appearance-none",
              "rounded-full",
              "border-2 border-[var(--Eulinx-color-border)]",
              "bg-[var(--Eulinx-color-surface)]",
              "transition-[border-color,background-color]",
              "duration-[var(--Eulinx-duration-hover)] ease-[var(--Eulinx-ease-standard)]",
              "outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--Eulinx-color-ring)] focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "checked:border-[var(--Eulinx-color-accent)] checked:bg-[var(--Eulinx-color-accent)]",
              "checked:hover:border-[var(--Eulinx-color-accent)]/90 checked:hover:bg-[var(--Eulinx-color-accent)]/90",
              "after:content-[''] after:absolute after:top-0.5 after:left-0.5",
              "after:h-4 after:w-4 after:rounded-full",
              "after:bg-[var(--Eulinx-color-text-muted)] after:border after:border-[var(--Eulinx-color-border)]",
              "after:transition-transform duration-[var(--Eulinx-duration-hover)] ease-[var(--Eulinx-ease-standard)]",
              "peer-checked:after:translate-x-4",
              "peer-checked:after:border-[var(--Eulinx-color-accent)]",
              className,
            )}
            disabled={disabled}
            aria-describedby={description ? `${switchId}-desc` : undefined}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <label
                htmlFor={switchId}
                className="text-sm font-medium text-[var(--Eulinx-color-text)] cursor-pointer peer-disabled:opacity-50"
              >
                {label}
              </label>
            )}
            {description && (
              <p id={`${switchId}-desc`} className="text-xs text-[var(--Eulinx-color-text-muted)]">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  },
);
Switch.displayName = "Switch";

export { Switch };