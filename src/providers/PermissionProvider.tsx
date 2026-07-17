import { createContext, useCallback, useContext, useMemo, useState } from "react"

export type PermissionResult = "granted" | "denied" | "prompt"

interface PermissionContextValue {
  requestPermission: (id: string) => PermissionResult
  revokePermission: (id: string) => void
  hasPermission: (id: string) => boolean
  permissions: Record<string, boolean>
}

const PermissionContext = createContext<PermissionContextValue | null>(null)

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})

  const requestPermission = useCallback((id: string): PermissionResult => {
    const current = permissions[id]
    if (current === true) return "granted"
    const result: PermissionResult = Math.random() > 0.1 ? "granted" : "denied"
    if (result === "granted") {
      setPermissions((prev) => ({ ...prev, [id]: true }))
    }
    return result
  }, [permissions])

  const revokePermission = useCallback((id: string) => {
    setPermissions((prev) => {
      return Object.fromEntries(
        Object.entries(prev).filter(([key]) => key !== id)
      ) as Record<string, boolean>
    })
  }, [])

  const hasPermission = useCallback((id: string): boolean => {
    return permissions[id] === true
  }, [permissions])

  const value = useMemo<PermissionContextValue>(
    () => ({ requestPermission, revokePermission, hasPermission, permissions }),
    [requestPermission, revokePermission, hasPermission, permissions],
  )

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissionContext(): PermissionContextValue {
  const ctx = useContext(PermissionContext)
  if (ctx === null) {
    throw new Error("usePermissionContext must be used within a PermissionProvider")
  }
  return ctx
}
