/**
 * TerminalView — public API barrel.
 *
 * Consume from `@/ui/terminal`. The canvas slot mounts <TerminalView>, the
 * provider <TerminalProvider> wraps the surface tree, and `useTerminal(ptyId)`
 * gives write/onData/resize/dispose + status/backpressure.
 */

export { TerminalView } from "./terminal-view"
export type { TerminalViewProps, XTerm } from "./terminal-view"

export {
  TerminalProvider,
  useTerminal,
  useTerminalRegistry,
  createBinding,
  FLUSH_WINDOW_MS,
  FRAME_BYTE_CAP,
  BACKPRESSURE_THRESHOLD,
} from "./use-terminal"
export type {
  TerminalBinding,
  TerminalSink,
  TerminalProviderProps,
  TerminalContextValue,
  UseTerminalResult,
} from "./use-terminal"

export {
  type Pty,
  type PtyId,
  type PtyStatus,
  type PtySpawnOptions,
  type PtyFactory,
  type ExitCode,
  setPtyFactory,
  createPty,
} from "./pty"

export { createMockPty } from "./mock-pty"

export { buildXtermTheme, isLightTheme } from "./xterm-theme"

export { TerminalToolbar } from "./terminal-toolbar"
export type { TerminalToolbarProps } from "./terminal-toolbar"

export { TerminalSearch } from "./terminal-search"
export type { TerminalSearchProps } from "./terminal-search"
