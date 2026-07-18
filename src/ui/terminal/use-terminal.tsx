/**
 * TerminalView — React context + PTY binding + output batching + backpressure.
 *
 * Responsibilities (TerminalView-Part01 §Responsibilities, Part03 §Output):
 *  - bind a `Pty` to an xterm sink
 *  - batch incoming chunks on a fixed rAF window; never write per-chunk
 *  - enforce a hard per-frame byte cap; paint a truncation marker when it trips
 *  - backpressure: pause input while the pending output exceeds the threshold
 *  - dispose every listener + rAF on unmount (no leaks)
 *
 * The xterm `Terminal` instance is owned by `terminal-view.tsx` via a ref.
 * This module is the bridge: it holds the bytes and flushes them to whatever
 * sink the view registers (`registerSink`). React never sees the byte stream.
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
import {
  createPty,
  type ExitCode,
  type Pty,
  type PtyId,
  type PtySpawnOptions,
  type PtyStatus,
} from "./pty"

/** Fixed flush window. Spec: 16 ms batch window; rAF is the natural flush. */
export const FLUSH_WINDOW_MS = 16

/** Hard per-frame byte cap. Output beyond this in one frame is dropped + marked. */
export const FRAME_BYTE_CAP = 64 * 1024

/** Backpressure threshold: when pending bytes exceed this, input is paused. */
export const BACKPRESSURE_THRESHOLD = 256 * 1024

/** The literal ANSI truncation marker painted when a frame is dropped. */
const TRUNCATION_MARKER = "\r\n\x1b[33m… output truncated (terminal dropped bytes) …\x1b[0m\r\n"

/** A sink that accepts rendered bytes — i.e. `xterm.write`. */
export type TerminalSink = (data: string) => void

/**
 * Framework-free binding between a `Pty` and an xterm sink.
 * Pure logic, unit-testable without React or xterm (see terminal.test.ts).
 */
export interface TerminalBinding {
  readonly id: PtyId
  readonly pty: Pty
  /** Register the xterm sink. Re-registering swaps the sink. */
  registerSink(sink: TerminalSink): void
  /** Subscribe to status changes (spawning/running/exited/detached). */
  onStatus(cb: (status: PtyStatus) => void): () => void
  /** Subscribe to exit codes. */
  onExit(cb: (code: ExitCode) => void): () => void
  /** Push keystrokes to the PTY, gated by backpressure. Returns false if paused. */
  write(data: string): boolean
  /** Current pending (un-flushed) byte count. */
  pendingBytes(): number
  /** True while input is paused due to output backpressure. */
  isInputPaused(): boolean
  /** True once the PTY has exited. */
  hasExited(): boolean
  /** Tear down listeners, rAF, and the PTY. Idempotent. */
  dispose(): void
}

export function createBinding(
  id: PtyId,
  pty: Pty,
  opts: { frameByteCap?: number; backpressureThreshold?: number } = {},
): TerminalBinding {
  const frameByteCap = opts.frameByteCap ?? FRAME_BYTE_CAP
  const backpressureThreshold = opts.backpressureThreshold ?? BACKPRESSURE_THRESHOLD

  let sink: TerminalSink | null = null
  let pending = ""
  let pendingBytesCount = 0
  let rafHandle: number | null = null
  let disposed = false
  let exited = false
  let status: PtyStatus = "spawning"

  const statusListeners = new Set<(s: PtyStatus) => void>()
  const exitListeners = new Set<(c: ExitCode) => void>()

  const setStatus = (next: PtyStatus): void => {
    if (status === next) return
    status = next
    for (const cb of statusListeners) cb(next)
  }

  const flush = (): void => {
    rafHandle = null
    if (disposed || sink === null || pending.length === 0) {
      pending = ""
      pendingBytesCount = 0
      return
    }
    const chunk = pending
    pending = ""
    pendingBytesCount = 0
    sink(chunk)
  }

  const scheduleFlush = (): void => {
    if (rafHandle !== null) return
    if (typeof requestAnimationFrame === "function") {
      rafHandle = requestAnimationFrame(flush)
    } else {
      // No rAF (some test envs): flush on a microtask.
      rafHandle = setTimeout(flush, 0) as unknown as number
    }
  }

  const onData = (data: string): void => {
    if (disposed) return
    if (status === "spawning") setStatus("running")

    const nextBytes = pendingBytesCount + data.length
    if (nextBytes > frameByteCap) {
      // Over the cap: drop the overflow, paint the marker once.
      const room = Math.max(0, frameByteCap - pending.length)
      pending += data.slice(0, room)
      pending += TRUNCATION_MARKER
      pendingBytesCount = pending.length
    } else {
      pending += data
      pendingBytesCount = nextBytes
    }
    scheduleFlush()
  }

  const unlistenData = pty.onData(onData)
  const unlistenExit = pty.onExit((code) => {
    exited = true
    setStatus("exited")
    for (const cb of exitListeners) cb(code)
  })
  const unlistenError = pty.onError(() => {
    // Treat a hard error as exited for the view's gate/overlay.
    exited = true
    setStatus("exited")
  })

  // Mark running shortly after spawn (the mock greets on a microtask).
  if (typeof queueMicrotask === "function") {
    queueMicrotask(() => {
      if (!disposed && status === "spawning") setStatus("running")
    })
  }

  return {
    id,
    pty,
    registerSink(next: TerminalSink): void {
      sink = next
    },
    onStatus(cb: (s: PtyStatus) => void): () => void {
      statusListeners.add(cb)
      return () => {
        statusListeners.delete(cb)
      }
    },
    onExit(cb: (c: ExitCode) => void): () => void {
      exitListeners.add(cb)
      return () => {
        exitListeners.delete(cb)
      }
    },
    write(data: string): boolean {
      if (disposed || exited) return false
      if (pendingBytesCount >= backpressureThreshold) return false
      pty.write(data)
      return true
    },
    pendingBytes(): number {
      return pendingBytesCount
    },
    isInputPaused(): boolean {
      return pendingBytesCount >= backpressureThreshold
    },
    hasExited(): boolean {
      return exited
    },
    dispose(): void {
      if (disposed) return
      disposed = true
      if (rafHandle !== null) {
        if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafHandle)
        else clearTimeout(rafHandle)
        rafHandle = null
      }
      unlistenData()
      unlistenExit()
      unlistenError()
      pty.dispose()
      sink = null
      pending = ""
      pendingBytesCount = 0
    },
  }
}

