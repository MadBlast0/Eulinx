import * as React from "react"
import { cn } from "@/utils/cn"

const paddingClasses: Record<string, string> = {
  none: "py-0",
  sm: "py-4 md:py-6",
  md: "py-8 md:py-12",
  lg: "py-12 md:py-16 lg:py-20",
}

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType
  padding?: keyof typeof paddingClasses
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, padding = "md", as: Component = "section", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(paddingClasses[padding], className)}
        {...props}
      />
    )
  }
)
Section.displayName = "Section"

export { Section }
