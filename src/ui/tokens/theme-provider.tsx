/**
 * P18-UI-DASH — Theme Provider
 *
 * Manages light/dark theme switching and applies CSS custom properties.
 * From Themes-Part01 through Part04.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { colors, darkColors } from "./design-tokens"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("eulinx-theme") as Theme) || "system"
    } catch {
      return "system"
    }
  })

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")

    let resolved: "light" | "dark"
    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    } else {
      resolved = theme
    }

    root.classList.add(resolved)
    setResolvedTheme(resolved)

    // Apply CSS custom properties
    const palette = resolved === "dark" ? darkColors : colors
    const vars: Record<string, string> = {}
    for (const [category, values] of Object.entries(palette)) {
      if (typeof values === "object" && values !== null) {
        for (const [key, value] of Object.entries(values)) {
          vars[`--color-${category}-${key}`] = value as string
        }
      }
    }
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value)
    }

    try {
      localStorage.setItem("eulinx-theme", theme)
    } catch {
      // Ignore
    }
  }, [theme])

  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      const resolved = mq.matches ? "dark" : "light"
      setResolvedTheme(resolved)
      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(resolved)
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
