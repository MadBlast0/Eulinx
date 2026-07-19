/**
 * Skeleton — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { type HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = "text", width, height, ...props }: SkeletonProps) {
  const baseStyles = "animate-pulse bg-[var(--Eulinx-color-border)] rounded-[var(--Eulinx-radius-md)]";

  const variantStyles = {
    text: "h-4",
    circular: "rounded-full",
    rectangular: "rounded-[var(--Eulinx-radius-md)]",
  };

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className, ...props }: { lines?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[var(--Eulinx-radius-lg)] border border-[var(--Eulinx-color-border)] p-4 space-y-4", className)} {...props}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="60%" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}