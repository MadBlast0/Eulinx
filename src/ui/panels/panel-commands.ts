/**
 * Panels — keyboard command registration (Panels-Part06,
 * KeyboardShortcuts-Part02 §panel bindings).
 *
 * Registers `panel.*` commands into the shared KeymapRegistry. These are NEW
 * ids not present in `default-keymap.ts` (which owns `view.togglePanel`,
 * `view.cyclePanel`, `app.closeTab` — we do NOT collide with those). The `run`
 * implementations are wired by the app via `registerCommandHandler(id, fn)`;
 * here we only declare the commands + default bindings.
 */

import {
  keymapRegistry,
  parseChord,
  type Binding,
  type Command,
  type CommandId,
} from "@/ui/keyboard"

function chord(spec: string): Binding["chords"] {
  return spec.split(" ").map((c) => parseChord(c))
}

function makeRun(id: CommandId): (args?: unknown) => void {
  return (args?: unknown): void => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(`eulinx:command:${id}`, { detail: args }))
    }
  }
}

/** Panel-specific commands. Ids are permanent once shipped. */
export const PANEL_COMMANDS: Command[] = [
  {
    id: "panel.openInspector",
    title: "Open Inspector Panel",
    category: "View",
    description: "Open (or focus) the Inspector panel",
    icon: "action.inspect",
    palette: true,
    run: makeRun("panel.openInspector"),
  },
  {
    id: "panel.openArtifacts",
    title: "Open Artifacts Panel",
    category: "View",
    description: "Open (or focus) the Artifacts panel",
    icon: "domain.artifact",
    palette: true,
    run: makeRun("panel.openArtifacts"),
  },
  {
    id: "panel.openLogs",
    title: "Open Logs Panel",
    category: "View",
    description: "Open a Logs panel for the focused worker",
    icon: "domain.log",
    palette: true,
    run: makeRun("panel.openLogs"),
  },
  {
    id: "panel.openSearch",
    title: "Open Search Panel",
    category: "View",
    description: "Open (or focus) the Search panel",
    icon: "domain.search",
    palette: true,
    run: makeRun("panel.openSearch"),
  },
  {
    id: "panel.openProblems",
    title: "Open Problems Panel",
    category: "View",
    description: "Open (or focus) the Problems panel",
    icon: "domain.bug",
    palette: true,
    run: makeRun("panel.openProblems"),
  },
  {
    id: "panel.closeActive",
    title: "Close Active Panel",
    category: "View",
    description: "Close the currently focused panel tab",
    icon: "nav.close",
    palette: true,
    run: makeRun("panel.closeActive"),
  },
  {
    id: "panel.nextTab",
    title: "Next Panel Tab",
    category: "View",
    description: "Activate the next tab in the focused panel group",
    palette: true,
    run: makeRun("panel.nextTab"),
  },
  {
    id: "panel.previousTab",
    title: "Previous Panel Tab",
    category: "View",
    description: "Activate the previous tab in the focused panel group",
    palette: true,
    run: makeRun("panel.previousTab"),
  },
  {
    id: "panel.toggleMaximize",
    title: "Maximize / Restore Panel",
    category: "View",
    description: "Maximize the focused panel group within its region, or restore it",
    icon: "nav.expand",
    palette: true,
    run: makeRun("panel.toggleMaximize"),
  },
]

/** Default bindings for the panel commands. */
export const PANEL_BINDINGS: Omit<Binding, "id" | "priority">[] = [
  { commandId: "panel.openSearch", chords: chord("Ctrl+Shift+E"), scope: "global", source: "default", enabled: true },
  { commandId: "panel.openProblems", chords: chord("Ctrl+Shift+M"), scope: "global", source: "default", enabled: true },
  { commandId: "panel.nextTab", chords: chord("Ctrl+PageDown"), scope: "panel", source: "default", enabled: true },
  { commandId: "panel.previousTab", chords: chord("Ctrl+PageUp"), scope: "panel", source: "default", enabled: true },
  { commandId: "panel.toggleMaximize", chords: chord("Ctrl+Shift+Enter"), scope: "panel", source: "default", enabled: true },
]

/**
 * Register the panel commands + bindings. Idempotent: skips commands already
 * present so double-install (HMR) is safe.
 */
export function installPanelKeymap(registry: typeof keymapRegistry = keymapRegistry): void {
  for (const cmd of PANEL_COMMANDS) {
    if (!registry.getCommand(cmd.id)) registry.registerCommand(cmd)
  }
  for (const b of PANEL_BINDINGS) {
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
