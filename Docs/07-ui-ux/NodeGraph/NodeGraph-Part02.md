---
title: NodeGraph Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - node-graph
  - architecture
related:
  - "[[NodeGraph-Part01]]"
  - "[[NodeGraph-Part03]]"
  - "[[NodeTypes-Part01]]"
  - "[[DesignTokens-Part01]]"
---

# NodeGraph Specification (Part 02)

# Purpose of This Part

This part is the complete visual catalog. For every node kind in [[NodeTypes-Part01]] it gives exact geometry, the port set, the zone layout, the badge rules, and an ASCII rendering.

If a node kind is not in this part, it renders as `unknown`. Implementers MUST NOT invent a node appearance at the call site. Adding a node kind means adding it here first.

# The Node Shell

Every Eulinx node, regardless of kind, is the same shell. Only the accent, the icon, the port set, and the body content differ.

```text
        (in ports on left edge, vertically distributed)
        |
  +-----o-------------------------------------------+
  | ACCENT BAR (4px, kind color, full width)        |
  +-------------------------------------------------+
  |  HEADER ZONE (32px)                             |
  |  [icon 16] Label............... [state dot 8]   |
  +-------------------------------------------------+
  |  BODY ZONE (variable, min 24px)                 |
  |  subtitle / progress / kind-specific content    |
  +-------------------------------------------------+
  |  FOOTER ZONE (20px, hidden if no badges)        |
  |  [model] [attempt] [artifacts]                  |
  +-----o-------------------------------------------+
        |
        (out ports on right edge)
```

## Shell Geometry Constants

These are exact. They are not suggestions.

```ts
export const NODE_GEOMETRY = {
  /** Default node width. All kinds except `merge`, `condition`, `input`, `output`. */
  WIDTH: 220,
  /** Minimum height. Actual height = header + body + footer. */
  MIN_HEIGHT: 76,
  ACCENT_BAR_HEIGHT: 4,
  HEADER_HEIGHT: 32,
  BODY_MIN_HEIGHT: 24,
  FOOTER_HEIGHT: 20,
  BORDER_RADIUS: 8,
  BORDER_WIDTH: 1,
  /** Border width when selected. Applied via outline, NOT border, to avoid reflow. */
  SELECTED_OUTLINE_WIDTH: 2,
  PADDING_X: 10,
  ICON_SIZE: 16,
  STATE_DOT_SIZE: 8,
  /** Port hit target. The visual dot is smaller; the target is this. */
  PORT_HIT_SIZE: 16,
  PORT_VISUAL_SIZE: 8,
  /** Vertical gap between adjacent ports on the same side. */
  PORT_SPACING: 18,
  /** Distance from the top of the node to the first port center. */
  PORT_TOP_OFFSET: 40,
  /** Collapsed node height. Header only. */
  COLLAPSED_HEIGHT: 36,
} as const;
```

## Port Position Algorithm

Ports are placed deterministically. There is no layout pass and no measurement.

```text
1. Filter the node's ports to one side: direction === "in" for left,
   direction === "out" for right.
2. Sort ascending by `ordinal`. Ties are impossible; `ordinal` is unique per side.
   If a tie occurs, it is a backend bug: sort by `portId` lexicographically
   and log `port_ordinal_collision` once per node per session.
3. For index i in the sorted list:
     centerY = PORT_TOP_OFFSET + (i * PORT_SPACING)
     centerX = 0        for direction "in"
     centerX = width    for direction "out"
4. If centerY of the last port exceeds (height - 12), grow the node's body zone
   so that height = PORT_TOP_OFFSET + (count * PORT_SPACING) + 12.
   Ports MUST NOT overflow the shell.
5. Render each port as a React Flow <Handle> with:
     id = portId
     type = "target" for "in", "source" for "out"
     position = Position.Left / Position.Right
     style = { top: centerY, width: PORT_HIT_SIZE, height: PORT_HIT_SIZE }
```

## Zone Rules

```text
ACCENT BAR
  Always rendered. Color = kind accent token. This is the ONLY place kind
  color appears at rest. It is how a user identifies kind at a glance from
  across a zoomed-out canvas.

HEADER
  icon      16x16, kind icon from [[Icons-Part01]], never omitted
  label     data.label, single line, ellipsis at overflow, title attr = full
  stateDot  8x8 circle, color = visual state token, Part 03 owns the mapping

BODY
  Kind-specific. Rendered only above zoom 0.5 (see Part 07 LOD rules).
  Every kind's body is specified below.

FOOTER
  Rendered only if at least one badge is present, at zoom > 0.6.
  modelBadge     shown when data.modelBadge !== ""
  attemptBadge   shown when data.attempt > 1, text = "retry " + attempt
  artifactBadge  shown when data.artifactCount > 0, icon + count
```

# Node Component Props

Every node component receives exactly this. React Flow supplies it.

```ts
import type { NodeProps } from "@xyflow/react";
import type { EulinxNodeData } from "./types";

export type EulinxNodeProps = NodeProps<EulinxNodeData>;
// NodeProps gives: id, data, selected, dragging, zIndex, type,
// positionAbsoluteX, positionAbsoluteY, isConnectable, width, height

/** Every kind component conforms to this. */
export type EulinxNodeComponent = React.MemoExoticComponent<
  React.FC<EulinxNodeProps>
>;

/** The registry passed to <ReactFlow nodeTypes={...} />. MUST be module-level
 *  constant. Defining it inline remounts every node on every render. */
export const nodeTypes: Record<EulinxNodeKind, EulinxNodeComponent> = {
  input: InputNode,
  output: OutputNode,
  worker: WorkerNode,
  orchestrator: OrchestratorNode,
  builder: BuilderNode,
  verifier: VerifierNode,
  condition: ConditionNode,
  loop: LoopNode,
  merge: MergeNode,
  artifact: ArtifactNode,
  memory: MemoryNode,
  tool: ToolNode,
  mcp: McpNode,
  delay: DelayNode,
  human_approval: HumanApprovalNode,
  unknown: UnknownNode,
};
```

# Kind Accent Tokens

Every accent is a token from [[DesignTokens-Part01]]. No hex literals.

```ts
export const KIND_ACCENT: Record<EulinxNodeKind, string> = {
  input:          "var(--Eulinx-accent-terminal)",
  output:         "var(--Eulinx-accent-terminal)",
  worker:         "var(--Eulinx-accent-worker)",
  orchestrator:   "var(--Eulinx-accent-orchestrator)",
  builder:        "var(--Eulinx-accent-builder)",
  verifier:       "var(--Eulinx-accent-verifier)",
  condition:      "var(--Eulinx-accent-control)",
  loop:           "var(--Eulinx-accent-control)",
  merge:          "var(--Eulinx-accent-merge)",
  artifact:       "var(--Eulinx-accent-artifact)",
  memory:         "var(--Eulinx-accent-memory)",
  tool:           "var(--Eulinx-accent-tool)",
  mcp:            "var(--Eulinx-accent-mcp)",
  delay:          "var(--Eulinx-accent-neutral)",
  human_approval: "var(--Eulinx-accent-human)",
  unknown:        "var(--Eulinx-accent-neutral)",
};
```

# Input Node (Start)

The graph entry. Exactly one per run. Rendered as a pill, not a rectangle.

```text
Geometry: width 140, height 36, borderRadius 18
Ports:    zero in-ports. Exactly one out-port.

  +--------------------------+
  | (>) Start             o--+---> control
  +--------------------------+

Ports:
  out.control   ordinal 0   dataType "control"   maxConnections null
```

Body zone: none. Footer: none. The state dot is omitted; an Input node's only meaningful states are `pending` (before run) and `succeeded` (run started). Those are expressed by the accent bar's opacity: 0.4 pending, 1.0 succeeded.

MUST NOT render an in-port. If the snapshot contains an in-port on an `input` node, discard the port, render the node, and log `invalid_port_on_input` once.

# Output Node (End)

The graph terminus. One or more per run.

```text
Geometry: width 140, height 36, borderRadius 18
Ports:    exactly one in-port. Zero out-ports.

  +--------------------------+
control --+--o  End              (#) |
  +--------------------------+

Ports:
  in.control    ordinal 0   dataType "control"   required true   maxConnections null
```

The `(#)` glyph is the run outcome icon: check for `succeeded`, cross for `failed`, dash for `cancelled`, hollow for `pending`.

# Worker Node

A generic AI Worker. See [[Worker-Part01]].

