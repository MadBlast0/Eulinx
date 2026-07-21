import { createElement } from "react"
import type { ComponentType } from "react"
import {
  Activity,
  BarChart3,
  Bug,
  Database,
  FileCode2,
  FileSearch,
  GitCompare,
  GitBranch,
  KeyRound,
  Network,
  PanelRight,
  TerminalSquare,
  BookOpen,
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
import QueryPlayground from "./query-playground"
import KnowledgeBasePanel from "../surfaces/knowledge-base-panel"
import SessionTimelinePanel from "./session-timeline"

function SessionTimelineWrapper() {
  return createElement(SessionTimelinePanel, { workspaceId: "default" })
}

function QueryPlaygroundWrapper() {
  return createElement(QueryPlayground, { workspaceId: "default" })
}

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
  | "queryPlayground"
  | "knowledgeBase"
  | "sessionTimeline"

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
  queryPlayground: { title: "Query Playground", icon: FileCode2, Component: QueryPlaygroundWrapper },
  knowledgeBase: { title: "Knowledge Base", icon: BookOpen, Component: KnowledgeBasePanel },
  sessionTimeline: { title: "Timeline", icon: GitBranch, Component: SessionTimelineWrapper },
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
  "queryPlayground",
  "knowledgeBase",
  "sessionTimeline",
]

export default PANEL_REGISTRY
