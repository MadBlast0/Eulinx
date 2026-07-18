/**
 * KeyboardShortcuts — Part 03 provider + hooks (React surface).
 *
 * `KeymapProvider`:
 *   - attaches the SINGLE window keydown listener (calls `keymapRegistry.handleKeyDown`)
 *   - maintains the scope stack from focus/modal state
 *   - updates context atoms on focus/selection changes
 *   - installs the default keymap on mount
 *
 * The registry itself is a plain TS module (see keymap-registry.ts) and does
 * NOT live in React context. The provider only owns the DOM-side wiring.
 *
 * `useCommand(id, handler)` — register a command implementation from a component.
 * `useKeymap()` — access the registry singleton + reactive conflict/command list.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { keymapRegistry } from "./keymap-registry"
import { installDefaultKeymap, registerCommandHandler } from "./default-keymap"
import { COMMAND_NAMESPACES, type CommandId, type KeymapRegistry, type KeymapConflict, type Scope } from "./keymap-types"

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface UseKeymapValue {
  registry: KeymapRegistry
  /** Push a scope onto the active stack for the lifetime of the owner. */
  pushScope: (scope: Scope, ownerId: string) => void
  popScope: (ownerId: string) => void
  /** Live conflict report (re-renders when it changes). */
  conflicts: KeymapConflict[]
  /** All registered commands (re-renders when commands change). */
  commandCount: number
}

const KeymapContext = createContext<UseKeymapValue | null>(null)

export function useKeymap(): UseKeymapValue {
  const ctx = useContext(KeymapContext)
  if (!ctx) throw new Error("useKeymap must be used within a <KeymapProvider>.")
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface KeymapProviderProps {
  children: ReactNode
  /** When false, skips installing the default keymap (tests may install their own). */
  installDefaults?: boolean
}

export function KeymapProvider({
  children,
  installDefaults = true,
}: KeymapProviderProps): ReactNode {
  const registry = keymapRegistry
  const installed = useRef(false)
  const [conflicts, setConflicts] = useState<KeymapConflict[]>([])
  const [commandCount, setCommandCount] = useState(0)

  // Install defaults + attach the single window keydown listener.
  useEffect(() => {
    if (!installed.current) {
      if (installDefaults) installDefaultKeymap(registry)
      installed.current = true
    }
    const handler = (e: KeyboardEvent): void => {
      registry.handleKeyDown(e)
    }
    window.addEventListener("keydown", handler, { capture: true })
    return () => {
      window.removeEventListener("keydown", handler, { capture: true } as never)
    }
  }, [registry, installDefaults])

  // Reflect scope/context changes reactively for the overlay surfaces.
  const pushScope = useCallback(
    (scope: Scope, ownerId: string): void => {
      registry.pushScope(scope, ownerId)
    },
    [registry],
  )
  const popScope = useCallback(
    (ownerId: string): void => {
      registry.popScope(ownerId)
    },
    [registry],
  )

  // Sync context atoms from the DOM (focus/selection) — no-op if unavailable.
  useEffect(() => {
    const sync = (): void => {
      const active = document.activeElement as HTMLElement | null
      const isTerminal = !!active?.closest('[data-eulinx-surface="terminal"]')
      const isEditor =
        !!active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable)
      const isGraph = !!active?.closest('[data-eulinx-surface="graph"]')
      const isMerge = !!active?.closest('[data-eulinx-surface="merge"]')
      registry.setContext("terminalFocused", isTerminal)
      registry.setContext("editorFocused", isEditor)
      registry.setContext("graphFocused", isGraph)
      registry.setContext("mergeQueueFocused", isMerge)
      registry.setContext("modalOpen", !!document.querySelector('[role="dialog"]'))
      registry.setContext(
        "paletteOpen",
        !!document.querySelector('[data-eulinx-palette="open"]'),
      )
    }
    sync()
    document.addEventListener("focusin", sync)
    document.addEventListener("focusout", sync)
    const mo = new MutationObserver(sync)
    mo.observe(document.body, { childList: true, subtree: true, attributes: true })
    return () => {
      document.removeEventListener("focusin", sync)
      document.removeEventListener("focusout", sync)
      mo.disconnect()
    }
  }, [registry])

  // Expose a tick so overlays can refresh when the registry mutates.
  const refresh = useCallback((): void => {
    setConflicts([...registry.conflicts()])
    setCommandCount(registry.listCommands().length)
  }, [registry])

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, 500)
    return () => window.clearInterval(id)
  }, [refresh])

  const value = useMemo<UseKeymapValue>(
    () => ({
      registry,
      pushScope,
      popScope,
      conflicts,
      commandCount,
    }),
    [registry, pushScope, popScope, conflicts, commandCount],
  )

  return <KeymapContext.Provider value={value}>{children}</KeymapContext.Provider>
}

// ---------------------------------------------------------------------------
// useCommand — register a command implementation for the app lifetime.
// ---------------------------------------------------------------------------

export function useCommand(
  id: CommandId,
  handler: (args?: unknown) => void | Promise<void>,
  deps: readonly unknown[] = [],
): void {
  useEffect(() => {
    if (!COMMAND_NAMESPACES.includes(id.split(".")[0] as never)) {
      throw new Error(`useCommand: "${id}" uses an unknown namespace.`)
    }
    registerCommandHandler(id, handler)
    return () => {
      // handlers map is keyed by id; re-registration overwrites. We leave the
      // last handler in place so other mounts of the same command still work.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
