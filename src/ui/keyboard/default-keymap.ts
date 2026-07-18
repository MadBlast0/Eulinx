/**
 * KeyboardShortcuts — Part 02 default keymap (data, not code).
 *
 * These are the literal default bindings. Every `run` implementation wires to
 * a `commandHandlers` map that other surfaces register into; it NEVER
 * implements command logic itself. For now `run` dispatches a window
 * CustomEvent `eulinx:command:<id>` so any surface can listen, and logs.
 *
 * Command ids are PERMANENT — once shipped they are never renamed.
 */

import { keymapRegistry } from "./keymap-registry"
import { parseChord } from "./chord"
import type { Binding, Command, CommandId } from "./keymap-types"

const COMMAND_EVENT_PREFIX = "eulinx:command:"

/** Surface-registered command implementations. Keyed by CommandId. */
export const commandHandlers = new Map<
  CommandId,
  (args?: unknown) => void | Promise<void>
>()

/** Register a real implementation for a command id. Called by feature surfaces. */
export function registerCommandHandler(
  id: CommandId,
  handler: (args?: unknown) => void | Promise<void>,
): void {
  commandHandlers.set(id, handler)
}

function makeRun(id: CommandId): (args?: unknown) => void {
  return (args?: unknown): void => {
    const handler = commandHandlers.get(id)
    if (handler) {
      void handler(args)
      return
    }
    // Default no-op path: broadcast so a surface can act, and record.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(COMMAND_EVENT_PREFIX + id, { detail: args }))
    }
    // eslint-disable-next-line no-console
    console.debug(`[keymap] dispatched command "${id}" (no handler registered).`)
  }
}

