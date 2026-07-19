/**
 * SplitPane — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { useState, useRef, useEffect, type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/utils/cn";
import { GripVertical, GripHorizontal } from "lucide-react";

export type SplitDirection = "horizontal" | "vertical";

interface SplitPaneProps extends HTMLAttributes<HTMLDivElement> {
  direction: SplitDirection;
  children: [ReactNode, ReactNode];
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  onSizeChange?: (size: number) => void;
}

export function SplitPane({
  direction,
  children,
  defaultSize = 50,
  minSize = 10,
  maxSize = 90,
  onSizeChange,
  className,
  ...props
}: SplitPaneProps) {
  const [size, setSize] = useState(defaultSize);
  const [dragging, setDragging] = useState(false);
  const paneRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0, size: 0 });

  useEffect(() => {
    onSizeChange?.(size);
  }, [size, onSizeChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      size,
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging || !paneRef.current) return;

      const rect = paneRef.current.getBoundingClientRect();
      let newSize: number;

      if (direction === "horizontal") {
        const deltaX = e.clientX - startPos.current.x;
        const deltaPercent = (deltaX / rect.width) * 100;
        newSize = startPos.current.size + deltaPercent;
      } else {
        const deltaY = e.clientY - startPos.current.y;
        const deltaPercent = (deltaY / rect.height) * 100;
        newSize = startPos.current.size + deltaPercent;
      }

      newSize = Math.max(minSize, Math.min(maxSize, newSize));
      setSize(newSize);
    };

    const handleMouseUp = () => {
      setDragging(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    if (dragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, direction, minSize, maxSize]);

  const [first, second] = children;

  return (
    <div
      ref={paneRef}
      className={cn(
        "relative w-full h-full",
        direction === "horizontal" ? "flex flex-row" : "flex flex-col",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex-1 overflow-auto",
          direction === "horizontal"
            ? "min-w-0"
            : "min-h-0",
        )}
        style={{ flexBasis: `${size}%` }}
      >
        {first}
      </div>
      <div
        className={cn(
          "flex items-center justify-center",
          "w-px h-px",
          "bg-[var(--Eulinx-color-border)]",
          "hover:bg-[var(--Eulinx-color-border-strong)]",
          "active:bg-[var(--Eulinx-color-accent)]",
          "transition-colors duration-[var(--Eulinx-duration-hover)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--Eulinx-color-ring)] focus-visible:ring-offset-2",
          "cursor-col-resize",
          direction === "horizontal" ? "cursor-col-resize" : "cursor-row-resize",
          "touch-none select-none",
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={(e) => handleMouseDown(e as unknown as React.MouseEvent)}
        role="separator"
        aria-orientation={direction}
        aria-valuenow={size}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        tabIndex={0}
        onKeyDown={(e) => {
          const step = 1;
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            setSize((prev) => Math.max(minSize, prev - step));
          } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            setSize((prev) => Math.min(maxSize, prev + step));
          }
        }}
      >
        {direction === "horizontal" ? <GripVertical className="h-6 w-px text-[var(--Eulinx-color-text-muted)]" /> : <GripHorizontal className="w-6 h-px text-[var(--Eulinx-color-text-muted)]" />}
      </div>
      <div
        className={cn(
          "flex-1 overflow-auto",
          direction === "horizontal"
            ? "min-w-0"
            : "min-h-0",
        )}
        style={{ flexBasis: `${100 - size}%` }}
      >
        {second}
      </div>
    </div>
  );
}