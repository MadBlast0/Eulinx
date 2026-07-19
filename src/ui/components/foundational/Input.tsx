/**
 * Input — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, description, error, id, disabled, required, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-[var(--Eulinx-color-text)]"
          >
            {label}
            {required && <span className="ml-1 text-[var(--Eulinx-color-error)]" aria-hidden="true">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type="text"
          className={cn(
            "flex h-9 w-full",
            "rounded-md",
            "border",
            "bg-[var(--Eulinx-color-surface)]",
            "px-3 py-1.5 text-sm",
            "text-[var(--Eulinx-color-text)]",
            "placeholder:text-[var(--Eulinx-color-text-muted)]",
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
          aria-describedby={description ? `${inputId}-desc` : error ? `${inputId}-error` : undefined}
          {...props}
        />
        {description && !error && (
          <p id={`${inputId}-desc`} className="mt-1.5 text-xs text-[var(--Eulinx-color-text-muted)]">
            {description}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-[var(--Eulinx-color-error)]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };