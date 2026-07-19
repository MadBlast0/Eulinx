/**
 * Dialog — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { Fragment, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      contentRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onOpenChange(false);
        if (e.key === "Tab") trapFocus(e);
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleKeyDown);
        previousActiveElement.current?.focus();
      };
    }
  }, [open, onOpenChange]);

  const trapFocus = (e: KeyboardEvent) => {
    const focusableElements = contentRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusableElements?.length) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (!firstElement || !lastElement) return;
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };

  if (!open) return null;

  return createPortal(
    <Fragment>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[var(--Eulinx-z-modal)] bg-black/50 animate-in fade-in duration-[var(--Eulinx-duration-dialog)] ease-[var(--Eulinx-ease-standard)]"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        tabIndex={-1}
        className={cn(
          "fixed z-[var(--Eulinx-z-modal)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg",
          "rounded-[var(--Eulinx-radius-lg)]",
          "bg-[var(--Eulinx-color-surface)]",
          "border border-[var(--Eulinx-color-border)]",
          "shadow-[var(--Eulinx-elev-xl)]",
          "animate-in zoom-in-95 fade-in duration-[var(--Eulinx-duration-dialog)] ease-[var(--Eulinx-ease-standard)]",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "p-6",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "dialog-title" : undefined}
        aria-describedby={description ? "dialog-description" : undefined}
      >
        {(title || description) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              {title && <h2 id="dialog-title" className="text-lg font-semibold text-[var(--Eulinx-color-text)]">{title}</h2>}
              {description && <p id="dialog-description" className="mt-1 text-sm text-[var(--Eulinx-color-text-secondary)]">{description}</p>}
            </div>
            <button
              type="button"
              className={cn(
                "flex-shrink-0 p-1 rounded",
                "text-[var(--Eulinx-color-text-muted)]",
                "hover:text-[var(--Eulinx-color-text)] hover:bg-[var(--Eulinx-color-hover)]",
                "transition-colors duration-[var(--Eulinx-duration-hover)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--Eulinx-color-ring)]",
              )}
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        {children}
      </div>
    </Fragment>,
    document.body,
  );
}