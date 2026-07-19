/**
 * Toast — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { Fragment, type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

export type ToastVariant = "default" | "success" | "warning" | "error" | "info";

export interface Toast {
  id: string;
  title?: string;
  description?: ReactNode;
  variant?: ToastVariant;
  duration?: number;
  action?: ReactNode;
}

interface ToastProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const variantStyles: Record<ToastVariant, string> = {
  default: "border-[var(--Eulinx-color-border)] bg-[var(--Eulinx-color-surface)]",
  success: "border-[var(--Eulinx-color-success)] bg-[var(--Eulinx-color-surface)]",
  warning: "border-[var(--Eulinx-color-warning)] bg-[var(--Eulinx-color-surface)]",
  error: "border-[var(--Eulinx-color-error)] bg-[var(--Eulinx-color-surface)]",
  info: "border-[var(--Eulinx-color-info)] bg-[var(--Eulinx-color-surface)]",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setOpen(false), toast.duration ?? 5000);
    return () => clearTimeout(timer);
  }, [toast.duration]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        "rounded-[var(--Eulinx-radius-md)]",
        "border",
        "p-4",
        "shadow-[var(--Eulinx-elev-lg)]",
        "min-w-[320px] max-w-[420px]",
        "animate-in slide-in-from-top-full fade-in duration-[var(--Eulinx-duration-toast)] ease-[var(--Eulinx-ease-standard)]",
        variantStyles[toast.variant ?? "default"],
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className="text-sm font-medium text-[var(--Eulinx-color-text)]">{toast.title}</div>
        )}
        {toast.description && (
          <div className="mt-1 text-sm text-[var(--Eulinx-color-text-muted)]">{toast.description}</div>
        )}
        {toast.action && (
          <div className="mt-3">{toast.action}</div>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md",
          "text-[var(--Eulinx-color-text-muted)]",
          "transition-colors duration-[var(--Eulinx-duration-hover)]",
          "hover:text-[var(--Eulinx-color-text)] hover:bg-[var(--Eulinx-color-hover)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--Eulinx-color-ring)]",
        )}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return createPortal(
    <Fragment>
      <div className="fixed bottom-4 right-4 z-[var(--Eulinx-z-toast)] flex flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
        ))}
      </div>
    </Fragment>,
    document.body,
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const toast = (options: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast = { ...options, id } as Toast;
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  return { toasts, toast, dismiss };
}

ToastContainer.displayName = "ToastContainer";