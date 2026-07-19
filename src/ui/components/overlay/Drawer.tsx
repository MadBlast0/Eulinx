/**
 * Drawer — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 *
 * Slides in from the right (or left) side of the screen.
 */

import { Fragment, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  side?: "right" | "left";
  size?: "sm" | "default" | "lg" | "full";
}

function DrawerContent({ open, onOpenChange, title, description, children, className, side = "right", size = "default" }: DrawerProps) {
  if (!open) return null;

  const widthClasses = {
    sm: "max-w-sm",
    default: "max-w-md",
    lg: "max-w-lg",
    full: "max-w-full",
  };

  const sideClasses = {
    right: "right-0",
    left: "left-0",
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") onOpenChange(false);
  };

  return createPortal(
    <Fragment>
      <div
        className="fixed inset-0 z-[var(--Eulinx-z-drawer)] bg-black/30 animate-in fade-in duration-[var(--Eulinx-duration-dialog)]"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          "fixed inset-y-0 z-[calc(var(--Eulinx-z-drawer)+1)] flex flex-col",
          widthClasses[size],
          sideClasses[side],
          "rounded-[var(--Eulinx-radius-lg)] border border-[var(--Eulinx-color-border)]",
          "bg-[var(--Eulinx-color-surface)] shadow-[var(--Eulinx-elev-xl)]",
          "animate-in slide-in-from-right-full duration-[var(--Eulinx-duration-dialog)] ease-[var(--Eulinx-ease-standard)]",
          side === "left" && "slide-in-from-left-full",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "drawer-title" : undefined}
        aria-describedby={description ? "drawer-description" : undefined}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 p-4 border-b border-[var(--Eulinx-color-border)] flex-shrink-0">
            <div>
              {title && (
                <h2 id="drawer-title" className="text-lg font-semibold text-[var(--Eulinx-color-text)]">
                  {title}
                </h2>
              )}
              {description && (
                <p id="drawer-description" className="mt-1 text-sm text-[var(--Eulinx-color-text-muted)]">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md",
                "text-[var(--Eulinx-color-text-muted)]",
                "transition-colors duration-[var(--Eulinx-duration-hover)]",
                "hover:text-[var(--Eulinx-color-text)] hover:bg-[var(--Eulinx-color-hover)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--Eulinx-color-ring)]",
              )}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </Fragment>,
    document.body,
  );
}

DrawerContent.displayName = "DrawerContent";

export { DrawerContent as Drawer };