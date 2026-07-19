/**
 * Card — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { Fragment, type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outlined" | "elevated";
  padding?: "none" | "sm" | "default" | "lg";
  hoverable?: boolean;
  asChild?: boolean;
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  default: "p-4",
  lg: "p-6",
};

const variantClasses = {
  default: "bg-[var(--Eulinx-color-surface)] border border-[var(--Eulinx-color-border)]",
  outlined: "bg-transparent border-2 border-[var(--Eulinx-color-border)]",
  elevated: "bg-[var(--Eulinx-color-surface)] border border-[var(--Eulinx-color-border)] shadow-[var(--Eulinx-elev-md)]",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "default", hoverable = false, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Fragment : "div";

    return (
      <Comp
        ref={ref}
        className={cn(
          "rounded-[var(--Eulinx-radius-lg)]",
          variantClasses[variant],
          paddingClasses[padding],
          hoverable && "transition-[background-color,box-shadow] duration-[var(--Eulinx-duration-hover)] hover:shadow-[var(--Eulinx-elev-lg)]",
          className,
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
Card.displayName = "Card";

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  ),
);
CardHeader.displayName = "CardHeader";

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold text-[var(--Eulinx-color-text)]", className)} {...props}>
      {children}
    </h3>
  ),
);
CardTitle.displayName = "CardTitle";

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p ref={ref} className={cn("mt-1 text-sm text-[var(--Eulinx-color-text-secondary)]", className)} {...props}>
      {children}
    </p>
  ),
);
CardDescription.displayName = "CardDescription";

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn(className)} {...props}>
      {children}
    </div>
  ),
);
CardContent.displayName = "CardContent";

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("mt-4 flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };