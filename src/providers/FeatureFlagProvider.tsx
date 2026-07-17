import { createContext, useCallback, useContext, useMemo, useState } from "react"

interface FeatureFlagContextValue {
  isEnabled: (flag: string) => boolean
  enable: (flag: string) => void
  disable: (flag: string) => void
  setFlags: (flags: Record<string, boolean>) => void
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null)

export function FeatureFlagProvider({
  children,
  defaultFlags = {},
}: {
  children: React.ReactNode
  defaultFlags?: Record<string, boolean>
}) {
  const [flags, setFlagsState] = useState<Record<string, boolean>>(defaultFlags)

  const isEnabled = useCallback((flag: string): boolean => {
    return flags[flag] === true
  }, [flags])

  const enable = useCallback((flag: string) => {
    setFlagsState((prev) => ({ ...prev, [flag]: true }))
  }, [])

  const disable = useCallback((flag: string) => {
    setFlagsState((prev) => ({ ...prev, [flag]: false }))
  }, [])

  const setFlags = useCallback((f: Record<string, boolean>) => {
    setFlagsState(f)
  }, [])

  const value = useMemo<FeatureFlagContextValue>(
    () => ({ isEnabled, enable, disable, setFlags }),
    [isEnabled, enable, disable, setFlags],
  )

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  )
}

export function useFeatureFlag(): FeatureFlagContextValue {
  const ctx = useContext(FeatureFlagContext)
  if (ctx === null) {
    throw new Error("useFeatureFlag must be used within a FeatureFlagProvider")
  }
  return ctx
}
