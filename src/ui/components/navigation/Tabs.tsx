/**
 * Tabs — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface TabsContextValue {
  activeValue: string;
  onValueChange: (value: string) => void;
  orientation: "horizontal" | "vertical";
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tabs components must be used within Tabs");
  return context;
}

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

function TabsRoot({ defaultValue, value: controlledValue, onValueChange, children, className, orientation = "horizontal" }: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || "");
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = (val: string) => {
    if (!isControlled) setUncontrolledValue(val);
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ activeValue, onValueChange: handleValueChange, orientation }}>
      <div className={cn("flex flex-col", orientation === "horizontal" ? "" : "flex-row", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ children }: TabsListProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 p-1",
        "bg-[var(--Eulinx-color-surface)]",
        "rounded-[var(--Eulinx-radius-md)]",
        "border border-[var(--Eulinx-color-border)]",
      )}
      role="tablist"
      aria-orientation="horizontal"
    >
      {children}
    </div>
  );
}

function TabsTrigger({ value, children, disabled, className }: TabsTriggerProps) {
  const { activeValue, onValueChange } = useTabsContext();

  const isActive = activeValue === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      disabled={disabled}
      type="button"
      className={cn(
        "flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium",
        "rounded-[var(--Eulinx-radius-sm)]",
        "transition-[color,background-color] duration-[var(--Eulinx-duration-hover)] ease-[var(--Eulinx-ease-standard)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--Eulinx-color-ring)] focus-visible:ring-offset-2",
        isActive
          ? "bg-[var(--Eulinx-color-accent)] text-[var(--Eulinx-color-surface)] shadow-[var(--Eulinx-elev-sm)]"
          : "text-[var(--Eulinx-color-text-secondary)] hover:text-[var(--Eulinx-color-text)] hover:bg-[var(--Eulinx-color-hover)]",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
      onClick={() => !disabled && onValueChange(value)}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, children, className }: TabsContentProps) {
  const { activeValue } = useTabsContext();

  if (activeValue !== value) return null;

  return <div role="tabpanel" className={cn("mt-3", className)}>{children}</div>;
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});