---
title: Panels Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - panels
  - architecture
related:
  - "[[Panels-Part01]]"
  - "[[Panels-Part03]]"
  - "[[EventBus-Part01]]"
  - "[[Icons-Part01]]"
---

# Panels Specification (Part 02)

The Panel Registry and the Ten Panel Kinds

# The Registry

The `PanelRegistry` is a build-time, frozen map from `PanelKind` to `PanelDescriptor`. It is populated exactly once, at module load, before React renders anything. It is never mutated at runtime. There is no dynamic panel registration in v1; plugin-contributed panels are Future Expansion and are named in Part 05.

```ts
type PanelRegistry = {
  register(descriptor: PanelDescriptor): void;
  get(kind: PanelKind): PanelDescriptor;
  tryGet(kind: PanelKind): PanelDescriptor | null;
  has(kind: PanelKind): boolean;
  all(): readonly PanelDescriptor[];
  byDefaultRegion(region: PanelRegion): readonly PanelDescriptor[];
  freeze(): void;
  isFrozen(): boolean;
};
```

Exact semantics, no interpretation permitted:

- `register(descriptor)` MUST throw `PanelRegistryError` with `kind: "duplicate_kind"` if `descriptor.kind` already exists. It MUST throw `kind: "registry_frozen"` if `freeze()` has run. It MUST throw `kind: "invalid_descriptor"` if `descriptor.title` is empty, if `descriptor.dataSource.commands` contains a name not in the IPC allowlist, or if `descriptor.dataSource.events` contains a name not starting with `Eulinx://`.
- `get(kind)` MUST throw `kind: "unknown_kind"` if absent. It is used only where the kind is statically known.
- `tryGet(kind)` MUST return `null` if absent. It is used during layout restore, where a persisted layout may name a kind that no longer ships. Part 04 specifies dropping such instances.
- `all()` returns descriptors in registration order, which is the order in the table below. This order is the order of the "Open Panel" command palette list in [[KeyboardShortcuts-Part01]].
- `freeze()` MUST run exactly once, immediately after the tenth `register` call, in the same module. After freezing, `register` throws.

```ts
type PanelRegistryError = {
  kind:
    | "duplicate_kind"
    | "registry_frozen"
    | "invalid_descriptor"
    | "unknown_kind";
  panelKind: string;
  message: string;
};
```

The IPC allowlist a descriptor may name is exactly this set and no other:

```text
worker_pause          worker_cancel         worker_terminate
worker_retry          worker_inspect        worker_output_tail
panel_state_load      panel_state_save
theme_list            theme_load            theme_validate
fs_tree_children      artifact_diff         artifact_approve
permission_decide
```

# Component Tree

```text
<PanelRoot>
  <PanelRegistryProvider registry={PANEL_REGISTRY}>
    <PanelLayoutProvider workspaceId={...}>
      <RegionHost region="left">
        <PanelGroupView groupId="g_left_1">
          <PanelTabStrip>
            <PanelTab active />
            <PanelTab />
          </PanelTabStrip>
          <PanelBody>
            <PanelErrorBoundary instanceId="pi_...">
              <PanelMountGate instanceId="pi_...">
                <InspectorPanel {...PanelProps} />
              </PanelMountGate>
            </PanelErrorBoundary>
          </PanelBody>
        </PanelGroupView>
      </RegionHost>
      <RegionHost region="center" />
      <RegionHost region="right" />
      <RegionHost region="bottom" />
      <PanelDragLayer />
    </PanelLayoutProvider>
  </PanelRegistryProvider>
</PanelRoot>
```

`PanelMountGate` is the component that implements `PANEL_LAZY_MOUNT`. It renders `null` until the instance first becomes active, then renders the descriptor's `component` forever, until the idle timer in Part 04 unmounts it. `PanelErrorBoundary` sits OUTSIDE the gate so that a crash during mount is caught.

`PanelDragLayer` renders at `z-index: var(--Eulinx-z-panel-drag)`, which is `200`. It is a sibling of all regions, never a child, so a drag preview is never clipped by a region's `overflow: hidden`.

# The Ten Panel Kinds

Each kind below is normative. The `viewState` type is the exact narrowing of `PanelInstance.viewState` for that kind.

## 1. Inspector

```text
id             inspector
title          "Inspector"
icon           icon-inspector
defaultRegion  right
singleton      false
closable       true
defaultOpen    true
minWidth       --Eulinx-space-16 * 18   (288px)
maxWidth       null
```

Data source: `worker_inspect(workerId)` on mount and on every `Eulinx://worker.state_changed` for `args.workerId`. Also listens `Eulinx://eventbus/service_health_changed` (worker-specific health events should be registered in [[15-api/Contracts/Contracts-Part02]]), `Eulinx://worker.metrics_updated`.

```ts
type InspectorViewState = {
  followSelection: boolean;
  expandedSections: string[];
  scrollTop: number;
  lastSeq: number;
};
```

Empty state: no `args.workerId` set. Render centered text "No worker selected." plus a secondary line "Select a worker in the graph or enable Follow Selection." plus a toggle button bound to `followSelection`.

Error state: `worker_inspect` rejects. `entity_not_found` renders "Worker w_7742 no longer exists." with a Close Panel button and no retry, because retry cannot resurrect it. `ipc_failed` and `ipc_timeout` render "Could not reach the runtime." with a Retry button.

## 2. Artifacts

```text
id             artifacts
title          "Artifacts"
icon           icon-artifact
defaultRegion  right
singleton      true
closable       true
defaultOpen    false
minWidth       --Eulinx-space-16 * 18   (288px)
```

Data source: listens `Eulinx://artifact.created` and `Eulinx://artifact.verified`. It holds no command of its own; the list is built from events plus the initial hydration performed by [[ArtifactManager-Part01]] at workspace open. Selecting a row opens or focuses the Diff panel with `args.artifactId`.

```ts
type ArtifactsViewState = {
  filter: "all" | "pending" | "verified" | "rejected" | "merged";
  sortBy: "created_at" | "worker_id" | "path";
  sortDir: "asc" | "desc";
  selectedArtifactId: string | null;
  scrollTop: number;
  lastSeq: number;
};
```

Empty state: "No artifacts yet." plus "Workers produce artifacts. Nothing has been produced in this session."

Error state: only `decode_failed`, when an event payload fails schema validation. Render the list with a warning strip: "1 artifact event could not be read and was skipped." The panel MUST NOT blank on a single bad payload.

## 3. Diff / Review

```text
id             diff
title          "Review"
icon           icon-diff
defaultRegion  center
singleton      false
closable       true
defaultOpen    false
minWidth       --Eulinx-space-16 * 30   (480px)
```

Data source: `artifact_diff(artifactId)` on mount, `artifact_approve(artifactId, decision)` on user decision, listens `Eulinx://artifact.verified` to reconcile. Fully specified in Part 05.

```ts
type DiffViewState = {
  mode: "unified" | "split";
  collapsedHunkIds: string[];
  scrollTop: number;
  whitespace: "show" | "hide";
  contextLines: number;
  lastSeq: number;
};
```

`contextLines` defaults to `3`. Legal values are `0`, `3`, `8`, and `Infinity` rendered as "Full file". No other value is selectable.

Empty state: `artifact_diff` returns a zero-length `DiffHunk[]`. Render "This artifact changes nothing." and disable Approve, because approving a no-op artifact is meaningless. Reject remains enabled.

Error state: `entity_not_found` renders "Artifact af_...  was withdrawn." and closes the panel after the user acknowledges. `ipc_timeout` renders "The diff is taking too long." with Retry.

## 4. Memory

```text
id             memory
title          "Memory"
icon           icon-memory
defaultRegion  right
singleton      true
closable       true
defaultOpen    false
minWidth       --Eulinx-space-16 * 18   (288px)
```

Data source: `worker_inspect(workerId)` for the worker-scoped slice; workspace memory is read from the hydrated store described in [[MemoryArchitecture-Part01]]. This panel is read-only in v1. It MUST NOT offer an edit control.

```ts
type MemoryViewState = {
  scope: "worker" | "workspace" | "temporary" | "long_term";
  query: string;
  expandedEntryIds: string[];
  scrollTop: number;
  lastSeq: number;
};
```

Empty state: "No memory entries in this scope."

Error state: `permission_denied` renders "This memory scope is not readable from the UI." with no retry.

## 5. Logs

```text
id             logs
title          "Logs"
icon           icon-logs
defaultRegion  bottom
singleton      false
closable       true
defaultOpen    false
minHeight      --Eulinx-space-16 * 3    (192px)
```

Data source: `worker_output_tail(workerId, lines)` on mount with `lines = 500`, then appends from `Eulinx://worker.output_appended` filtered to `args.workerId`.

```ts
type LogsViewState = {
  follow: boolean;
  wrap: boolean;
  levelFilter: ("trace" | "debug" | "info" | "warn" | "error")[];
  search: string;
  scrollTop: number;
  lastSeq: number;
};
```

`follow` defaults to `true`. Any manual scroll upward MUST set `follow = false`. Scrolling back to the bottom MUST set `follow = true`. This is the only auto-scroll behavior permitted in the panel system.

Empty state: "No output yet." with a dim spinner if the worker state is `working`, and no spinner otherwise.

Error state: `ipc_failed` renders a strip above the log body: "Live output disconnected. Showing last known 500 lines." with a Reconnect button. The already-fetched lines MUST remain visible.

## 6. Events

```text
id             events
title          "Events"
icon           icon-events
defaultRegion  bottom
singleton      true
closable       true
defaultOpen    false
minHeight      --Eulinx-space-16 * 3    (192px)
```

Data source: listens to every `Eulinx://` event listed in the shared brief. It is the debug view of [[EventBus-Part01]].

```ts
type EventsViewState = {
  paused: boolean;
  typeFilter: string[];
  entityFilter: string | null;
  maxRows: number;
  scrollTop: number;
  lastSeq: number;
};
```

`maxRows` is fixed at `2000`. Beyond that the oldest row is dropped. The Events panel is the one place where `seq` is rendered as a visible column, because its purpose is diagnosing ordering.

The Events panel is the ONLY panel exempt from the drop-stale-seq rule, and only for display. It renders out-of-order arrivals verbatim and marks them with a warning glyph, because hiding them would defeat the panel. It MUST NOT feed any other panel.

Empty state: "No events captured. The bus is quiet."

Error state: none. A malformed payload renders as a raw JSON row with a `decode_failed` badge.

## 7. Metrics

```text
id             metrics
title          "Metrics"
icon           icon-metrics
defaultRegion  bottom
singleton      true
closable       true
defaultOpen    false
minHeight      --Eulinx-space-16 * 4    (256px)
```

Data source: listens `Eulinx://worker.metrics_updated`. Flush is coalesced at `CARD_METER_FLUSH_MS`, which is `500`, matching [[TerminalCards-Part01]]. The two MUST NOT use different flush rates or the numbers visibly disagree.

```ts
type MetricsViewState = {
  window: "1m" | "5m" | "15m" | "session";
  seriesEnabled: ("tokens" | "cost_usd" | "tool_calls" | "wall_clock_ms")[];
  groupBy: "worker" | "role" | "model" | "none";
  lastSeq: number;
};
```

Empty state: "No metrics for this window."

Error state: none. Missing data renders a gap in the series, never a zero. A zero and a gap are different facts.

## 8. Permissions

```text
id             permissions
title          "Permissions"
icon           icon-permission
defaultRegion  right
singleton      true
closable       false
defaultOpen    true
minWidth       --Eulinx-space-16 * 20   (320px)
```

Data source: listens `Eulinx://permission.requested`, calls `permission_decide(requestId, decision)`. Fully specified in Part 05.

```ts
type PermissionsViewState = {
  expandedRequestIds: string[];
  showResolved: boolean;
  scrollTop: number;
  lastSeq: number;
};
```

`closable` is `false`. This is deliberate and MUST NOT be changed. A user who closes the permissions panel while a worker is blocked on a prompt has deadlocked their own session. The panel may be moved and it may be a background tab, but it cannot be destroyed.

When a request arrives and the panel is not the active tab, the panel MUST emit a badge count on its tab and MUST NOT steal focus. Focus only moves if the runtime sends `Eulinx://panel.focus_requested` for this instance.

Empty state: "No pending permission requests." plus a dim line "Workers will ask here before doing anything unsafe."

Error state: `ipc_failed` on `permission_decide` renders the decision buttons in a failed state with the message "Your decision was not recorded. The request is still pending. Try again." The panel MUST NOT show the request as decided. See the fail-closed rule in Part 05.

## 9. Problems

```text
id             problems
title          "Problems"
icon           icon-problems
defaultRegion  bottom
singleton      true
closable       true
defaultOpen    false
minHeight      --Eulinx-space-16 * 3    (192px)
```

Data source: listens `Eulinx://artifact.verified` for verification failures, `Eulinx://eventbus/service_health_changed` (worker-specific health events should be registered in [[15-api/Contracts/Contracts-Part02]]) for unhealthy workers, and `Eulinx://workspace/fs_changed` (register this event in [[15-api/Contracts/Contracts-Part02]]) for files that moved out from under an open diff. See [[Verification-Part01]].

```ts
type ProblemsViewState = {
  severityFilter: ("error" | "warning" | "info")[];
  sourceFilter: ("verification" | "health" | "filesystem")[];
  selectedProblemId: string | null;
  scrollTop: number;
  lastSeq: number;
};
```

Empty state: "No problems detected."

Error state: none.

## 10. Search

```text
id             search
title          "Search"
icon           icon-search
defaultRegion  left
singleton      true
closable       true
defaultOpen    false
minWidth       --Eulinx-space-16 * 16   (256px)
```

Data source: `fs_tree_children(projectId, path)` walked lazily as results expand. Listens `Eulinx://workspace/fs_changed` (register this event in [[15-api/Contracts/Contracts-Part02]]) to invalidate cached children.

```ts
type SearchViewState = {
  query: string;
  caseSensitive: boolean;
  regex: boolean;
  includeGlob: string;
  excludeGlob: string;
  expandedPaths: string[];
  scrollTop: number;
  lastSeq: number;
};
```

`excludeGlob` defaults to the literal string `"node_modules/**,target/**,.git/**,dist/**"`. This default MUST ship; an unbounded search across `node_modules` is the single most common way to hang the UI thread.

Empty state, no query: "Type to search." Empty state, query with zero results: "No matches for \"<query>\"." with the query escaped, never rendered as HTML.

Error state: `permission_denied` renders "This path is outside the workspace boundary." Path-boundary checks belong to WorkspaceManager and the panel merely reports the refusal.

# Registry Bootstrap Order

The registration order is normative and MUST be exactly this:

```ts
PANEL_REGISTRY.register(INSPECTOR_DESCRIPTOR);
PANEL_REGISTRY.register(ARTIFACTS_DESCRIPTOR);
PANEL_REGISTRY.register(DIFF_DESCRIPTOR);
PANEL_REGISTRY.register(MEMORY_DESCRIPTOR);
PANEL_REGISTRY.register(LOGS_DESCRIPTOR);
PANEL_REGISTRY.register(EVENTS_DESCRIPTOR);
PANEL_REGISTRY.register(METRICS_DESCRIPTOR);
PANEL_REGISTRY.register(PERMISSIONS_DESCRIPTOR);
PANEL_REGISTRY.register(PROBLEMS_DESCRIPTOR);
PANEL_REGISTRY.register(SEARCH_DESCRIPTOR);
PANEL_REGISTRY.freeze();
```

# The Default Layout

`DEFAULT_LAYOUT` is the layout used for a fresh workspace and for corrupt-state fallback in Part 04. It is a constant, not a computation.

```text
left    (collapsed, width fraction 0.18)   [empty]
center  (fraction 1.0)                     [ node graph, owned by WorkspaceLayout ]
right   (width fraction 0.24)              [ Inspector* | Permissions ]
bottom  (height fraction 0.28, collapsed)  [empty]

* = active tab
```

Only `inspector` and `permissions` have `defaultOpen: true`. All eight others open on user action.

# AI Notes

Do not make the registry mutable. A frozen registry is what lets `tryGet` be the only nullable lookup, which is what makes the restore path in Part 04 provably safe.

Do not let a panel subscribe to an event that its descriptor does not declare in `dataSource.events`. The declaration is not documentation, it is the thing the mount gate uses to attach and detach listeners. An undeclared listener leaks past unmount.

Do not give the Permissions panel a close button. Read that section again.

Do not share `lastSeq` between panels. It is per panel instance, per entity. Two Inspector panels on two workers keep two counters.

# Related Documents

- [[Panels-Part01]]
- [[Panels-Part03]]
- [[Panels-Part04]]
- [[Panels-Part05]]
- [[Panels-Diagrams]]
- [[EventBus-Part01]]
- [[ArtifactManager-Part01]]
- [[PermissionManager-Part01]]
- [[Verification-Part01]]
- [[MemoryArchitecture-Part01]]
- [[TerminalCards-Part01]]
- [[DesignTokens-Part01]]
- [[Icons-Part01]]
- [[KeyboardShortcuts-Part01]]
