/**
 * KeyboardShortcuts — barrel export.
 */

export * from "./keymap-types"
export * from "./chord"
export * from "./when-parser"
export {
  keymapRegistry,
  type KeymapRegistryImpl,
} from "./keymap-registry"
export {
  DEFAULT_COMMANDS,
  DEFAULT_BINDINGS,
  RESERVED_BINDINGS,
  commandHandlers,
  registerCommandHandler,
  installDefaultKeymap,
} from "./default-keymap"
export {
  KeymapProvider,
  useKeymap,
  useCommand,
  type KeymapProviderProps,
  type UseKeymapValue,
} from "./use-keyboard"
export {
  CommandPalette,
  ShortcutHelpOverlay,
  type CommandPaletteProps,
  type ShortcutHelpOverlayProps,
} from "./discovery-overlay"
