/**
 * Textarea — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, description, error, id, disabled, required, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-[var(--Eulinx-color-text)]"
          >
            {label}
            {required && <span className="ml-1 text-[var(--Eulinx-color-error)]" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "flex min-h-[80px] w-full",
            "rounded-md",
            "border",
            "bg-[var(--Eulinx-color-surface)]",
            "px-3 py-2 text-sm",
            "text-[var(--Eulinx-color-text)]",
            "placeholder:text-[var(--Eulinx-color-text-muted)]",
            "transition-[border-color,background-color,box-shadow]",
            "duration-[var(--Eulinx-duration-hover)] ease-[var(--Eulinx-ease-standard)]",
            "resize-y",
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
          aria-describedby={description ? `${textareaId}-desc` : error ? `${textareaId}-error` : undefined}
          {...props}
        />
        {description && !error && (
          <p id={`${textareaId}-desc`} className="mt-1.5 text-xs text-[var(--Eulinx-color-text-muted)]">
            {description}
          </p>
        )}
        {error && (
          <p id={`${textareaId}-error`} className="mt-1.5 text-xs text-[var(--Eulinx-color-error)]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };