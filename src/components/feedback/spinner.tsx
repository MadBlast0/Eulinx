import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"
import { Spinner as UISpinner } from "@/components/ui/spinner"

const spinnerVariants = cva("", {
  variants: {
    variant: {
      default: "text-foreground",
      muted: "text-muted-foreground",
    },
    size: {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
      xl: "h-12 w-12",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
})

interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, variant, label, ...props }, ref) => {
    return (
      <span className="inline-flex items-center justify-center" role="status">
        <UISpinner
          ref={ref}
          className={cn(spinnerVariants({ variant, size }), className)}
          {...props}
        />
        {label && <span className="sr-only">{label}</span>}
      </span>
    )
  }
)
Spinner.displayName = "Spinner"

export { Spinner }
export type { SpinnerProps }
