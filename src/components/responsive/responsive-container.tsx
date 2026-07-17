import * as React from "react"
import { cn } from "@/utils/cn"
import { useViewportContext } from "@/providers/ViewportProvider"
import type { DeviceType } from "@/types/design-system"

export interface ResponsiveContainerProps {
  children: React.ReactNode
  desktopLayout?: React.ReactNode
  tabletLayout?: React.ReactNode
  mobileLayout?: React.ReactNode
  className?: string
}

function ResponsiveContainer({
  children,
  desktopLayout,
  tabletLayout,
  mobileLayout,
  className,
}: ResponsiveContainerProps) {
  const viewport = useViewportContext()
  const [prevDevice, setPrevDevice] = React.useState<DeviceType>(viewport.device)
  const [transitioning, setTransitioning] = React.useState(false)

  React.useEffect(() => {
    if (prevDevice !== viewport.device) {
      setTransitioning(true)
      setPrevDevice(viewport.device)
      const timer = setTimeout(() => {
        setTransitioning(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [viewport.device, prevDevice])

  const layout = React.useMemo(() => {
    if (viewport.isMobile && mobileLayout !== undefined) return mobileLayout
    if (viewport.isTablet && tabletLayout !== undefined) return tabletLayout
    if (viewport.isDesktop && desktopLayout !== undefined) return desktopLayout
    return children
  }, [viewport.isMobile, viewport.isTablet, viewport.isDesktop, mobileLayout, tabletLayout, desktopLayout, children])

  return (
    <div
      className={cn(
        "transition-opacity duration-300 ease-in-out",
        transitioning ? "opacity-0" : "opacity-100",
        className
      )}
    >
      {layout}
    </div>
  )
}

ResponsiveContainer.displayName = "ResponsiveContainer"

export { ResponsiveContainer }
