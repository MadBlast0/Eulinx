/**
 * Checkbox — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, indeterminate, id, disabled, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center justify-center flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn(
              "peer h-4 w-4 appearance-none",
              "rounded-sm",
              "border border-[var(--Eulinx-color-border)]",
              "bg-[var(--Eulinx-color-surface)]",
              "transition-[border-color,background-color,box-shadow]",
              "duration-[var(--Eulinx-duration-hover)] ease-[var(--Eulinx-ease-standard)]",
              "outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--Eulinx-color-ring)] focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "hover:border-[var(--Eulinx-color-border-strong)]",
              "checked:border-[var(--Eulinx-color-accent)] checked:bg-[var(--Eulinx-color-accent)]",
              "checked:hover:border-[var(--Eulinx-color-accent)]/90 checked:hover:bg-[var(--Eulinx-color-accent)]/90",
              "indeterminate:border-[var(--Eulinx-color-accent)] indeterminate:bg-[var(--Eulinx-color-accent)]",
              className,
            )}
            disabled={disabled}
            aria-describedby={description ? `${checkboxId}-desc` : undefined}
            aria-indeterminate={indeterminate}
            {...props}
          />
          {indeterminate ? (
            <span
              className={cn(
                "absolute",
                "h-0.5 w-2.5",
                "bg-[var(--Eulinx-color-surface)]",
                "rounded",
              )}
              aria-hidden="true"
            />
          ) : (
            <svg
              className={cn(
                "absolute h-3 w-3",
                "text-[var(--Eulinx-color-surface)]",
                "opacity-0 peer-checked:opacity-100",
                "transition-opacity duration-[var(--Eulinx-duration-hover)]",
              )}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <label
                htmlFor={checkboxId}
                className="text-sm font-medium text-[var(--Eulinx-color-text)] cursor-pointer peer-disabled:opacity-50"
              >
                {label}
              </label>
            )}
            {description && (
              <p id={`${checkboxId}-desc`} className="text-xs text-[var(--Eulinx-color-text-muted)]">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };