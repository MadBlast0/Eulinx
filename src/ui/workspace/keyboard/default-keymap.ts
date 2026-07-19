import type { Binding, Command } from "./keymap-types"
import { keymapRegistry } from "./keymap-registry"

export const DEFAULT_COMMANDS: readonly Command[] = [
  { id: "palette.open", title: "Open Command Palette", category: "application" },
  { id: "app.openSettings", title: "Open Settings", category: "application" },
  { id: "app.showHelp", title: "Show Keyboard Shortcuts", category: "application" },
  { id: "app.focusNext", title: "Focus Next", category: "navigation" },
  { id: "app.focusPrevious", title: "Focus Previous", category: "navigation" },
  { id: "app.closeTab", title: "Close Tab", category: "navigation" },
  { id: "view.toggleLeftSidebar", title: "Toggle Left Sidebar", category: "view" },
  { id: "view.toggleRightSidebar", title: "Toggle Right Sidebar", category: "view" },
  { id: "view.toggleBottomPanel", title: "Toggle Bottom Panel", category: "view" },
  { id: "node.delete", title: "Delete Selected Node", category: "graph", when: "nodeSelected" },
  { id: "node.addTerminal", title: "Add Terminal Node", category: "graph" },
  { id: "node.addBrowser", title: "Add Browser Node", category: "graph" },
  { id: "graph.zoomToFit", title: "Zoom to Fit", category: "graph" },
  { id: "graph.autoLayout", title: "Auto Layout", category: "graph" },
  { id: "graph.toggleMinimap", title: "Toggle Minimap", category: "graph" },
  { id: "terminal.new", title: "New Terminal", category: "terminal" },
  { id: "terminal.split", title: "Split Terminal", category: "terminal" },
  { id: "terminal.clear", title: "Clear Terminal", category: "terminal" },
  { id: "workers.spawn", title: "Spawn Worker", category: "workers" },
  { id: "workers.pause", title: "Pause Worker", category: "workers" },
  { id: "workflow.run", title: "Run Workflow", category: "workflow" },
  { id: "search.open", title: "Open Search", category: "search" },
  { id: "surface.dashboard", title: "Open Dashboard", category: "navigation" },
  { id: "surface.memory", title: "Open Memory", category: "navigation" },
  { id: "surface.workers", title: "Open Workers", category: "navigation" },
  { id: "surface.sessions", title: "Open Sessions", category: "navigation" },
  { id: "surface.runtime", title: "Open Runtime Monitor", category: "navigation" },
  { id: "surface.cost", title: "Open Cost Dashboard", category: "navigation" },
  { id: "surface.metrics", title: "Open Metrics", category: "navigation" },
  { id: "surface.prompts", title: "Open Prompt Inspector", category: "navigation" },
]

export const DEFAULT_BINDINGS: readonly Binding[] = [
  { command: "palette.open", chord: "Ctrl+K" },
  { command: "app.openSettings", chord: "Ctrl+Comma" },
  { command: "app.showHelp", chord: "F1" },
  { command: "app.focusNext", chord: "Tab" },
  { command: "app.focusPrevious", chord: "Shift+Tab" },
  { command: "app.closeTab", chord: "Ctrl+W" },
  { command: "view.toggleLeftSidebar", chord: "Ctrl+B" },
  { command: "view.toggleRightSidebar", chord: "Ctrl+Shift+B" },
  { command: "view.toggleBottomPanel", chord: "Ctrl+`" },
  { command: "node.delete", chord: "Delete", when: "nodeSelected" },
  { command: "graph.zoomToFit", chord: "Ctrl+Shift+F" },
  { command: "graph.autoLayout", chord: "Shift+A" },
  { command: "graph.toggleMinimap", chord: "Ctrl+M" },
  { command: "terminal.new", chord: "Ctrl+T" },
  { command: "terminal.split", chord: "Ctrl+Shift+T" },
  { command: "workers.spawn", chord: "Ctrl+Shift+W" },
  { command: "workers.pause", chord: "Ctrl+Shift+P" },
  { command: "workflow.run", chord: "Ctrl+Shift+R" },
  { command: "search.open", chord: "Ctrl+Shift+F" },
]

export const commandHandlers = new Map<
  string,
  () => void
>()

export function registerCommandHandler(id: string, handler: () => void): void {
  commandHandlers.set(id, handler)
  keymapRegistry.registerCommandHandler(id, handler)
}

export function installDefaultKeymap(registry: typeof keymapRegistry = keymapRegistry): void {
  registry.registerCommands(DEFAULT_COMMANDS)
  registry.registerBindings(DEFAULT_BINDINGS)
  for (const [id, handler] of commandHandlers) {
    registry.registerCommandHandler(id, handler)
  }
}