function chord(spec: string): Binding["chords"] {
  return spec.split(" ").map((c) => parseChord(c))
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export const DEFAULT_COMMANDS: Command[] = [
  // --- Palette (reserved entry: Cmd/Ctrl+K) ---
  {
    id: "palette.open",
    title: "Open Command Palette",
    category: "Navigation",
    description: "Open the command palette to search and run any command",
    icon: "command",
    palette: true,
    run: makeRun("palette.open"),
  },
  {
    id: "palette.quickOpen",
    title: "Quick Open",
    category: "Navigation",
    description: "Open the palette pre-filtered for file or worker quick open",
    icon: "file-search",
    palette: true,
    run: makeRun("palette.quickOpen"),
  },

  // --- Workers ---
  {
    id: "worker.create",
    title: "Create New Worker",
    category: "Workers",
    description: "Create a new Worker in the active workspace",
    icon: "plus-circle",
    palette: true,
    run: makeRun("worker.create"),
  },
  {
    id: "worker.next",
    title: "Next Worker",
    category: "Workers",
    description: "Focus the next Worker in the sidebar list",
    icon: "arrow-down",
    palette: true,
    run: makeRun("worker.next"),
  },
  {
    id: "worker.previous",
    title: "Previous Worker",
    category: "Workers",
    description: "Focus the previous Worker in the sidebar list",
    icon: "arrow-up",
    palette: true,
    run: makeRun("worker.previous"),
  },
  {
    id: "worker.nextPane",
    title: "Next Worker Pane",
    category: "Workers",
    description: "Move focus to the next Worker terminal pane",
    palette: true,
    run: makeRun("worker.nextPane"),
  },
  {
    id: "worker.previousPane",
    title: "Previous Worker Pane",
    category: "Workers",
    description: "Move focus to the previous Worker terminal pane",
    palette: true,
    run: makeRun("worker.previousPane"),
  },

  // --- Workflow ---
  {
    id: "workflow.run",
    title: "Run Workflow",
    category: "Workflow",
    description: "Run the selected or focused workflow",
    icon: "play",
    palette: true,
    run: makeRun("workflow.run"),
  },
  {
    id: "workflow.pause",
    title: "Pause Workflow",
    category: "Workflow",
    description: "Pause the running workflow",
    icon: "pause",
    when: "workflowState == 'running'",
    palette: true,
    run: makeRun("workflow.pause"),
  },
  {
    id: "workflow.resume",
    title: "Resume Workflow",
    category: "Workflow",
    description: "Resume a paused workflow",
    icon: "play",
    when: "workflowState == 'paused'",
    palette: true,
    run: makeRun("workflow.resume"),
  },
  {
    id: "workflow.cancel",
    title: "Cancel Workflow",
    category: "Workflow",
    description: "Cancel the running or paused workflow",
    icon: "x-circle",
    palette: true,
    run: makeRun("workflow.cancel"),
  },

  // --- Graph ---
  {
    id: "graph.zoomIn",
    title: "Zoom In",
    category: "Graph",
    description: "Zoom the node graph in",
    icon: "zoom-in",
    when: "graphFocused",
    palette: true,
    run: makeRun("graph.zoomIn"),
  },
  {
    id: "graph.zoomOut",
    title: "Zoom Out",
    category: "Graph",
    description: "Zoom the node graph out",
    icon: "zoom-out",
    when: "graphFocused",
    palette: true,
    run: makeRun("graph.zoomOut"),
  },
  {
    id: "graph.fitView",
    title: "Fit Graph to View",
    category: "Graph",
    description: "Fit all nodes into the visible graph area",
    icon: "maximize",
    when: "graphFocused",
    palette: true,
    run: makeRun("graph.fitView"),
  },
  {
    id: "graph.navigateUp",
    title: "Navigate Node Up",
    category: "Graph",
    description: "Move graph selection up",
    when: "graphFocused",
    palette: true,
    run: makeRun("graph.navigateUp"),
  },
  {
    id: "graph.navigateDown",
    title: "Navigate Node Down",
    category: "Graph",
    description: "Move graph selection down",
    when: "graphFocused",
    palette: true,
    run: makeRun("graph.navigateDown"),
  },
  {
    id: "graph.navigateLeft",
    title: "Navigate Node Left",
    category: "Graph",
    description: "Move graph selection left",
    when: "graphFocused",
    palette: true,
    run: makeRun("graph.navigateLeft"),
  },
  {
    id: "graph.navigateRight",
    title: "Navigate Node Right",
    category: "Graph",
    description: "Move graph selection right",
    when: "graphFocused",
    palette: true,
    run: makeRun("graph.navigateRight"),
  },
  {
    id: "graph.connectMode",
    title: "Toggle Connect Mode",
    category: "Graph",
    description: "Enter or leave edge-connect drag mode",
    icon: "git-branch",
    when: "graphFocused",
    palette: true,
    run: makeRun("graph.connectMode"),
  },

  // --- View ---
  {
    id: "view.toggleSidebar",
    title: "Toggle Sidebar",
    category: "View",
    description: "Show or hide the left sidebar",
    icon: "panel-left",
    palette: true,
    run: makeRun("view.toggleSidebar"),
  },
  {
    id: "view.togglePanel",
    title: "Toggle Bottom Panel",
    category: "View",
    description: "Show or hide the bottom panel",
    icon: "panel-bottom",
    palette: true,
    run: makeRun("view.togglePanel"),
  },
  {
    id: "view.focusGraph",
    title: "Focus Graph",
    category: "View",
    description: "Move focus to the node graph canvas",
    icon: "network",
    palette: true,
    run: makeRun("view.focusGraph"),
  },
  {
    id: "view.focusTerminal",
    title: "Focus Terminal",
    category: "View",
    description: "Move focus to the active terminal",
    palette: true,
    run: makeRun("view.focusTerminal"),
  },
  {
    id: "view.focusInspector",
    title: "Focus Inspector",
    category: "View",
    description: "Move focus to the right inspector",
    palette: true,
    run: makeRun("view.focusInspector"),
  },
  {
    id: "view.cyclePanel",
    title: "Cycle Panel Tab",
    category: "View",
    description: "Cycle to the next bottom panel tab",
    palette: true,
    run: makeRun("view.cyclePanel"),
  },

  // --- Terminal ---
  {
    id: "terminal.escapeFocus",
    title: "Escape Terminal Focus",
    category: "Terminal",
    description: "Return focus from the terminal to the surrounding surface",
    when: "terminalFocused",
    palette: true,
    run: makeRun("terminal.escapeFocus"),
  },
  {
    id: "terminal.findInTerminal",
    title: "Find in Terminal",
    category: "Terminal",
    description: "Open search within the focused terminal",
    icon: "search",
    when: "terminalFocused",
    palette: true,
    run: makeRun("terminal.findInTerminal"),
  },
  {
    id: "terminal.copy",
    title: "Copy from Terminal",
    category: "Terminal",
    description: "Copy selection if present, otherwise send SIGINT (Ctrl+C)",
    when: "terminalFocused",
    palette: true,
    run: makeRun("terminal.copy"),
  },
  {
    id: "terminal.paste",
    title: "Paste into Terminal",
    category: "Terminal",
    description: "Paste the clipboard into the focused terminal",
    when: "terminalFocused",
    palette: true,
    run: makeRun("terminal.paste"),
  },
  {
    id: "terminal.spawn",
    title: "Spawn Terminal",
    category: "Terminal",
    description: "Open a new terminal",
    icon: "terminal",
    palette: true,
    run: makeRun("terminal.spawn"),
  },

  // --- Search ---
  {
    id: "search.open",
    title: "Open Search",
    category: "Search",
    description: "Open the global search surface",
    icon: "search",
    palette: true,
    run: makeRun("search.open"),
  },

  // --- Merge ---
  {
    id: "merge.approve",
    title: "Approve Merge Item",
    category: "Merge",
    description: "Approve the selected merge queue item",
    icon: "check",
    when: "mergeQueueFocused && mergeItemSelected",
    palette: true,
    run: makeRun("merge.approve"),
  },
  {
    id: "merge.reject",
    title: "Reject Merge Item",
    category: "Merge",
    description: "Reject the selected merge queue item",
    icon: "x",
    when: "mergeQueueFocused && mergeItemSelected",
    palette: true,
    run: makeRun("merge.reject"),
  },

  // --- Application ---
  {
    id: "app.openSettings",
    title: "Open Settings",
    category: "Application",
    description: "Open the application settings",
    icon: "settings",
    palette: true,
    run: makeRun("app.openSettings"),
  },
  {
    id: "app.showHelp",
    title: "Show Help",
    category: "Application",
    description: "Open the help and shortcuts overlay",
    icon: "help-circle",
    palette: true,
    run: makeRun("app.showHelp"),
  },
  {
    id: "app.focusNext",
    title: "Focus Next Region",
    category: "Navigation",
    description: "Move focus to the next major region (focus cycle)",
    palette: true,
    run: makeRun("app.focusNext"),
  },
  {
    id: "app.focusPrevious",
    title: "Focus Previous Region",
    category: "Navigation",
    description: "Move focus to the previous major region (focus cycle)",
    palette: true,
    run: makeRun("app.focusPrevious"),
  },
  {
    id: "app.closeTab",
    title: "Close Tab",
    category: "Application",
    description: "Close the focused panel or terminal tab",
    palette: true,
    run: makeRun("app.closeTab"),
  },

  // --- Chord (internal, palette-hidden) ---
  {
    id: "chord.cancel",
    title: "Cancel Pending Chord",
    category: "Application",
    description: "Cancel an in-progress multi-stroke chord",
    palette: false,
    run: makeRun("chord.cancel"),
  },
  {
    id: "chord.escape",
    title: "Escape Overlay",
    category: "Application",
    description: "Close the topmost overlay or modal",
    palette: false,
    run: makeRun("chord.escape"),
  },
]

// ---------------------------------------------------------------------------
// Bindings (default source). Reserved chords: Tab / Shift+Tab / Escape / Cmd+K.
// ---------------------------------------------------------------------------

export const DEFAULT_BINDINGS: Binding[] = [
  // Palette — reserved, cannot be rebound.
  { commandId: "palette.open", chords: chord("Ctrl+K"), scope: "global", source: "default", enabled: true, priority: 0, id: "palette.open#default#0" },
  { commandId: "palette.quickOpen", chords: chord("Ctrl+Shift+K"), scope: "global", source: "default", enabled: true, priority: 0, id: "palette.quickOpen#default#0" },

  // Workers
  { commandId: "worker.create", chords: chord("Ctrl+Shift+N"), scope: "global", source: "default", enabled: true, priority: 0, id: "worker.create#default#0" },
  { commandId: "worker.next", chords: chord("Ctrl+Period"), scope: "global", source: "default", enabled: true, priority: 0, id: "worker.next#default#0" },
  { commandId: "worker.previous", chords: chord("Ctrl+Comma"), scope: "global", source: "default", enabled: true, priority: 0, id: "worker.previous#default#0" },
  { commandId: "worker.nextPane", chords: chord("Alt+Period"), scope: "global", source: "default", enabled: true, priority: 0, id: "worker.nextPane#default#0" },
  { commandId: "worker.previousPane", chords: chord("Alt+Comma"), scope: "global", source: "default", enabled: true, priority: 0, id: "worker.previousPane#default#0" },
  { commandId: "terminal.spawn", chords: chord("Ctrl+T"), scope: "global", source: "default", enabled: true, priority: 0, id: "terminal.spawn#default#0" },

  // Workflow
  { commandId: "workflow.run", chords: chord("Ctrl+Enter"), scope: "global", source: "default", enabled: true, priority: 0, id: "workflow.run#default#0" },
  { commandId: "workflow.pause", chords: chord("Ctrl+Shift+P"), scope: "global", source: "default", enabled: true, priority: 0, id: "workflow.pause#default#0" },
  { commandId: "workflow.resume", chords: chord("Ctrl+Shift+R"), scope: "global", source: "default", enabled: true, priority: 0, id: "workflow.resume#default#0" },
  { commandId: "workflow.cancel", chords: chord("Ctrl+Shift+C"), scope: "global", source: "default", enabled: true, priority: 0, id: "workflow.cancel#default#0" },

  // Graph (graph scope)
  { commandId: "graph.zoomIn", chords: chord("Ctrl+Equal"), scope: "global", source: "default", enabled: true, priority: 0, id: "graph.zoomIn#default#0" },
  { commandId: "graph.zoomOut", chords: chord("Ctrl+Minus"), scope: "global", source: "default", enabled: true, priority: 0, id: "graph.zoomOut#default#0" },
  { commandId: "graph.fitView", chords: chord("Shift+1"), scope: "graph", source: "default", enabled: true, priority: 0, id: "graph.fitView#default#0" },
  { commandId: "graph.navigateUp", chords: chord("ArrowUp"), scope: "graph", source: "default", enabled: true, priority: 0, id: "graph.navigateUp#default#0" },
  { commandId: "graph.navigateDown", chords: chord("ArrowDown"), scope: "graph", source: "default", enabled: true, priority: 0, id: "graph.navigateDown#default#0" },
  { commandId: "graph.navigateLeft", chords: chord("ArrowLeft"), scope: "graph", source: "default", enabled: true, priority: 0, id: "graph.navigateLeft#default#0" },
  { commandId: "graph.navigateRight", chords: chord("ArrowRight"), scope: "graph", source: "default", enabled: true, priority: 0, id: "graph.navigateRight#default#0" },
  { commandId: "graph.connectMode", chords: chord("KeyC"), scope: "graph", source: "default", enabled: true, priority: 0, id: "graph.connectMode#default#0" },

  // View
  { commandId: "view.toggleSidebar", chords: chord("Ctrl+B"), scope: "global", source: "default", enabled: true, priority: 0, id: "view.toggleSidebar#default#0" },
  { commandId: "view.togglePanel", chords: chord("Ctrl+Backquote"), scope: "global", source: "default", enabled: true, priority: 0, id: "view.togglePanel#default#0" },
  { commandId: "view.focusGraph", chords: chord("Ctrl+1"), scope: "global", source: "default", enabled: true, priority: 0, id: "view.focusGraph#default#0" },
  { commandId: "view.focusTerminal", chords: chord("Ctrl+2"), scope: "global", source: "default", enabled: true, priority: 0, id: "view.focusTerminal#default#0" },
  { commandId: "view.focusInspector", chords: chord("Ctrl+3"), scope: "global", source: "default", enabled: true, priority: 0, id: "view.focusInspector#default#0" },
  { commandId: "view.cyclePanel", chords: chord("Ctrl+Shift+Backquote"), scope: "global", source: "default", enabled: true, priority: 0, id: "view.cyclePanel#default#0" },

  // Terminal (terminal scope) — Ctrl+C copy vs SIGINT handled via when + terminalHasSelection.
  { commandId: "terminal.copy", chords: chord("Ctrl+C"), scope: "terminal", source: "default", enabled: true, priority: 0, id: "terminal.copy#default#0" },
  { commandId: "terminal.paste", chords: chord("Ctrl+V"), scope: "terminal", source: "default", enabled: true, priority: 0, id: "terminal.paste#default#0" },
  { commandId: "terminal.findInTerminal", chords: chord("Ctrl+F"), scope: "terminal", source: "default", enabled: true, priority: 0, id: "terminal.findInTerminal#default#0" },
  { commandId: "terminal.escapeFocus", chords: chord("Escape"), scope: "terminal", source: "default", enabled: true, priority: 0, id: "terminal.escapeFocus#default#0" },

  // Search
  { commandId: "search.open", chords: chord("Ctrl+Shift+F"), scope: "global", source: "default", enabled: true, priority: 0, id: "search.open#default#0" },

  // Merge (panel scope)
  { commandId: "merge.approve", chords: chord("Ctrl+Enter"), scope: "panel", source: "default", enabled: true, priority: 0, id: "merge.approve#default#0" },
  { commandId: "merge.reject", chords: chord("Ctrl+Backspace"), scope: "panel", source: "default", enabled: true, priority: 0, id: "merge.reject#default#0" },

  // Application
  { commandId: "app.openSettings", chords: chord("Ctrl+Comma"), scope: "global", source: "default", enabled: true, priority: 0, id: "app.openSettings#default#0" },
  { commandId: "app.showHelp", chords: chord("F1"), scope: "global", source: "default", enabled: true, priority: 0, id: "app.showHelp#default#0" },
  { commandId: "app.focusNext", chords: chord("Tab"), scope: "global", source: "default", enabled: true, priority: 0, id: "app.focusNext#default#0" },
  { commandId: "app.focusPrevious", chords: chord("Shift+Tab"), scope: "global", source: "default", enabled: true, priority: 0, id: "app.focusPrevious#default#0" },
  { commandId: "app.closeTab", chords: chord("Ctrl+W"), scope: "global", source: "default", enabled: true, priority: 0, id: "app.closeTab#default#0" },
]

/** Reserved chords that cannot be rebound (Part 04). */
export const RESERVED_BINDINGS: Binding[] = DEFAULT_BINDINGS.filter((b) =>
  ["palette.open", "app.focusNext", "app.focusPrevious", "terminal.escapeFocus"].includes(b.commandId),
)

/** Register all default commands and bindings into the registry. Idempotent. */
export function installDefaultKeymap(registry: typeof keymapRegistry = keymapRegistry): void {
  for (const cmd of DEFAULT_COMMANDS) {
    if (!registry.getCommand(cmd.id)) registry.registerCommand(cmd)
  }
  for (const b of DEFAULT_BINDINGS) {
    // registerBinding derives id/priority; pass the data minus derived fields.
    registry.registerBinding({
      commandId: b.commandId,
      chords: b.chords,
      scope: b.scope,
      when: b.when,
      source: b.source,
      enabled: b.enabled,
    })
  }
}
