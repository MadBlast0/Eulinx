import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"

const skeletonVariants = cva("animate-pulse bg-primary/10", {
  variants: {
    variant: {
      text: "h-4 w-full rounded",
      circular: "rounded-full",
      rectangular: "rounded-md",
    },
  },
  defaultVariants: {
    variant: "text",
  },
})

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Skeleton }
