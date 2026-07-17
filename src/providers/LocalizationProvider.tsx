import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { Direction } from "@/types/design-system"

interface TranslationMap {
  [key: string]: string
}

interface LocalizationContextValue {
  locale: string
  setLocale: (l: string) => void
  t: (key: string, params?: Record<string, string>) => string
  direction: Direction
}

const RTL_LOCALES = new Set(["ar", "he", "fa", "ur", "dv", "ku", "ps", "yi"])

function detectDirection(locale: string): Direction {
  const lang = locale.split("-")[0] ?? locale
  return RTL_LOCALES.has(lang) ? "rtl" : "ltr"
}

const FALLBACK_TRANSLATIONS: TranslationMap = {}

const LocalizationContext = createContext<LocalizationContextValue | null>(null)

export function LocalizationProvider({
  children,
  defaultLocale = "en-US",
  translations = FALLBACK_TRANSLATIONS,
}: {
  children: React.ReactNode
  defaultLocale?: string
  translations?: TranslationMap
}) {
  const [locale, setLocaleState] = useState<string>(defaultLocale)

  const setLocale = useCallback((l: string) => {
    setLocaleState(l)
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string>): string => {
      let value = translations[key] ?? translations[`${locale}.${key}`] ?? key
      if (params !== undefined) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{${k}}`, v)
        }
      }
      return value
    },
    [locale, translations],
  )

  const direction = useMemo<Direction>(() => detectDirection(locale), [locale])

  const value = useMemo<LocalizationContextValue>(
    () => ({ locale, setLocale, t, direction }),
    [locale, setLocale, t, direction],
  )

  return (
    <LocalizationContext.Provider value={value}>
      <div dir={direction}>{children}</div>
    </LocalizationContext.Provider>
  )
}

export function useLocaleContext(): LocalizationContextValue {
  const ctx = useContext(LocalizationContext)
  if (ctx === null) {
    throw new Error("useLocaleContext must be used within a LocalizationProvider")
  }
  return ctx
}
