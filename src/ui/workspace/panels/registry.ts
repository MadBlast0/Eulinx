import type { ComponentType } from "react"
import {
  Activity,
  BarChart3,
  Bug,
  Database,
  FileSearch,
  GitCompare,
  KeyRound,
  Network,
  PanelRight,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react"

import LogsPanel from "./logs-panel"
import ProblemsPanel from "./problems-panel"
import EventsPanel from "./events-panel"
import InspectorPanel from "./inspector-panel"
import ArtifactsPanel from "./artifacts-panel"
import DiffPanel from "./diff-panel"
import MemoryPanel from "./memory-panel"
import MetricsPanel from "./metrics-panel"
import PermissionsPanel from "./permissions-panel"
import SearchPanel from "./search-panel"

export type PanelKey =
  | "logs"
  | "problems"
  | "events"
  | "inspector"
  | "artifacts"
  | "diff"
  | "memory"
  | "metrics"
  | "permissions"
  | "search"

export interface PanelDefinition {
  readonly title: string
  readonly icon: LucideIcon
  readonly Component: ComponentType
}

export const PANEL_REGISTRY: Record<PanelKey, PanelDefinition> = {
  logs: { title: "Logs", icon: TerminalSquare, Component: LogsPanel },
  problems: { title: "Problems", icon: Bug, Component: ProblemsPanel },
  events: { title: "Events", icon: Activity, Component: EventsPanel },
  inspector: { title: "Inspector", icon: PanelRight, Component: InspectorPanel },
  artifacts: { title: "Artifacts", icon: Network, Component: ArtifactsPanel },
  diff: { title: "Diff", icon: GitCompare, Component: DiffPanel },
  memory: { title: "Memory", icon: Database, Component: MemoryPanel },
  metrics: { title: "Metrics", icon: BarChart3, Component: MetricsPanel },
  permissions: { title: "Permissions", icon: KeyRound, Component: PermissionsPanel },
  search: { title: "Search", icon: FileSearch, Component: SearchPanel },
}

export const PANEL_ORDER: readonly PanelKey[] = [
  "logs",
  "problems",
  "events",
  "inspector",
  "artifacts",
  "diff",
  "memory",
  "metrics",
  "permissions",
  "search",
]

export default PANEL_REGISTRY
