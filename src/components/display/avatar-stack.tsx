import * as React from "react"
import { cn } from "@/utils/cn"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface AvatarData {
  src?: string
  alt: string
  fallback: string
}

interface AvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  avatars: AvatarData[]
  max?: number
  size?: "sm" | "md" | "lg"
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
} as const

const overlapMap = {
  sm: "-space-x-2",
  md: "-space-x-3",
  lg: "-space-x-4",
} as const

const AvatarStack = React.forwardRef<HTMLDivElement, AvatarStackProps>(
  ({ avatars, max = 4, size = "md", className, ...props }, ref) => {
    const visible = avatars.slice(0, max)
    const overflow = avatars.length - max

    return (
      <div
        ref={ref}
        className={cn("flex items-center", overlapMap[size], className)}
        {...props}
      >
        {visible.map((avatar, i) => (
          <Avatar
            key={`${avatar.alt}-${i}`}
            size={size}
            className="ring-2 ring-background"
          >
            {avatar.src ? (
              <AvatarImage src={avatar.src} alt={avatar.alt} size={size} />
            ) : null}
            <AvatarFallback size={size}>{avatar.fallback}</AvatarFallback>
          </Avatar>
        ))}
        {overflow > 0 && (
          <div
            className={cn(
              "flex items-center justify-center rounded-full bg-muted ring-2 ring-background",
              sizeMap[size]
            )}
          >
            <span className="text-xs font-medium text-muted-foreground">
              +{overflow}
            </span>
          </div>
        )}
      </div>
    )
  }
)
AvatarStack.displayName = "AvatarStack"

export { AvatarStack }
export type { AvatarStackProps, AvatarData }
