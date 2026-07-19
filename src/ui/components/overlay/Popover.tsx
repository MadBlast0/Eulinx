import { Fragment, useRef, useEffect, useState, isValidElement, cloneElement, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  trigger: ReactElement<Record<string, unknown>>;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}

export function Popover({ open, onOpenChange, children, trigger, side = "bottom", align = "center", className }: PopoverProps) {
  const triggerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (side) {
      case "top":
        top = triggerRect.top - contentRect.height - gap;
        break;
      case "bottom":
        top = triggerRect.bottom + gap;
        break;
      case "left":
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
        break;
      case "right":
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
        break;
    }

    switch (align) {
      case "start":
        left = triggerRect.left;
        break;
      case "center":
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
        break;
      case "end":
        left = triggerRect.right - contentRect.width;
        break;
    }

    // Clamp to viewport
    left = Math.max(8, Math.min(left, viewportWidth - contentRect.width - 8));
    top = Math.max(8, Math.min(top, viewportHeight - contentRect.height - 8));

    setPosition({ top, left });
  }, [open, side, align]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return <>{trigger}</>;

  return (
    <Fragment>
      <span ref={triggerRef} style={{ display: "inline-block" }}>
        {isValidElement(trigger)
          ? cloneElement(trigger, {
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                onOpenChange(!open);
                const onClick = trigger.props.onClick as React.MouseEventHandler | undefined;
                onClick?.(e);
              },
            })
          : trigger}
      </span>
      {createPortal(
        <div
          ref={contentRef}
          className={cn(
            "fixed z-[var(--Eulinx-z-popover)]",
            "rounded-[var(--Eulinx-radius-md)]",
            "bg-[var(--Eulinx-color-surface)]",
            "border border-[var(--Eulinx-color-border)]",
            "shadow-[var(--Eulinx-elev-lg)]",
            "p-3",
            "animate-in fade-in-0 zoom-in-95 duration-[var(--Eulinx-duration-card)] ease-[var(--Eulinx-ease-standard)]",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            className,
          )}
          style={{ top: position.top, left: position.left }}
          role="dialog"
          tabIndex={-1}
        >
          {children}
        </div>,
        document.body,
      )}
    </Fragment>
  );
}