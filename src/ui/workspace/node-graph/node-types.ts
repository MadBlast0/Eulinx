export type EulinxNodeKind =
  | "terminal"
  | "browser"
  | "map"
  | "worker"
  | "agent"
  | "session"
  | "memory"
  | "prompt"
  | "merge"
  | "router"
  | "tool"
  | "file"
  | "event"
  | "metric"
  | "log"
  | "note"
  | "unknown"

export interface NodeTypeMeta {
  readonly label: string
  readonly iconName: string
  readonly accentVar: string
}

const TERMINAL = "var(--Eulinx-color-node-terminal)"
const BROWSER = "var(--Eulinx-color-node-browser)"
const MAP = "var(--Eulinx-color-node-map)"
const WORKER = "var(--Eulinx-color-node-worker)"

export const NODE_TYPE_META: Record<EulinxNodeKind, NodeTypeMeta> = {
  terminal: { label: "Terminal", iconName: "terminal", accentVar: TERMINAL },
  browser: { label: "Browser", iconName: "api", accentVar: BROWSER },
  map: { label: "Map", iconName: "map", accentVar: MAP },
  worker: { label: "Worker", iconName: "graph", accentVar: WORKER },
  agent: { label: "Agent", iconName: "aiAgent", accentVar: WORKER },
  session: { label: "Session", iconName: "network", accentVar: TERMINAL },
  memory: { label: "Memory", iconName: "harddrive", accentVar: MAP },
  prompt: { label: "Prompt", iconName: "prompt", accentVar: WORKER },
  merge: { label: "Merge", iconName: "merge", accentVar: TERMINAL },
  router: { label: "Router", iconName: "split", accentVar: BROWSER },
  tool: { label: "Tool", iconName: "tool", accentVar: TERMINAL },
  file: { label: "File", iconName: "file", accentVar: TERMINAL },
  event: { label: "Event", iconName: "event", accentVar: MAP },
  metric: { label: "Metric", iconName: "diagnostics", accentVar: BROWSER },
  log: { label: "Log", iconName: "logs", accentVar: TERMINAL },
  note: { label: "Note", iconName: "note", accentVar: MAP },
  unknown: { label: "Node", iconName: "variables", accentVar: TERMINAL },
}

export function getNodeTypeMeta(kind: EulinxNodeKind): NodeTypeMeta {
  return NODE_TYPE_META[kind] ?? NODE_TYPE_META.unknown
}