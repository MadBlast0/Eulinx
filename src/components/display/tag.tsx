import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"
import type { ColorScheme } from "@/types/design-system"

const tagVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      size: {
        sm: "px-1.5 py-0 text-[10px]",
        md: "px-2 py-0.5 text-xs",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const colorStyles: Record<ColorScheme, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary-foreground",
  destructive: "bg-destructive/10 text-destructive",
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  muted: "bg-muted text-muted-foreground",
  accent: "bg-accent text-accent-foreground",
}

interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {
  label: string
  color?: ColorScheme
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ label, size = "md", color = "muted", className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(tagVariants({ size }), colorStyles[color], className)}
        {...props}
      >
        {label}
      </span>
    )
  }
)
Tag.displayName = "Tag"

export { Tag }
export type { TagProps }
