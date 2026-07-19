/**
 * Breadcrumb — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { cn } from "@/utils/cn";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
  }>;
  separator?: React.ReactNode;
  className?: string;
}

export function Breadcrumb({ items, separator = <ChevronRight className="h-4 w-4" />, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center gap-1.5 text-sm", className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {index > 0 && (
              <span className="text-[var(--Eulinx-color-text-muted)]" aria-hidden="true">
                {separator}
              </span>
            )}
            {item.href || item.onClick ? (
              <a
                href={item.href}
                onClick={(e) => {
                  if (item.disabled) e.preventDefault();
                  item.onClick?.();
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md",
                  "transition-colors duration-[var(--Eulinx-duration-hover)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--Eulinx-color-ring)] focus-visible:ring-offset-2",
                  item.disabled
                    ? "text-[var(--Eulinx-color-text-muted)] pointer-events-none"
                    : "text-[var(--Eulinx-color-text-secondary)] hover:text-[var(--Eulinx-color-text)] hover:bg-[var(--Eulinx-color-hover)]",
                )}
                aria-current={index === items.length - 1 ? "page" : undefined}
                aria-disabled={item.disabled}
              >
                {index === 0 && <Home className="h-4 w-4" aria-hidden="true" />}
                {item.label}
              </a>
            ) : (
              <span
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md",
                  "text-[var(--Eulinx-color-text)] font-medium",
                )}
                aria-current={index === items.length - 1 ? "page" : undefined}
              >
                {index === 0 && <Home className="h-4 w-4" aria-hidden="true" />}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}