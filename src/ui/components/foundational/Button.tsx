/**
 * Button — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states (0.985 scale),
 * disabled reduced contrast, accessible labels.
 */

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--Eulinx-duration-button)] ease-[var(--Eulinx-ease-standard)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--Eulinx-color-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985]",
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--Eulinx-color-accent)] text-[var(--Eulinx-color-surface)]",
          "hover:bg-[var(--Eulinx-color-accent)]/90",
          "border-none",
          "shadow-[var(--Eulinx-elev-sm)]",
        ],
        secondary: [
          "bg-[var(--Eulinx-color-surface)] text-[var(--Eulinx-color-text)]",
          "border border-[var(--Eulinx-color-border)]",
          "hover:bg-[var(--Eulinx-color-hover)]",
          "shadow-none",
        ],
        outline: [
          "bg-transparent text-[var(--Eulinx-color-text)]",
          "border border-[var(--Eulinx-color-border)]",
          "hover:bg-[var(--Eulinx-color-hover)]",
          "shadow-none",
        ],
        ghost: [
          "bg-transparent text-[var(--Eulinx-color-text)]",
          "border-none",
          "hover:bg-[var(--Eulinx-color-hover)]",
          "shadow-none",
        ],
        destructive: [
          "bg-[var(--Eulinx-color-error)] text-[var(--Eulinx-color-surface)]",
          "hover:bg-[var(--Eulinx-color-error)]/90",
          "border-none",
          "shadow-[var(--Eulinx-elev-sm)]",
        ],
        link: [
          "bg-transparent text-[var(--Eulinx-color-accent)]",
          "border-none",
          "underline-offset-4",
          "hover:underline",
          "shadow-none",
        ],
      },
      size: {
        default: "h-9 px-4 py-2 text-sm rounded-md",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-10 px-6 text-sm rounded-md",
        xl: "h-12 px-8 text-base rounded-lg",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };