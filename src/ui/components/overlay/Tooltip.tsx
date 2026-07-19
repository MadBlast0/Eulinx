/**
 * Tooltip — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { Fragment, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  delayDuration?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  sideOffset = 8,
  delayDuration = 200,
  className,
}: TooltipProps) {
  const triggerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<number | NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (side) {
      case "top":
        top = triggerRect.top - contentRect.height - sideOffset;
        break;
      case "bottom":
        top = triggerRect.bottom + sideOffset;
        break;
      case "left":
        left = triggerRect.left - contentRect.width - sideOffset;
        break;
      case "right":
        left = triggerRect.right + sideOffset;
        break;
    }

    switch (align) {
      case "start":
        if (side === "top" || side === "bottom") left = triggerRect.left;
        else top = triggerRect.top;
        break;
      case "center":
        if (side === "top" || side === "bottom")
          left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
        else top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
        break;
      case "end":
        if (side === "top" || side === "bottom") left = triggerRect.right - contentRect.width;
        else top = triggerRect.bottom - contentRect.height;
        break;
    }

    left = Math.max(8, Math.min(left, viewportWidth - contentRect.width - 8));
    top = Math.max(8, Math.min(top, viewportHeight - contentRect.height - 8));

    setPosition({ top, left });
  }, [open, side, align, sideOffset]);

  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => {
      setOpen(true);
    }, delayDuration);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setOpen(false);
  };

  const handleFocus = () => setOpen(true);
  const handleBlur = () => setOpen(false);

  const child = children.props as Record<string, unknown>;

  return (
    <Fragment>
      <span
        ref={triggerRef}
        style={{ display: "inline-block" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...child}
      >
        {children}
      </span>
      {open && (
        createPortal(
          <div
            ref={contentRef}
            className={cn(
              "fixed z-[var(--Eulinx-z-tooltip)]",
              "rounded-[var(--Eulinx-radius-sm)]",
              "bg-[var(--Eulinx-color-text)] text-[var(--Eulinx-color-surface)]",
              "px-2 py-1 text-xs font-medium",
              "shadow-[var(--Eulinx-elev-md)]",
              "animate-in fade-in-0 zoom-in-95 duration-[var(--Eulinx-duration-hover)] ease-[var(--Eulinx-ease-standard)]",
              "whitespace-nowrap",
              "pointer-events-none",
              className,
            )}
            style={{ top: position.top, left: position.left }}
            role="tooltip"
          >
            {content}
          </div>,
          document.body,
        )
      )}
    </Fragment>
  );
}