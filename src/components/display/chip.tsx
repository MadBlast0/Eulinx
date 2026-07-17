import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"
import { X } from "lucide-react"
import type { ColorScheme } from "@/types/design-system"

const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-full text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        filled: "bg-primary text-primary-foreground",
        outlined: "border text-foreground",
        subtle: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "filled",
      size: "md",
    },
  }
)

const colorVariants: Record<ColorScheme, string> = {
  primary: "",
  secondary: "",
  destructive: "",
  success: "",
  warning: "",
  info: "",
  muted: "",
  accent: "",
}

interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {
  label: string
  onRemove?: () => void
  color?: ColorScheme
  icon?: React.ReactNode
}

const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  (
    {
      label,
      onRemove,
      variant = "filled",
      size = "md",
      color = "primary",
      icon,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          chipVariants({ variant, size }),
          colorVariants[color],
          className
        )}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{label}</span>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="ml-0.5 rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={`Remove ${label}`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </span>
    )
  }
)
Chip.displayName = "Chip"

export { Chip }
export type { ChipProps }
