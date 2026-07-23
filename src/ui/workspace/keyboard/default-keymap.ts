import type { Binding, Command } from "./keymap-types"
import { keymapRegistry } from "./keymap-registry"

export const DEFAULT_COMMANDS: readonly Command[] = [
  // Application
  { id: "palette.open", title: "Open Command Palette", category: "application" },
  { id: "app.openSettings", title: "Open Settings", category: "application" },
  { id: "app.showHelp", title: "Show Keyboard Shortcuts", category: "application" },
  // Navigation
  { id: "app.focusNext", title: "Focus Next Panel", category: "navigation" },
  { id: "app.focusPrevious", title: "Focus Previous Panel", category: "navigation" },
  { id: "app.closeTab", title: "Close Tab / Surface", category: "navigation" },
  // View
  { id: "view.toggleLeftSidebar", title: "Toggle Left Sidebar", category: "view" },
  { id: "view.toggleRightSidebar", title: "Toggle Right Sidebar", category: "view" },
  { id: "view.toggleBottomPanel", title: "Toggle Bottom Panel", category: "view" },
  // Graph
  { id: "node.delete", title: "Delete Selected Node", category: "graph", when: "nodeSelected" },
  { id: "node.addTerminal", title: "Add Terminal Node", category: "graph" },
  { id: "node.addBrowser", title: "Add Browser Node", category: "graph" },
  { id: "node.addWorker", title: "Add Worker Node", category: "graph" },
  { id: "graph.zoomToFit", title: "Zoom to Fit", category: "graph" },
  { id: "graph.autoLayout", title: "Auto Layout", category: "graph" },
  // Terminal
  { id: "terminal.new", title: "New Terminal Node", category: "terminal" },
  // Workers
  { id: "workers.spawn", title: "Spawn Worker", category: "workers" },
  // Workflow
  { id: "workflow.run", title: "Run Workflow", category: "workflow" },
  // Search
  { id: "search.open", title: "Open Search", category: "search" },
  // Surfaces — navigation
  { id: "surface.dashboard", title: "Open Dashboard", category: "navigation" },
  { id: "surface.memory", title: "Open Memory", category: "navigation" },
  { id: "surface.workers", title: "Open Workers", category: "navigation" },
  { id: "surface.sessions", title: "Open Sessions", category: "navigation" },
  { id: "surface.runtime", title: "Open Runtime Monitor", category: "navigation" },
  { id: "surface.cost", title: "Open Cost Dashboard", category: "navigation" },
  { id: "surface.metrics", title: "Open Metrics", category: "navigation" },
  { id: "surface.prompts", title: "Open Prompt Inspector", category: "navigation" },
  { id: "surface.plugins", title: "Open Plugin Manager", category: "navigation" },
  { id: "surface.tasks", title: "Open Task Board", category: "navigation" },
  { id: "surface.templates", title: "Open Template Gallery", category: "navigation" },
  // Surfaces — Helix
  { id: "surface.helix-search", title: "Open Unified Search", category: "navigation" },
  { id: "surface.helix-dashboard", title: "Open Workspace Dashboard", category: "navigation" },
  { id: "surface.helix-memory-graph", title: "Open Memory Graph", category: "navigation" },
  { id: "surface.helix-knowledge-graph", title: "Open Knowledge Graph", category: "navigation" },
  { id: "surface.helix-causal-trace", title: "Open Causal Trace", category: "navigation" },
  { id: "surface.helix-session-timeline", title: "Open Session Timeline", category: "navigation" },
  { id: "surface.helix-vector-explorer", title: "Open Vector Explorer", category: "navigation" },
  { id: "surface.helix-query-playground", title: "Open Query Playground", category: "navigation" },
  { id: "surface.knowledge", title: "Open Knowledge Workspace", category: "navigation" },
]

export const DEFAULT_BINDINGS: readonly Binding[] = [
  // Application
  { command: "palette.open", chord: "Ctrl+K" },
  { command: "app.openSettings", chord: "Ctrl+Comma" },
  { command: "app.showHelp", chord: "F1" },
  // Navigation
  { command: "app.focusNext", chord: "Ctrl+Right" },
  { command: "app.focusPrevious", chord: "Ctrl+Left" },
  { command: "app.closeTab", chord: "Ctrl+W" },
  // View
  { command: "view.toggleLeftSidebar", chord: "Ctrl+B" },
  { command: "view.toggleRightSidebar", chord: "Ctrl+Shift+B" },
  { command: "view.toggleBottomPanel", chord: "Ctrl+`" },
  // Graph
  { command: "node.delete", chord: "Delete", when: "nodeSelected" },
  { command: "graph.zoomToFit", chord: "Ctrl+Shift+F" },
  { command: "graph.autoLayout", chord: "Shift+A" },
  // Terminal
  { command: "terminal.new", chord: "Ctrl+T" },
  // Workers
  { command: "workers.spawn", chord: "Ctrl+Shift+W" },
  // Workflow
  { command: "workflow.run", chord: "Ctrl+Shift+R" },
  // Search
  { command: "search.open", chord: "Ctrl+F" },
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
