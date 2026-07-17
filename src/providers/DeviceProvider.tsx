import { createContext, useContext } from "react"
import { useDevice } from "@/hooks/useDevice"
import type { DeviceInfo } from "@/hooks/useDevice"

const DeviceContext = createContext<DeviceInfo | null>(null)

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const device = useDevice()
  return (
    <DeviceContext.Provider value={device}>
      {children}
    </DeviceContext.Provider>
  )
}

export function useDeviceContext(): DeviceInfo {
  const ctx = useContext(DeviceContext)
  if (ctx === null) {
    throw new Error("useDeviceContext must be used within a DeviceProvider")
  }
  return ctx
}
