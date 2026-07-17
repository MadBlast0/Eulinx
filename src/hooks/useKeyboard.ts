import { useEffect, useRef } from "react"

export interface UseKeyboardOptions {
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  enabled?: boolean
}

export function useKeyboard(
  key: string,
  handler: (e: KeyboardEvent) => void,
  options: UseKeyboardOptions = {}
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (options.enabled === false) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetKey = key.toLowerCase()
      const eventKey = e.key.toLowerCase()
      const codeKey = e.code.toLowerCase()

      if (eventKey !== targetKey && codeKey !== targetKey) return
      if (options.ctrl && !e.ctrlKey) return
      if (options.meta && !e.metaKey) return
      if (options.shift && !e.shiftKey) return
      if (options.alt && !e.altKey) return

      handlerRef.current(e)
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [key, options.ctrl, options.meta, options.shift, options.alt, options.enabled])
}
