import { memo, type SVGProps } from "react"
import { cn } from "@/utils/cn"
import { getIcon, defaultIcon } from "./icon-registry"

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: string
  className?: string
  size?: number
}

function IconComponent({
  name,
  className,
  size,
  ...props
}: IconProps) {
  const LucideIcon = getIcon(name) ?? defaultIcon
  return <LucideIcon className={cn(className)} size={size} {...props} />
}

export const Icon = memo(IconComponent)
