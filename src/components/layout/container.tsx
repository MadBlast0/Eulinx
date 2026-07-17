import * as React from "react"
import { cn } from "@/utils/cn"

const sizeClasses: Record<string, string> = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  full: "max-w-full",
}

export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  size?: keyof typeof sizeClasses
  as?: React.ElementType
}

const Container = React.forwardRef<HTMLElement, ContainerProps>(
  ({ className, size = "lg", as: Component = "div", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "mx-auto w-full px-4 md:px-6 lg:px-8",
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }
)
Container.displayName = "Container"

export { Container }
