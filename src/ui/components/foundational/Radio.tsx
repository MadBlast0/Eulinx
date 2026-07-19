/**
 * Radio — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  value: string;
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, value, id, name, disabled, ...props }, ref) => {
    const radioId = id || `radio-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center justify-center flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            type="radio"
            id={radioId}
            name={name}
            value={value}
            className={cn(
              "peer h-4 w-4 appearance-none",
              "rounded-full",
              "border-2 border-[var(--Eulinx-color-border)]",
              "bg-[var(--Eulinx-color-surface)]",
              "transition-[border-color,background-color,box-shadow]",
              "duration-[var(--Eulinx-duration-hover)] ease-[var(--Eulinx-ease-standard)]",
              "outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--Eulinx-color-ring)] focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "hover:border-[var(--Eulinx-color-border-strong)]",
              "checked:border-[var(--Eulinx-color-accent)] checked:bg-[var(--Eulinx-color-surface)]",
              "checked:hover:border-[var(--Eulinx-color-accent)]/90",
              className,
            )}
            disabled={disabled}
            aria-describedby={description ? `${radioId}-desc` : undefined}
            {...props}
          />
          <span
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "h-1.5 w-1.5 rounded-full",
              "bg-[var(--Eulinx-color-accent)]",
              "opacity-0 peer-checked:opacity-100",
              "transition-opacity duration-[var(--Eulinx-duration-hover)]",
            )}
            aria-hidden="true"
          />
        </div>
        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <label
                htmlFor={radioId}
                className="text-sm font-medium text-[var(--Eulinx-color-text)] cursor-pointer peer-disabled:opacity-50"
              >
                {label}
              </label>
            )}
            {description && (
              <p id={`${radioId}-desc`} className="text-xs text-[var(--Eulinx-color-text-muted)]">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  },
);
Radio.displayName = "Radio";

export { Radio };