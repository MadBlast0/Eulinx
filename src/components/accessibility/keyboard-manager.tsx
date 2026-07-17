import * as React from "react"
import { ShortcutManager } from "@/utils/shortcut-manager"
import type { ShortcutOptions } from "@/utils/shortcut-manager"

interface ShortcutDef {
  key: string
  handler: () => void
  options?: ShortcutOptions
  description?: string
}

interface KeyboardManagerContextValue {
  enabled: boolean
}

const KeyboardManagerContext = React.createContext<KeyboardManagerContextValue>({ enabled: true })

export interface KeyboardManagerProps {
  shortcuts: ShortcutDef[]
  children: React.ReactNode
  enabled?: boolean
}

function KeyboardManager({ shortcuts, children, enabled = true }: KeyboardManagerProps) {
  const contextValue = React.useMemo(() => ({ enabled }), [enabled])

  const manager = React.useMemo(() => ShortcutManager.getInstance(), [])

  React.useEffect(() => {
    const unregisterFns: (() => void)[] = []

    if (enabled) {
      for (const shortcut of shortcuts) {
        const unregister = manager.register(shortcut.key, shortcut.handler, shortcut.options)
        unregisterFns.push(unregister)
      }
    }

    return () => {
      for (const fn of unregisterFns) {
        fn()
      }
    }
  }, [manager, shortcuts, enabled])

  return (
    <KeyboardManagerContext.Provider value={contextValue}>
      {children}
    </KeyboardManagerContext.Provider>
  )
}

KeyboardManager.displayName = "KeyboardManager"

function useKeyboardShortcut(
  key: string,
  handler: () => void,
  options?: ShortcutOptions
): void {
  const manager = React.useMemo(() => ShortcutManager.getInstance(), [])

  React.useEffect(() => {
    const unregister = manager.register(key, handler, options)
    return unregister
  }, [manager, key, handler, options])
}

export { KeyboardManager, useKeyboardShortcut }
export type { ShortcutDef }
