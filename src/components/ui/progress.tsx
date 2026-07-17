import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"

const progressVariants = cva("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", {
  variants: {
    variant: {
      default: "[&>div]:bg-primary",
      success: "[&>div]:bg-green-500",
      warning: "[&>div]:bg-yellow-500",
      destructive: "[&>div]:bg-destructive",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface ProgressProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, "color">,
    VariantProps<typeof progressVariants> {
  value?: number
}

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(progressVariants({ variant }), className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
