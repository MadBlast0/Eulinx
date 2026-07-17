import { createContext, useContext } from "react"
import { useViewport } from "@/hooks/useViewport"
import type { ViewportInfo } from "@/types/design-system"

const ViewportContext = createContext<ViewportInfo | null>(null)

export function ViewportProvider({ children }: { children: React.ReactNode }) {
  const viewport = useViewport()
  return (
    <ViewportContext.Provider value={viewport}>
      {children}
    </ViewportContext.Provider>
  )
}

export function useViewportContext(): ViewportInfo {
  const ctx = useContext(ViewportContext)
  if (ctx === null) {
    throw new Error("useViewportContext must be used within a ViewportProvider")
  }
  return ctx
}
