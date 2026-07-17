import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"

const cardVariants = cva("rounded-xl border bg-card text-card-foreground shadow-sm", {
  variants: {
    variant: {
      default: "",
      interactive:
        "cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
      bordered: "shadow-none border-2",
      flat: "shadow-none border-0 bg-muted/30",
    },
    padding: {
      none: "p-0",
      sm: "p-3",
      md: "p-5",
      lg: "p-7",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "md",
  },
})

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  hoverable?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant = "default", padding = "md", hoverable = false, ...props },
    ref
  ) => {
    const resolvedVariant =
      hoverable && variant === "default" ? "interactive" : variant

    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant: resolvedVariant, padding }),
          hoverable && variant !== "interactive" && variant !== "default" && "cursor-pointer transition-all hover:shadow-md",
          className
        )}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

export { Card }
export type { CardProps }
