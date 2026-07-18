/**
 * NodeGraph — Keyboard model (NodeGraph-Part06 + a11y keyboard-model).
 *
 * Wires graph.* commands and pointer/keyboard gestures:
 *  - Delete/Backspace removes the current selection (Tier-1 set).
 *  - Ctrl/Cmd+drag pans (React Flow default), Ctrl/Cmd+click toggles selection.
 *  - Connect mode (graph.connectMode) toggles a cursor + handle highlight and
 *    constrains valid connections using the a11y validateConnection rules.
 *  - graph.addNode, graph.deleteSelection, graph.fitView, graph.zoomIn/Out.
 *
 * No `if (e.key === ...)` at the surface level — commands go through the
 * keymap registry; this module registers the graph.* handlers and supplies a
 * keyboard hook for connect-mode + delete.
 */

import { useCallback, useEffect, useRef } from "react"
import { useReactFlow } from "@xyflow/react"
import { keymapRegistry } from "@/ui/keyboard"
import type { CommandId } from "@/ui/keyboard/keymap-types"
import {
  validateConnection,
  type GraphPort,
} from "@/a11y/keyboard-model"
import { useNodeGraph } from "./use-node-graph"

export type GraphKeyboardOptions = {
  /** Resolved node+port list for connect-mode compatibility checks. */
  ports?: () => GraphPort[]
  /** Whether the canvas currently has focus (gates graph-scoped keys). */
  isFocused?: () => boolean
}

/**
 * Hook: registers the graph.* command handlers (idempotent) and returns a
 * keydown handler for delete + connect-mode commit. Mount once in the designer.
 */
export function useGraphKeyboard(opts: GraphKeyboardOptions = {}): {
  onKeyDown: (e: React.KeyboardEvent) => void
} {
  const { addNode, remove, toggleConnectMode, connectMode, nodes, edges } =
    useNodeGraph()
  const rf = useReactFlow()
  const optsRef = useRef(opts)
  optsRef.current = opts

  // ---- register graph.* command handlers (once) ----
  useEffect(() => {
    const handlers: Array<{ id: CommandId; run: () => void }> = [
      {
        id: "graph.addNode",
        run: () => {
          const center = rf.screenToFlowPosition
            ? rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
            : { x: 0, y: 0 }
          addNode("worker", center, "New Worker")
        },
      },
      {
        id: "graph.deleteSelection",
        run: () => deleteSelection(),
      },
      {
        id: "graph.connectMode",
        run: () => toggleConnectMode(),
      },
      {
        id: "graph.fitView",
        run: () => rf.fitView({ padding: 0.2 }),
      },
      {
        id: "graph.zoomIn",
        run: () => rf.zoomIn(),
      },
      {
        id: "graph.zoomOut",
        run: () => rf.zoomOut(),
      },
    ]
    for (const { id, run } of handlers) {
      if (keymapRegistry.getCommand(id)) continue
      keymapRegistry.registerCommand({
        id,
        title: id,
        category: "Graph",
        description: id,
        palette: true,
        run,
      })
      keymapRegistry.registerBinding({
        commandId: id,
        chords: [],
        scope: "graph",
        when: "graphFocused",
        source: "default",
        enabled: true,
      })
    }
  }, [addNode, remove, toggleConnectMode, rf])

  const deleteSelection = useCallback((): void => {
    const nodeIds = nodes.filter((n) => n.selected).map((n) => n.id)
    const edgeIds = edges.filter((e) => e.selected).map((e) => e.id)
    if (nodeIds.length === 0 && edgeIds.length === 0) return
    remove(nodeIds, edgeIds)
  }, [nodes, edges, remove])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      const focused = optsRef.current.isFocused?.() ?? true
      if (!focused) return

      // Connect mode: Enter commits the hovered target (handled by reducer in
      // the surface); here we only need Delete + Escape at this layer.
      if (e.key === "Delete" || e.key === "Backspace") {
        const target = e.target as HTMLElement | null
        const tag = target?.tagName
        if (tag === "INPUT" || tag === "TEXTAREA") return
        e.preventDefault()
        deleteSelection()
        return
      }
      if (e.key === "Escape" && connectMode) {
        toggleConnectMode()
        return
      }
    },
    [connectMode, deleteSelection, toggleConnectMode],
  )

  return { onKeyDown }
}

/**
 * Pure helper: validate that a pending drag/drop connection is allowed by the
 * Part05 local rules. Returns null if valid, else a reason string.
 */
export function validatePendingConnection(
  source: GraphPort,
  target: GraphPort,
): string | null {
  return validateConnection(source, target)
}

/** Convenience: emit a connect request via the bus. */
export function requestConnect(source: string, target: string, connectFn: (s: string, t: string) => void): void {
  connectFn(source, target)
}
