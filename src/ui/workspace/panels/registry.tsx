import type { ComponentType } from "react"

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
  return <SessionTimelinePanel workspaceId="default" />
}

function QueryPlaygroundWrapper() {
  return <QueryPlayground workspaceId="default" />
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
  readonly iconName: string
  readonly Component: ComponentType
}

export const PANEL_REGISTRY: Record<PanelKey, PanelDefinition> = {
  logs: { title: "Logs", iconName: "terminal", Component: LogsPanel },
  problems: { title: "Problems", iconName: "diagnostics", Component: ProblemsPanel },
  events: { title: "Events", iconName: "events", Component: EventsPanel },
  inspector: { title: "Inspector", iconName: "files", Component: InspectorPanel },
  artifacts: { title: "Artifacts", iconName: "artifacts", Component: ArtifactsPanel },
  diff: { title: "Diff", iconName: "conditions", Component: DiffPanel },
  memory: { title: "Memory", iconName: "memory", Component: MemoryPanel },
  metrics: { title: "Metrics", iconName: "graph", Component: MetricsPanel },
  permissions: { title: "Permissions", iconName: "secrets", Component: PermissionsPanel },
  search: { title: "Search", iconName: "search", Component: SearchPanel },
  queryPlayground: { title: "Query Playground", iconName: "artifacts", Component: QueryPlaygroundWrapper },
  knowledgeBase: { title: "Knowledge Base", iconName: "knowledge", Component: KnowledgeBasePanel },
  sessionTimeline: { title: "Timeline", iconName: "loops", Component: SessionTimelineWrapper },
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