```text
Geometry: width 220, standard shell
Ports:

  in.control    ordinal 0   "control"     required true
  in.context    ordinal 1   "json"        required false
  out.control   ordinal 0   "control"
  out.artifacts ordinal 1   "artifact_set"

  +===============================================+  <- accent: worker
  |  [W] Refactor auth module            (o)     |  <- header, state dot
  +-----------------------------------------------+
o-|  claude-sonnet-4 . 12.4s . 8.2k tok           |  <- body: live stats
o-|  [==================------------]  62%        |  <- progress bar
  +-----------------------------------------------+
  |  [sonnet]  [retry 2]  [3 artifacts]           |  <- footer badges
  +===============================================+
       (out ports on right, omitted in this ASCII for width)
```

Body content:

```text
Line 1  "<modelId> . <elapsed> . <tokens> tok"
        elapsed  = now - startedAt, formatted "12.4s" under 60s, "2m 04s" over.
        tokens   = compact form, "8.2k" over 1000, raw integer under.
        When state is not "running", elapsed freezes at finishedAt - startedAt.
        When startedAt is null, render data.subtitle instead of Line 1.
Line 2  progress bar, 6px tall, full body width minus padding.
        data.progress === null  -> indeterminate: a 30%-wide shuttle that
                                   traverses the track over 1200ms, ease-in-out.
        data.progress 0..1      -> determinate fill, width transition 200ms linear.
        state not "running"     -> Line 2 omitted entirely.
```

# Orchestrator Node

Plans and expands the graph at runtime. See [[Orchestrator-Part01]] and [[DynamicGraphs-Part01]].

```text
Geometry: width 220, standard shell + expansion affordance
Ports:

  in.control    ordinal 0   "control"   required true
  in.goal       ordinal 1   "text"      required true
  out.control   ordinal 0   "control"
  out.plan      ordinal 1   "json"

  +===============================================+  <- accent: orchestrator
  |  [O] Root Orchestrator               (o)     |
  +-----------------------------------------------+
  |  planning . 3 children spawned                |
  |  [==========--------------------]  34%        |
  +-----------------------------------------------+
  |  [opus]  [+7 nodes]                           |  <- expansion badge
  +===============================================+
              |
              v  (double-stroke dependency edges to spawned children)
```

The `[+7 nodes]` footer badge is unique to `orchestrator`. It shows the count of nodes this Orchestrator has inserted into the graph during this run. It MUST be rendered whenever that count is greater than zero, and clicking it MUST select all nodes where `data.isDynamic === true` and whose insertion is attributed to this Orchestrator. Part 06 owns the insertion animation.

An Orchestrator node MUST render a subtle 2px dashed halo (`--Eulinx-halo-orchestrator`) while its state is `running`, distinguishing "this node is thinking about the graph" from "this node is doing work".

# Builder Node

Produces Artifacts. MUST NOT write to the project. See [[BuilderNodes-Part01]].

```text
Geometry: width 220, standard shell
Ports:

  in.control    ordinal 0   "control"       required true
  in.spec       ordinal 1   "text"          required true
  in.context    ordinal 2   "json"          required false
  out.control   ordinal 0   "control"
  out.artifacts ordinal 1   "artifact_set"

  +===============================================+  <- accent: builder
  |  [B] Build login form                (o)     |
  +-----------------------------------------------+
  |  emitting patch artifacts                     |
  |  [=========================-----]  78%        |
  +-----------------------------------------------+
  |  [sonnet]  [2 artifacts]                      |
  +===============================================+
```

The `out.artifacts` port MUST render with the artifact port glyph: a filled diamond rather than a circle. This is how a user sees, without hovering, which port carries Artifacts. Part 05's compatibility matrix enforces the rest.

# Verifier Node

Checks Artifacts. MUST NOT verify its own output. See [[VerifierNodes-Part01]].

```text
Geometry: width 220, standard shell
Ports:

  in.control    ordinal 0   "control"       required true
  in.artifacts  ordinal 1   "artifact_set"  required true
  out.pass      ordinal 0   "control"
  out.fail      ordinal 1   "control"
  out.verdict   ordinal 2   "json"

  +===============================================+  <- accent: verifier
  |  [V] Run test suite                  (o)     |
  +-----------------------------------------------+
  |  deterministic . 41/44 passed                 |
  |  [PASS 41] [FAIL 3] [SKIP 0]                  |  <- verdict chips
  +-----------------------------------------------+
  |  [3 artifacts]                                |
  +===============================================+
```

Body content is verdict-specific and MUST distinguish authority:

```text
Line 1  "<mode> . <summary>"
        mode = "deterministic" | "ai-advisory"
        When mode is "ai-advisory", Line 1 renders in italic and prefixes with
        a caution glyph. Cardinal rule 10 of the vault: AI verdicts are
        advisory, deterministic verification is authoritative. The UI MUST
        make that visible, not merely true.
Line 2  chips. Rendered only when a verdict exists.
        PASS chip  --Eulinx-state-succeeded, hidden when count is 0
        FAIL chip  --Eulinx-state-failed,    hidden when count is 0
        SKIP chip  --Eulinx-accent-neutral,  hidden when count is 0
```

The `out.pass` port dot MUST use `--Eulinx-state-succeeded`; `out.fail` MUST use `--Eulinx-state-failed`. These two are the only ports in Eulinx whose color is not derived from `dataType`.

# Condition Node

Deterministic branching. See [[ConditionNodes-Part01]].

```text
Geometry: width 180, height 72. Diamond-hinted: the shell is a rectangle with
          16px corner cuts on left and right. Not a true rotated diamond;
          rotated shapes break text layout and port math.
Ports:

  in.control    ordinal 0   "control"   required true
  in.value      ordinal 1   "any"       required true
  out.true      ordinal 0   "control"
  out.false     ordinal 1   "control"

   /=============================================\  <- accent: control
  <   [?] tests passed?                  (o)      >
   |---------------------------------------------|
  <   result.failCount == 0                       >   <- body: the expression
   \=============================================/

  out.true  port is at PORT_TOP_OFFSET,      labeled "T" at zoom > 0.75
  out.false port is at PORT_TOP_OFFSET + 18, labeled "F" at zoom > 0.75
```

Body is the raw expression string, monospace, single line, ellipsis at overflow, `title` attribute carries the full expression. When the node has evaluated, the taken branch's out-port renders at full opacity and the untaken branch's out-port renders at 0.35 opacity. Downstream nodes on the untaken branch will arrive as `skipped`; Part 03 owns their appearance.

# Loop Node

Iteration with a mandatory termination guarantee. See [[LoopNodes-Part01]].

```text
Geometry: width 220, standard shell
Ports:

  in.control    ordinal 0   "control"   required true
  in.collection ordinal 1   "json"      required false
  in.feedback   ordinal 2   "any"       required false   <- the back-edge target
  out.body      ordinal 0   "control"
  out.item      ordinal 1   "any"
  out.done      ordinal 2   "control"

  +===============================================+  <- accent: control
  |  [L] Refinement loop                 (o)     |
  +-----------------------------------------------+
  |  while . failCount > 0                        |
  |  iteration 3 of 5                             |
  |  [* * * . .]                                  |  <- iteration pips
  +-----------------------------------------------+
  |  [+2 nodes]                                   |
  +===============================================+
```

Iteration pips: one glyph per allowed iteration, capped at 10 rendered pips. `*` for a completed iteration, `.` for a remaining one. When `iteration.max > 10`, render the text form `3 / 25` instead and omit pips entirely.

When `data.iteration.current === data.iteration.max`, the pip row MUST render in `--Eulinx-state-warning` to signal the loop is about to hit its limit. A loop that exits by limit rather than by condition is a failure mode the user needs to see coming, not discover afterward.

The `in.feedback` port MUST be rendered on the left edge but visually distinguished with a back-arrow glyph, because the edge attaching to it travels right-to-left and Part 03 routes it below the loop body.

# Merge Node

Fan-in barrier. See [[MergeManager-Part01]] for the runtime service; this is the node.

```text
Geometry: width 160, height 56
Ports:

  in.control    ordinal 0..N   "control"   required true   maxConnections null
  out.control   ordinal 0      "control"

  +---------------------------------+  <- accent: merge
o-|  [M] Wait for all       (o)    |
o-|  3 of 4 arrived                |
o-|                                |
  +---------------------------------+
```

The in-port count is dynamic: a Merge node renders exactly `incomingEdgeCount + 1` in-ports, where the extra trailing port is the empty attach target. This is the only node kind whose port set changes as edges are drawn. The port set MUST be recomputed in a `useMemo` keyed on `incomingEdgeCount`, not on every render.

