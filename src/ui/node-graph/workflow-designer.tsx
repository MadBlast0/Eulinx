/**
 * NodeGraph — Workflow Designer Surface (P18-UI-WFDESIGN).
 *
 * The React Flow wrapper that renders the graph. It is a PROJECTION of the
 * store owned by <NodeGraphProvider>: it passes `nodes`/`edges` as props and
 * reports gestures via callbacks. View mutations (drag/select/zoom) stay local;
 * graph mutations flow through the EventBus. Consumes the canvas slot of the
 * WorkspaceLayout (mounted by the host surface, not modified here).
 *
 * Features: 17 node kinds, custom node/edge, styled minimap + controls, connect
 * mode, fit-view, multi-select, keyboard delete, viewport culling
 * (onlyRenderVisibleElements), reduced-motion respected, and an accessible DOM
 * mirror (useDomMirror) for screen readers.
 */

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { token } from "@/ui/tokens"
import { Icon } from "@/ui/icons"
import { NodeGraphDomMirror, useDomMirror } from "@/a11y/dom-mirror"
import type { WorkerState } from "@/a11y"
import { useNodeGraph, type NodeGraphProviderProps } from "./use-node-graph"
import { EulinxNode } from "./custom-node"
import { EulinxEdge } from "./custom-edge"
import { GraphMiniMap } from "./graph-minimap"
import { useGraphKeyboard } from "./graph-keyboard"
import { NODE_KINDS, getNodeTypeMeta } from "./node-graph-shared"
import type { EulinxNodeKind } from "./node-graph-shared"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: NodeTypes = { eulinx: EulinxNode as any }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypes: EdgeTypes = { eulinx: EulinxEdge as any }

export type WorkflowDesignerProps = {
  /** Run id context for new nodes. */
  runId?: string
  /** Initial snapshot. */
  initialNodes?: NodeGraphProviderProps["initialNodes"]
  initialEdges?: NodeGraphProviderProps["initialEdges"]
}

export function WorkflowDesigner(_props: WorkflowDesignerProps): ReactNode {
  return <WorkflowCanvas />
}

function WorkflowCanvas(): ReactNode {
  const {
    nodes,
    edges,
    connectMode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    remove,
    toggleConnectMode,
  } = useNodeGraph()

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const { onKeyDown } = useGraphKeyboard({ isFocused: () => true })

  // Accessible DOM mirror (1.3.1 / 1.3.2). Sorted into reading order.
  const mirrorNodes = useMemo(
    () =>
      nodes.map((n, i) => ({
        id: n.id,
        label: n.data.label,
        state: n.data.state as WorkerState,
        order: i,
      })),
    [nodes],
  )
  const mirrorEdges = useMemo(
    () => edges.map((e) => ({ id: e.id, from: e.source, to: e.target })),
    [edges],
  )
  const { mirrorHas } = useDomMirror(mirrorNodes)

  const onSelectionDelete = useCallback((): void => {
    const nodeIds = nodes.filter((n) => n.selected).map((n) => n.id)
    const edgeIds = edges.filter((e) => e.selected).map((e) => e.id)
    if (nodeIds.length || edgeIds.length) remove(nodeIds, edgeIds)
  }, [nodes, edges, remove])

  const cursor = connectMode ? "crosshair" : "default"

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full"
      style={{ background: token("--Eulinx-color-surface"), cursor }}
      data-connect-mode={connectMode ? "true" : undefined}
      onKeyDown={onKeyDown}
      role="application"
      aria-label="Node graph canvas"
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onlyRenderVisibleElements
        minZoom={0.2}
        maxZoom={2.5}
        fitView
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
        onNodesDelete={onSelectionDelete}
        style={{ background: token("--Eulinx-color-surface") }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color={token("--Eulinx-color-border")}
        />
        <Controls
          showInteractive={false}
          style={{
            background: token("--Eulinx-color-surface"),
            border: `${token("--Eulinx-border-thin")} solid ${token("--Eulinx-color-border")}`,
            borderRadius: token("--Eulinx-radius-md"),
            boxShadow: token("--Eulinx-elev-sm"),
          }}
        />
        <GraphMiniMap />
      </ReactFlow>

      <GraphToolbar
        connectMode={connectMode}
        onToggleConnect={toggleConnectMode}
        onAddNode={(kind) => addNode(kind, { x: 80, y: 80 }, getNodeTypeMeta(kind).label)}
      />

      <NodeGraphDomMirror nodes={mirrorNodes} edges={mirrorEdges} />
      <span data-testid="mirror-consistency" data-mirror-has={mirrorHas(nodes[0]?.id ?? "missing") ? "yes" : "no"} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function GraphToolbar({
  connectMode,
  onToggleConnect,
  onAddNode,
}: {
  connectMode: boolean
  onToggleConnect: () => void
  onAddNode: (kind: EulinxNodeKind) => void
}): ReactNode {
  const { setConnectMode } = useNodeGraph()
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        position: "absolute",
        top: token("--Eulinx-space-3"),
        left: token("--Eulinx-space-3"),
        display: "flex",
        gap: token("--Eulinx-space-2"),
        alignItems: "center",
        zIndex: 10,
      }}
    >
      <button
        type="button"
        onClick={() => onAddNode("worker")}
        className="text-role-label"
        style={toolbarBtnStyle(false)}
        aria-label="Add worker node"
      >
        <Icon name="action.add" size="sm" aria-hidden /> Add
      </button>
      <button
        type="button"
        onClick={onToggleConnect}
        className="text-role-label"
        style={toolbarBtnStyle(connectMode)}
        aria-pressed={connectMode}
        aria-label="Toggle connect mode"
      >
        <Icon name="action.link" size="sm" aria-hidden /> Connect
      </button>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-role-label"
        style={toolbarBtnStyle(false)}
        aria-label="Add node of kind"
        aria-expanded={open}
      >
        <Icon name="domain.workflow" size="sm" aria-hidden /> Kinds
      </button>
      {connectMode && (
        <button
          type="button"
          onClick={() => setConnectMode(false)}
          className="text-role-label"
          style={toolbarBtnStyle(false)}
          aria-label="Exit connect mode"
        >
          Exit
        </button>
      )}
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: token("--Eulinx-space-1"),
            background: token("--Eulinx-color-surface"),
            border: `${token("--Eulinx-border-thin")} solid ${token("--Eulinx-color-border")}`,
            borderRadius: token("--Eulinx-radius-md"),
            boxShadow: token("--Eulinx-elev-md"),
            padding: token("--Eulinx-space-1"),
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: token("--Eulinx-space-1"),
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {NODE_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              onClick={() => {
                onAddNode(kind)
                setOpen(false)
              }}
              className="text-role-caption"
              style={{ ...toolbarBtnStyle(false), justifyContent: "flex-start" }}
            >
              <Icon name={getNodeTypeMeta(kind).icon} size="xs" aria-hidden />
              {getNodeTypeMeta(kind).label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function toolbarBtnStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: token("--Eulinx-space-1"),
    padding: `${token("--Eulinx-space-1")} ${token("--Eulinx-space-3")}`,
    borderRadius: token("--Eulinx-radius-md"),
    border: `${token("--Eulinx-border-thin")} solid ${token("--Eulinx-color-border")}`,
    background: active ? token("--Eulinx-color-accent") : token("--Eulinx-color-surface"),
    color: active ? token("--Eulinx-color-surface") : token("--Eulinx-color-text"),
    cursor: "pointer",
  }
}

