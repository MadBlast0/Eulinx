import iconSvg from "@/icon.svg?url"
import { cn } from "@/utils/cn"

export function AppIcon({ className }: { className?: string }) {
  return (
    <img
      src={iconSvg}
      alt="Eulinx"
      className={cn("shrink-0", className)}
      draggable={false}
    />
  )
}