Body is `"<arrived> of <total> arrived"`. While `arrived < total`, the accent bar renders at 0.5 opacity.

# Artifact Node

A materialized Artifact in the graph. See [[Artifact-Part01]].

```text
Geometry: width 200, height 64. Left edge is notched (a document corner-fold
          hint) via a CSS clip-path. Ports are unaffected by the clip.
Ports:

  in.artifact   ordinal 0   "artifact_ref"   required true
  out.artifact  ordinal 0   "artifact_ref"

  +===============================================+  <- accent: artifact
o-|  [A] auth.patch                      (o)   o-|
  |  patch . 4.2 KB . verified                   |
  +===============================================+
```

Body: `"<format> . <size> . <verificationState>"`.

```text
format             "patch" | "code" | "markdown" | "json" | "image" | "test"
size               compact bytes, "4.2 KB", "1.1 MB"
verificationState  "unverified" | "verifying" | "verified" | "rejected"
```

`verified` renders in `--Eulinx-state-succeeded`. `rejected` renders in `--Eulinx-state-failed` AND the whole node gets a 1px `--Eulinx-state-failed` border. An unverified Artifact adjacent to a Merge node is the single most dangerous state in Eulinx; the UI MUST NOT make `unverified` look calm. It renders in `--Eulinx-state-warning`.

# Memory Node

A read or write against the memory system. See [[MemoryArchitecture-Part01]].

```text
Geometry: width 200, height 60
Ports:

  in.control    ordinal 0   "control"     required true
  in.query      ordinal 1   "text"        required false
  out.control   ordinal 0   "control"
  out.result    ordinal 1   "memory_ref"

  +===============================================+  <- accent: memory
o-|  [Mm] Recall auth decisions          (o)   o-|
o-|  read . workspace scope . 4 hits           o-|
  +===============================================+
```

Body: `"<op> . <scope> scope . <hits> hits"`, where op is `read` or `write` and scope is `worker` | `workspace` | `session` | `longterm`. On a `write` op, hits is replaced by `<n> written`.

# Tool Node

A deterministic tool call. See [[Tool-Part01]] and [[ToolRegistry-Part01]].

```text
Geometry: width 200, height 60
Ports:

  in.control    ordinal 0   "control"   required true
  in.args       ordinal 1   "json"      required false
  out.control   ordinal 0   "control"
  out.result    ordinal 1   "json"

  +===============================================+  <- accent: tool
o-|  [T] run_tests                       (o)   o-|
o-|  exit 0 . 1.8s                             o-|
  +===============================================+
```

Body: `"exit <code> . <duration>"` once finished; `data.subtitle` while pending.

# MCP Node

Backed by a Model Context Protocol server. See [[MCPNodes-Part01]].

```text
Geometry: width 220, standard shell
Ports:  dynamic. Derived from the MCP tool's JSON schema at bind time.
        in.control is always ordinal 0, "control", required.
        Every schema property becomes an additional in-port, ordinal 1..N,
        sorted by the schema's own property order, dataType mapped as:
          string  -> "text"    number  -> "number"
          boolean -> "boolean" object  -> "json"
          array   -> "json"    unknown -> "any"
        out.control is always ordinal 0. out.result is ordinal 1, "json".

  +===============================================+  <- accent: mcp
  |  [P] github.create_pr                (o)     |
  +-----------------------------------------------+
o-|  server: github-mcp                          |
o-|  (*) connected                                |  <- connection indicator
  +-----------------------------------------------+
  |  [4 params]                                   |
  +===============================================+
```

The connection indicator is unique to `mcp` and MUST be rendered:

```text
(*)  connected      --Eulinx-state-succeeded
(~)  connecting     --Eulinx-state-info, pulsing 800ms
(!)  unreachable    --Eulinx-state-failed
(?)  unknown        --Eulinx-accent-neutral
```

An `mcp` node whose server is `unreachable` MUST render at 0.6 opacity with a `--Eulinx-state-failed` border, even when its own node state is `pending`. A user must be able to see a dead MCP server before the run reaches it.

# Delay Node

```text
Geometry: width 140, height 36, borderRadius 18 (pill, like input/output)
Ports:
  in.control    ordinal 0   "control"   required true
  out.control   ordinal 0   "control"

  +--------------------------+
o-|  [D] wait 30s      (o) o-|
  +--------------------------+
```

While running, the body is replaced by a countdown: `"18s"`, updating at 1Hz. The countdown MUST be driven by a single shared interval in the store, not by a `setInterval` per node. Part 07 enforces this.

# Human Approval Node

```text
Geometry: width 220, height 92 (taller: it holds action buttons)
Ports:
  in.control    ordinal 0   "control"       required true
  in.artifacts  ordinal 1   "artifact_set"  required false
  out.approve   ordinal 0   "control"
  out.reject    ordinal 1   "control"

  +===============================================+  <- accent: human
  |  [H] Approve merge to main           (o)     |
  +-----------------------------------------------+
o-|  waiting for you . 4m 12s                    |
o-|  +-------------+  +-------------+            |
  |  |  Approve    |  |   Reject    |            |
  |  +-------------+  +-------------+            |
  +===============================================+
```

The buttons MUST be rendered only when `data.state === "running"`. In any other state the body is the outcome: `"approved by user . 4m 12s"` or `"rejected by user"` or `data.subtitle`.

A `human_approval` node in state `running` MUST pulse its accent bar (1400ms, ease-in-out, opacity 0.5 to 1.0) and MUST be included in the canvas's "needs attention" set, which [[WorkspaceLayout-Part01]] surfaces as a badge even when the canvas is not focused. A run blocked on a human that the human cannot see is a product failure.

Clicking Approve calls `invoke("graph_resolve_approval", { runId, nodeId, decision: "approve" })`. The buttons MUST be disabled from click until the resulting `Eulinx://workflow/node_status_changed` (register this event in [[15-api/Contracts/Contracts-Part02]]) event arrives, to prevent a double submit.

# Unknown Node

The fallback. Rendered whenever `data.kind` is not in the registry.

```text
Geometry: width 220, height 76
Ports:  exactly the ports present in the snapshot, rendered generically.
        dataType "any" for all. No compatibility guarantees.

  +===============================================+  <- accent: neutral, dashed
  |  [?] my-plugin.custom_thing          (o)     |
  +-----------------------------------------------+
o-|  Unknown node kind                          o-|
o-|  Install the plugin that provides it.       o-|
  +===============================================+
```

The border MUST be 1px dashed. The node MUST remain selectable and inspectable so a user can read its config and understand what is missing. It MUST NOT be draggable into a connection: `isConnectable` is false for every port on an `unknown` node, because we cannot validate compatibility for a kind we do not know.

# Collapsed Rendering

Any node MAY be collapsed by the user. Collapsed rendering is uniform across kinds.

```text
  +--------------------------------+
  | [icon] Label            (o) [v]|   height 36, header only
  +--------------------------------+

Ports remain rendered and remain connectable. Their centerY is recomputed with
PORT_TOP_OFFSET = 18 and PORT_SPACING = 8, clamped so all ports fit within 36px.
When port count > 4, ports collapse into a single stacked port per side
rendered as a chevron glyph, and hovering it expands a port fan-out popover.
```

Collapse is a view mutation. It writes `NodeViewState.collapsed` and never reaches the backend.

# Rules

Node rendering MUST:

- read every color from a token
- render the accent bar for every kind, always
- keep the header height fixed at 32px regardless of content
- truncate the label rather than grow the node
- render ports from `data.ports`, never from a hardcoded per-kind list at render time
- set `title` on any element that truncates
- wrap every kind component in `React.memo` with the Part 07 comparator

Node rendering MUST NOT:

- change node width based on content
- animate height (it reflows every edge attached to it)
- render body content below zoom 0.5
- render Worker output text
- create a timer per node
- throw on an unrecognized kind, an unrecognized dataType, or a missing port

# Related Documents

- [[NodeGraph-Part01]]
- [[NodeGraph-Part03]]
- [[NodeGraph-Diagrams]]
- [[NodeTypes-Part01]]
- [[EdgeTypes-Part01]]
- [[NodeArchitecture-Part01]]
- [[BuilderNodes-Part01]]
- [[VerifierNodes-Part01]]
- [[ConditionNodes-Part01]]
- [[LoopNodes-Part01]]
- [[MCPNodes-Part01]]
- [[Orchestrator-Part01]]
- [[Worker-Part01]]
- [[Artifact-Part01]]
- [[DesignTokens-Part01]]
- [[Icons-Part01]]
- [[Typography-Part01]]
