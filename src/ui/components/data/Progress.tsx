/**
 * Progress — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "error";
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
  label?: string;
}

const sizeClasses = {
  sm: "h-1.5",
  default: "h-2",
  lg: "h-3",
};

const variantClasses = {
  default: "bg-[var(--Eulinx-color-accent)]",
  success: "bg-[var(--Eulinx-color-success)]",
  warning: "bg-[var(--Eulinx-color-warning)]",
  error: "bg-[var(--Eulinx-color-error)]",
};

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = "default", size = "default", showLabel = false, label, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {(showLabel || label) && (
          <div className="flex items-center justify-between mb-1.5 text-xs font-medium text-[var(--Eulinx-color-text-secondary)]">
            <span>{label ?? "Progress"}</span>
            <span aria-hidden="true">{Math.round(percentage)}%</span>
          </div>
        )}
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
          className={cn(
            "relative w-full overflow-hidden",
            "rounded-full",
            "bg-[var(--Eulinx-color-border)]",
            sizeClasses[size],
          )}
        >
          <div
            className={cn(
              "h-full",
              "rounded-full",
              "transition-all duration-[var(--Eulinx-duration-card)] ease-[var(--Eulinx-ease-standard)]",
              variantClasses[variant],
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };