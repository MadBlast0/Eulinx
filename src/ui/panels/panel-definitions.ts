/**
 * Panels — the ten built-in kind definitions (Panels-Part02 §The Ten Panel
 * Kinds, §Registry Bootstrap Order).
 *
 * Each descriptor references its component through `React.lazy`, so a panel
 * kind's implementation code is only fetched when the kind is first mounted
 * (Part 01 philosophy #2: cheap to declare, expensive to mount). The descriptor
 * itself is a plain object registered eagerly at module load.
 *
 * Sizes are expressed as `calc()` over `--Eulinx-space-16` (64px), matching the
 * spec's "--Eulinx-space-16 * N" notation. No raw pixels.
 */

import { lazy } from "react"
import type { PanelDescriptor, PanelKind, PanelRegistry } from "./panels-registry"

// The spec's minWidth notation uses fractions of --Eulinx-space-16 (64px):
//   288px = 64 * 4.5   320px = 64 * 5   256px = 64 * 4   480px = 64 * 7.5
//   192px = 64 * 3
const W_288 = "calc(var(--Eulinx-space-16) * 4.5)"
const W_320 = "calc(var(--Eulinx-space-16) * 5)"
const W_256 = "calc(var(--Eulinx-space-16) * 4)"
const W_480 = "calc(var(--Eulinx-space-16) * 7.5)"
const H_192 = "calc(var(--Eulinx-space-16) * 3)"
const H_256 = "calc(var(--Eulinx-space-16) * 4)"

const InspectorPanel = lazy(() => import("./builtins/inspector-panel"))
const ArtifactsPanel = lazy(() => import("./builtins/artifacts-panel"))
const DiffPanel = lazy(() => import("./builtins/diff-panel"))
const MemoryPanel = lazy(() => import("./builtins/memory-panel"))
const LogsPanel = lazy(() => import("./builtins/logs-panel"))
const EventsPanel = lazy(() => import("./builtins/events-panel"))
const MetricsPanel = lazy(() => import("./builtins/metrics-panel"))
const PermissionsPanel = lazy(() => import("./builtins/permissions-panel"))
const ProblemsPanel = lazy(() => import("./builtins/problems-panel"))
const SearchPanel = lazy(() => import("./builtins/search-panel"))

export const INSPECTOR_DESCRIPTOR: PanelDescriptor = {
  kind: "inspector",
  title: "Inspector",
  icon: "action.inspect",
  defaultRegion: "right",
  singleton: false,
  minWidthToken: W_288,
  minHeightToken: H_192,
  maxWidthToken: null,
  component: InspectorPanel,
  dataSource: {
    commands: ["worker_inspect"],
    events: ["Eulinx://worker.state_changed", "Eulinx://worker.metrics_updated"],
    pollIntervalMs: null,
  },
  closable: true,
  reorderable: true,
  defaultOpen: true,
  keepAlive: false,
}

export const ARTIFACTS_DESCRIPTOR: PanelDescriptor = {
  kind: "artifacts",
  title: "Artifacts",
  icon: "domain.artifact",
  defaultRegion: "right",
  singleton: true,
  minWidthToken: W_288,
  minHeightToken: H_192,
  maxWidthToken: null,
  component: ArtifactsPanel,
  dataSource: {
    commands: [],
    events: ["Eulinx://artifact.created", "Eulinx://artifact.verified"],
    pollIntervalMs: null,
  },
  closable: true,
  reorderable: true,
  defaultOpen: false,
  keepAlive: false,
}

export const DIFF_DESCRIPTOR: PanelDescriptor = {
  kind: "diff",
  title: "Review",
  icon: "domain.merge",
  defaultRegion: "center",
  singleton: false,
  minWidthToken: W_480,
  minHeightToken: H_192,
  maxWidthToken: null,
  component: DiffPanel,
  dataSource: {
    commands: ["artifact_diff", "artifact_approve"],
    events: ["Eulinx://artifact.verified"],
    pollIntervalMs: null,
  },
  closable: true,
  reorderable: true,
  defaultOpen: false,
  keepAlive: false,
}

export const MEMORY_DESCRIPTOR: PanelDescriptor = {
  kind: "memory",
  title: "Memory",
  icon: "domain.memory",
  defaultRegion: "right",
  singleton: true,
  minWidthToken: W_288,
  minHeightToken: H_192,
  maxWidthToken: null,
  component: MemoryPanel,
  dataSource: {
    commands: ["worker_inspect"],
    events: [],
    pollIntervalMs: null,
  },
  closable: true,
  reorderable: true,
  defaultOpen: false,
  keepAlive: false,
}

export const LOGS_DESCRIPTOR: PanelDescriptor = {
  kind: "logs",
  title: "Logs",
  icon: "domain.log",
  defaultRegion: "bottom",
  singleton: false,
  minWidthToken: W_256,
  minHeightToken: H_192,
  maxWidthToken: null,
  component: LogsPanel,
  dataSource: {
    commands: ["worker_output_tail"],
    events: ["Eulinx://worker.output_appended"],
    pollIntervalMs: null,
  },
  closable: true,
  reorderable: true,
  defaultOpen: false,
  // Logs keep buffered output alive across tab switches (Part 01 AI Notes).
  keepAlive: true,
}

export const EVENTS_DESCRIPTOR: PanelDescriptor = {
  kind: "events",
  title: "Events",
  icon: "domain.notification",
  defaultRegion: "bottom",
  singleton: true,
  minWidthToken: W_256,
  minHeightToken: H_192,
  maxWidthToken: null,
  component: EventsPanel,
  dataSource: {
    commands: [],
    events: ["Eulinx://worker.state_changed", "Eulinx://worker.metrics_updated", "Eulinx://artifact.created"],
    pollIntervalMs: null,
  },
  closable: true,
  reorderable: true,
  defaultOpen: false,
  keepAlive: true,
}

export const METRICS_DESCRIPTOR: PanelDescriptor = {
  kind: "metrics",
  title: "Metrics",
  icon: "domain.metrics",
  defaultRegion: "bottom",
  singleton: true,
  minWidthToken: W_256,
  minHeightToken: H_256,
  maxWidthToken: null,
  component: MetricsPanel,
  dataSource: {
    commands: [],
    events: ["Eulinx://worker.metrics_updated"],
    pollIntervalMs: null,
  },
  closable: true,
  reorderable: true,
  defaultOpen: false,
  keepAlive: false,
}

export const PERMISSIONS_DESCRIPTOR: PanelDescriptor = {
  kind: "permissions",
  title: "Permissions",
  icon: "domain.shield",
  defaultRegion: "right",
  singleton: true,
  minWidthToken: W_320,
  minHeightToken: H_192,
  maxWidthToken: null,
  component: PermissionsPanel,
  dataSource: {
    commands: ["permission_decide"],
    events: ["Eulinx://permission.requested"],
    pollIntervalMs: null,
  },
  // Permissions cannot be closed (Part 02: closing it deadlocks the session).
  closable: false,
  reorderable: true,
  defaultOpen: true,
  keepAlive: true,
}

export const PROBLEMS_DESCRIPTOR: PanelDescriptor = {
  kind: "problems",
  title: "Problems",
  icon: "domain.bug",
  defaultRegion: "bottom",
  singleton: true,
  minWidthToken: W_256,
  minHeightToken: H_192,
  maxWidthToken: null,
  component: ProblemsPanel,
  dataSource: {
    commands: [],
    events: ["Eulinx://artifact.verified"],
    pollIntervalMs: null,
  },
  closable: true,
  reorderable: true,
  defaultOpen: false,
  keepAlive: false,
}

export const SEARCH_DESCRIPTOR: PanelDescriptor = {
  kind: "search",
  title: "Search",
  icon: "domain.search",
  defaultRegion: "left",
  singleton: true,
  minWidthToken: W_256,
  minHeightToken: H_192,
  maxWidthToken: null,
  component: SearchPanel,
  dataSource: {
    commands: ["fs_tree_children"],
    events: [],
    pollIntervalMs: null,
  },
  closable: true,
  reorderable: true,
  defaultOpen: false,
  keepAlive: false,
}

/** The ten built-ins in normative registration order (Part 02). */
export const BUILTIN_DESCRIPTORS: readonly PanelDescriptor[] = [
  INSPECTOR_DESCRIPTOR,
  ARTIFACTS_DESCRIPTOR,
  DIFF_DESCRIPTOR,
  MEMORY_DESCRIPTOR,
  LOGS_DESCRIPTOR,
  EVENTS_DESCRIPTOR,
  METRICS_DESCRIPTOR,
  PERMISSIONS_DESCRIPTOR,
  PROBLEMS_DESCRIPTOR,
  SEARCH_DESCRIPTOR,
]

/** Kinds that open by default in a fresh workspace (Part 02 §The Default Layout). */
export const DEFAULT_OPEN_KINDS: readonly PanelKind[] = BUILTIN_DESCRIPTORS.filter(
  (d) => d.defaultOpen,
).map((d) => d.kind)

/**
 * Register the ten built-ins into a registry in normative order. Does NOT
 * freeze — external surfaces may append kinds before the app calls `freeze()`.
 * Idempotent-safe callers should check `registry.has()` first; this throws on a
 * duplicate as the spec requires.
 */
export function registerBuiltinPanels(registry: PanelRegistry): void {
  for (const descriptor of BUILTIN_DESCRIPTORS) {
    registry.register(descriptor)
  }
}
