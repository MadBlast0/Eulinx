import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"
import type { ColorScheme } from "@/types/design-system"

const badgeVariants = cva(
  "inline-flex items-center rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border px-2.5 py-0.5 text-xs",
        dot: "gap-1.5 px-2.5 py-0.5 text-xs",
        icon: "gap-1 px-2 py-0.5 text-xs",
      },
      size: {
        sm: "px-1.5 py-0 text-[10px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

const colorStyles: Record<ColorScheme, { bg: string; dot: string }> = {
  primary: {
    bg: "bg-primary text-primary-foreground border-transparent shadow",
    dot: "bg-primary-foreground",
  },
  secondary: {
    bg: "bg-secondary text-secondary-foreground border-transparent",
    dot: "bg-secondary-foreground",
  },
  destructive: {
    bg: "bg-destructive text-destructive-foreground border-transparent shadow",
    dot: "bg-destructive-foreground",
  },
  success: {
    bg: "bg-green-100 text-green-800 border-transparent dark:bg-green-900 dark:text-green-100",
    dot: "bg-green-500",
  },
  warning: {
    bg: "bg-yellow-100 text-yellow-800 border-transparent dark:bg-yellow-900 dark:text-yellow-100",
    dot: "bg-yellow-500",
  },
  info: {
    bg: "bg-blue-100 text-blue-800 border-transparent dark:bg-blue-900 dark:text-blue-100",
    dot: "bg-blue-500",
  },
  muted: {
    bg: "bg-muted text-muted-foreground border-transparent",
    dot: "bg-muted-foreground",
  },
  accent: {
    bg: "bg-accent text-accent-foreground border-transparent",
    dot: "bg-accent-foreground",
  },
}

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  color?: ColorScheme
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      color = "primary",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          badgeVariants({ variant, size }),
          colorStyles[color].bg,
          className
        )}
        {...props}
      >
        {variant === "dot" && (
          <span
            className={cn("h-1.5 w-1.5 rounded-full", colorStyles[color].dot)}
          />
        )}
        {children}
      </div>
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
export type { BadgeProps }
