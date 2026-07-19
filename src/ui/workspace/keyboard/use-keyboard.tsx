import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { keymapRegistry } from "./keymap-registry"
import type { KeymapRegistry } from "./keymap-registry"
import type { CommandId, ContextValue } from "./keymap-types"
import { installDefaultKeymap, registerCommandHandler } from "./default-keymap"

interface KeymapContextValue {
  readonly registry: KeymapRegistry
  readonly context: ContextValue
}

const KeymapContext = createContext<KeymapContextValue | null>(null)

function deriveContext(): ContextValue {
  const active = document.activeElement as HTMLElement | null
  const tag = active?.tagName
  const inputFocused =
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    active?.isContentEditable === true
  return {
    workspaceOpen: true,
    paletteOpen: false,
    modalOpen: false,
    terminalFocused: active?.dataset?.role === "terminal",
    graphFocused: active?.dataset?.role === "graph",
    nodeSelected: active?.dataset?.nodeSelected === "true",
    leftSidebarOpen: false,
    rightSidebarOpen: false,
    bottomPanelOpen: false,
    inputFocused,
    selectionEmpty: !(active?.dataset?.nodeSelected === "true"),
  }
}

export function KeymapProvider({ children }: { children: ReactNode }) {
  const registryRef = useRef<KeymapRegistry>(keymapRegistry)
  const [context, setContext] = useState<ContextValue>(() => deriveContext())

  useEffect(() => {
    const registry = registryRef.current
    installDefaultKeymap(registry)

    const sync = () => {
      const ctx = deriveContext()
      registry.setContext(ctx)
      setContext(ctx)
    }
    sync()

    const onKeyDown = (e: KeyboardEvent) => {
      registry.handleKeyDown(e)
    }
    window.addEventListener("keydown", onKeyDown, true)

    const observer = new MutationObserver(sync)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-node-selected", "data-role"],
      subtree: true,
      childList: true,
    })
    document.addEventListener("focusin", sync)
    document.addEventListener("focusout", sync)

    return () => {
      window.removeEventListener("keydown", onKeyDown, true)
      observer.disconnect()
      document.removeEventListener("focusin", sync)
      document.removeEventListener("focusout", sync)
    }
  }, [])

  const value = useMemo<KeymapContextValue>(
    () => ({ registry: registryRef.current, context }),
    [context],
  )

  return <KeymapContext.Provider value={value}>{children}</KeymapContext.Provider>
}

export function useKeymap(): KeymapContextValue {
  const ctx = useContext(KeymapContext)
  if (!ctx) throw new Error("useKeymap must be used within KeymapProvider")
  return ctx
}

/**
 * Register a command handler for the lifetime of the calling component.
 * The handler is invoked when a matching key binding dispatches.
 */
export function useCommand(id: CommandId, handler: () => void): void {
  const { registry } = useKeymap()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const wrapped = () => handlerRef.current()
    registerCommandHandler(id, wrapped)
    return () => {
      // revert to any previously registered default handler
      registry.registerCommandHandler(id, () => {})
    }
  }, [id, registry])
}
