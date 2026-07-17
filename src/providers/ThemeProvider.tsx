import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ThemeMode } from "@/types/design-system"
import { getItem, setItem } from "@/utils/storage"

const STORAGE_KEY = "eulinx-theme"

type ResolvedTheme = "light" | "dark"

interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  resolvedTheme: ResolvedTheme
}

function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return
  document.documentElement.setAttribute("data-theme", resolved)
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => getItem<ThemeMode>(STORAGE_KEY, "system"))
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches)
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const resolvedTheme: ResolvedTheme = theme === "system"
    ? (systemDark ? "dark" : "light")
    : theme

  useEffect(() => {
    setItem(STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (ctx === null) {
    throw new Error("useThemeContext must be used within a ThemeProvider")
  }
  return ctx
}
