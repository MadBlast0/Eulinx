/**
 * Select — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 *
 * Uses native select for simplicity - can be enhanced with Radix later.
 */

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  description?: string;
  error?: string;
  placeholder?: string;
  options: readonly { value: string; label: string; disabled?: boolean }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, description, error, placeholder, options, id, disabled, required, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-[var(--Eulinx-color-text)]"
          >
            {label}
            {required && <span className="ml-1 text-[var(--Eulinx-color-error)]" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "flex h-9 w-full appearance-none",
              "rounded-md",
              "border",
              "bg-[var(--Eulinx-color-surface)]",
              "px-3 py-1.5 pr-9 text-sm",
              "text-[var(--Eulinx-color-text)]",
              "transition-[border-color,background-color,box-shadow]",
              "duration-[var(--Eulinx-duration-hover)] ease-[var(--Eulinx-ease-standard)]",
              "outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--Eulinx-color-ring)] focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              hasError
                ? "border-[var(--Eulinx-color-error)] focus-visible:ring-[var(--Eulinx-color-error)]"
                : "border-[var(--Eulinx-color-border)] hover:border-[var(--Eulinx-color-border-strong)]",
              className,
            )}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={description ? `${selectId}-desc` : error ? `${selectId}-error` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--Eulinx-color-text-muted)]">
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01-.02-1.06z" />
            </svg>
          </div>
        </div>
        {description && !error && (
          <p id={`${selectId}-desc`} className="mt-1.5 text-xs text-[var(--Eulinx-color-text-muted)]">
            {description}
          </p>
        )}
        {error && (
          <p id={`${selectId}-error`} className="mt-1.5 text-xs text-[var(--Eulinx-color-error)]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";

export { Select };