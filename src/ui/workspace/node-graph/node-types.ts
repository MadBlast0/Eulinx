import {
  Activity,
  Bot,
  Boxes,
  Braces,
  FileText,
  GitMerge,
  Globe,
  HardDrive,
  Map as MapIcon,
  MessageSquare,
  Network,
  ScrollText,
  Split,
  StickyNote,
  TerminalSquare,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react"

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
  readonly icon: LucideIcon
  readonly accentVar: string
}

const TERMINAL = "var(--Eulinx-color-node-terminal)"
const BROWSER = "var(--Eulinx-color-node-browser)"
const MAP = "var(--Eulinx-color-node-map)"
const WORKER = "var(--Eulinx-color-node-worker)"

export const NODE_TYPE_META: Record<EulinxNodeKind, NodeTypeMeta> = {
  terminal: { label: "Terminal", icon: TerminalSquare, accentVar: TERMINAL },
  browser: { label: "Browser", icon: Globe, accentVar: BROWSER },
  map: { label: "Map", icon: MapIcon, accentVar: MAP },
  worker: { label: "Worker", icon: Boxes, accentVar: WORKER },
  agent: { label: "Agent", icon: Bot, accentVar: WORKER },
  session: { label: "Session", icon: Network, accentVar: TERMINAL },
  memory: { label: "Memory", icon: HardDrive, accentVar: MAP },
  prompt: { label: "Prompt", icon: MessageSquare, accentVar: WORKER },
  merge: { label: "Merge", icon: GitMerge, accentVar: TERMINAL },
  router: { label: "Router", icon: Split, accentVar: BROWSER },
  tool: { label: "Tool", icon: Wrench, accentVar: TERMINAL },
  file: { label: "File", icon: FileText, accentVar: TERMINAL },
  event: { label: "Event", icon: Zap, accentVar: MAP },
  metric: { label: "Metric", icon: Activity, accentVar: BROWSER },
  log: { label: "Log", icon: ScrollText, accentVar: TERMINAL },
  note: { label: "Note", icon: StickyNote, accentVar: MAP },
  unknown: { label: "Node", icon: Braces, accentVar: TERMINAL },
}

export function getNodeTypeMeta(kind: EulinxNodeKind): NodeTypeMeta {
  return NODE_TYPE_META[kind] ?? NODE_TYPE_META.unknown
}
