import * as React from "react"
import { cn } from "@/utils/cn"

interface SafeAreaInsets {
  top: number
  bottom: number
  left: number
  right: number
}

type SafeAreaContextValue = SafeAreaInsets

const SafeAreaContext = React.createContext<SafeAreaContextValue | null>(null)

export interface SafeAreaProviderProps {
  children: React.ReactNode
  className?: string
}

function readSafeAreaProperty(property: string): number {
  try {
    const el = document.createElement("div")
    el.style.position = "fixed"
    el.style.top = "0"
    el.style.left = "0"
    el.style.width = "100%"
    el.style.paddingTop = `env(${property}, 0px)`
    document.body.appendChild(el)
    const value = parseFloat(getComputedStyle(el).paddingTop)
    document.body.removeChild(el)
    return isNaN(value) ? 0 : value
  } catch {
    return 0
  }
}

function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === "undefined") {
    return { top: 0, bottom: 0, left: 0, right: 0 }
  }
  return {
    top: readSafeAreaProperty("safe-area-inset-top"),
    bottom: readSafeAreaProperty("safe-area-inset-bottom"),
    left: readSafeAreaProperty("safe-area-inset-left"),
    right: readSafeAreaProperty("safe-area-inset-right"),
  }
}

function SafeAreaProvider({ children, className }: SafeAreaProviderProps) {
  const [insets, setInsets] = React.useState<SafeAreaInsets>(getSafeAreaInsets)

  React.useEffect(() => {
    setInsets(getSafeAreaInsets())

    const handleResize = () => {
      setInsets(getSafeAreaInsets())
    }

    window.addEventListener("resize", handleResize, { passive: true })
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  const value = React.useMemo(() => insets, [insets])

  return (
    <SafeAreaContext.Provider value={value}>
      <div
        className={cn(className)}
        style={{
          "--safe-area-top": `${insets.top}px`,
          "--safe-area-bottom": `${insets.bottom}px`,
          "--safe-area-left": `${insets.left}px`,
          "--safe-area-right": `${insets.right}px`,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </SafeAreaContext.Provider>
  )
}

SafeAreaProvider.displayName = "SafeAreaProvider"

function useSafeArea(): SafeAreaInsets {
  const ctx = React.useContext(SafeAreaContext)
  if (ctx === null) {
    return { top: 0, bottom: 0, left: 0, right: 0 }
  }
  return ctx
}

export { SafeAreaProvider, useSafeArea }
export type { SafeAreaInsets }
