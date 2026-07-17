export interface ShortcutOptions {
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
}

interface RegisteredShortcut {
  id: number
  key: string
  handler: () => void
  options: ShortcutOptions
}

export class ShortcutManager {
  private static instance: ShortcutManager

  private handlers: RegisteredShortcut[] = []
  private nextId = 0
  private listenerAttached = false

  private constructor() {}

  static getInstance(): ShortcutManager {
    if (!ShortcutManager.instance) {
      ShortcutManager.instance = new ShortcutManager()
    }
    return ShortcutManager.instance
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    for (const shortcut of this.handlers) {
      if (this.matchesEvent(e, shortcut)) {
        e.preventDefault()
        e.stopPropagation()
        shortcut.handler()
        return
      }
    }
  }

  private matchesEvent(e: KeyboardEvent, shortcut: RegisteredShortcut): boolean {
    const targetKey = shortcut.key.toLowerCase()
    const eventKey = e.key.toLowerCase()
    const codeKey = e.code.toLowerCase()

    if (eventKey !== targetKey && codeKey !== targetKey) {
      return false
    }

    const opts = shortcut.options
    if (opts.ctrl === true && !e.ctrlKey) return false
    if (opts.meta === true && !e.metaKey) return false
    if (opts.shift === true && !e.shiftKey) return false
    if (opts.alt === true && !e.altKey) return false

    return true
  }

  register(key: string, handler: () => void, options: ShortcutOptions = {}): () => void {
    const id = ++this.nextId

    this.handlers.push({ id, key: key.toLowerCase(), handler, options })

    if (!this.listenerAttached) {
      document.addEventListener("keydown", this.handleKeyDown)
      this.listenerAttached = true
    }

    return () => {
      this.handlers = this.handlers.filter((h) => h.id !== id)
      if (this.handlers.length === 0 && this.listenerAttached) {
        document.removeEventListener("keydown", this.handleKeyDown)
        this.listenerAttached = false
      }
    }
  }

  unregister(key: string): void {
    const lowerKey = key.toLowerCase()
    this.handlers = this.handlers.filter((h) => h.key !== lowerKey)
    if (this.handlers.length === 0 && this.listenerAttached) {
      document.removeEventListener("keydown", this.handleKeyDown)
      this.listenerAttached = false
    }
  }

  destroy(): void {
    this.handlers = []
    if (this.listenerAttached) {
      document.removeEventListener("keydown", this.handleKeyDown)
      this.listenerAttached = false
    }
    ShortcutManager.instance = undefined as unknown as ShortcutManager
  }
}