// ---------------------------------------------------------------------------
// React context: holds the live bindings, keyed by ptyId.
// ---------------------------------------------------------------------------

interface TerminalContextValue {
  getOrCreateBinding: (ptyId: PtyId, options?: PtySpawnOptions) => TerminalBinding
  getBinding: (ptyId: PtyId) => TerminalBinding | undefined
  removeBinding: (ptyId: PtyId) => void
}

export type { TerminalContextValue }

const TerminalContext = createContext<TerminalContextValue | null>(null)

export interface TerminalProviderProps {
  readonly children: ReactNode
  /** Optional explicit factory override (tests / future real bridge). */
  readonly ptyFactory?: (id: PtyId, options?: PtySpawnOptions) => Pty
}

export function TerminalProvider({ children, ptyFactory }: TerminalProviderProps): ReactNode {
  const bindingsRef = useRef<Map<PtyId, TerminalBinding>>(new Map())
  const factoryRef = useRef<typeof createPty>(ptyFactory ?? createPty)

  const value = useMemo<TerminalContextValue>(() => {
    const spawn = (id: PtyId, options?: PtySpawnOptions): Pty =>
      ptyFactory != null ? ptyFactory(id, options) : factoryRef.current(id, options)

    return {
      getOrCreateBinding(id, options) {
        const existing = bindingsRef.current.get(id)
        if (existing) return existing
        const pty = spawn(id, options)
        const binding = createBinding(id, pty)
        bindingsRef.current.set(id, binding)
        return binding
      },
      getBinding(id) {
        return bindingsRef.current.get(id)
      },
      removeBinding(id) {
        const b = bindingsRef.current.get(id)
        if (b) {
          b.dispose()
          bindingsRef.current.delete(id)
        }
      },
    }
  }, [ptyFactory])

  // Dispose every live binding on provider unmount (no orphaned PTYs / rAF).
  useEffect(() => {
    const bindings = bindingsRef.current
    return () => {
      for (const b of bindings.values()) b.dispose()
      bindings.clear()
    }
  }, [])

  return <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>
}

/** Access the terminal binding registry. Must be used within `TerminalProvider`. */
export function useTerminalRegistry(): TerminalContextValue {
  const ctx = useContext(TerminalContext)
  if (ctx === null) {
    throw new Error("useTerminalRegistry must be used within <TerminalProvider>.")
  }
  return ctx
}

export interface UseTerminalResult {
  readonly id: PtyId
  readonly write: (data: string) => boolean
  /** Register the xterm sink (terminal.write). The binding batches into it. */
  readonly registerSink: (sink: TerminalSink) => void
  /** Subscribe to raw PTY output (also forwarded through the batch buffer). */
  readonly onData: (cb: TerminalSink) => () => void
  readonly resize: (cols: number, rows: number) => void
  readonly dispose: () => void
  readonly status: PtyStatus
  readonly inputPaused: boolean
  readonly hasExited: boolean
}

/**
 * The public hook: `useTerminal(ptyId)`. Binds a PTY, exposes write/onData/
 * resize/dispose, and tracks status + backpressure reactively.
 *
 * The component that owns the xterm instance registers its `terminal.write`
 * as the sink via `bindSink`. Bytes flow: pty -> binding (batched) -> sink.
 */
export function useTerminal(ptyId: PtyId, options?: PtySpawnOptions): UseTerminalResult {
  const registry = useTerminalRegistry()
  const bindingRef = useRef<TerminalBinding | null>(null)

  if (bindingRef.current === null) {
    bindingRef.current = registry.getOrCreateBinding(ptyId, options)
  }
  const binding = bindingRef.current

  const [status, setStatus] = useState<PtyStatus>("spawning")
  const [inputPaused, setInputPaused] = useState(false)
  const [exited, setExited] = useState(false)

  useEffect(() => {
    const offStatus = binding.onStatus(setStatus)
    const offExit = binding.onExit(() => setExited(true))
    // Reflect current backpressure on a light interval only while running.
    let raf = 0
    const tick = (): void => {
      const paused = binding.isInputPaused()
      setInputPaused((prev) => (prev === paused ? prev : paused))
      if (!binding.hasExited()) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      offStatus()
      offExit()
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf)
    }
  }, [binding])

  const write = useCallback((data: string): boolean => binding.write(data), [binding])
  const registerSink = useCallback(
    (sink: TerminalSink): void => binding.registerSink(sink),
    [binding],
  )
  const onData = useCallback(
    (cb: TerminalSink): (() => void) => binding.pty.onData(cb),
    [binding],
  )
  const resize = useCallback(
    (cols: number, rows: number): void => binding.pty.resize(cols, rows),
    [binding],
  )
  const dispose = useCallback((): void => registry.removeBinding(ptyId), [registry, ptyId])

  return {
    id: ptyId,
    write,
    registerSink,
    onData,
    resize,
    dispose,
    status,
    inputPaused,
    hasExited: exited,
  }
}
