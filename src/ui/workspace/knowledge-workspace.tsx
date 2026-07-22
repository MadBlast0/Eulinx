import { useState } from "react"
import {
  BarChart3,
  Braces,
  Database,
  GitBranch,
  Layers,
  Network,
  Search,
} from "lucide-react"
import { cn } from "@/utils/cn"
import UnifiedSearch from "./canvas-views/panels/unified-search"
import WorkspaceDashboard from "./canvas-views/panels/workspace-dashboard"
import MemoryGraph from "./canvas-views/panels/memory-graph"
import KnowledgeGraph from "./canvas-views/panels/knowledge-graph"
import CausalTrace from "./canvas-views/panels/causal-trace"
import SessionTimeline from "./canvas-views/panels/session-timeline"
import VectorExplorer from "./canvas-views/panels/vector-explorer"
import QueryPlayground from "./canvas-views/panels/query-playground"

interface KnowledgeTab {
  readonly id: string
  readonly label: string
  readonly icon: React.ReactNode
  readonly component: React.ComponentType
}

const KNOWLEDGE_TABS: readonly KnowledgeTab[] = [
  { id: "search", label: "Search", icon: <Search className="h-4 w-4" strokeWidth={1.5} />, component: UnifiedSearch },
  { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="h-4 w-4" strokeWidth={1.5} />, component: WorkspaceDashboard },
  { id: "memory", label: "Memory Graph", icon: <Database className="h-4 w-4" strokeWidth={1.5} />, component: MemoryGraph },
  { id: "knowledge", label: "Knowledge Graph", icon: <Network className="h-4 w-4" strokeWidth={1.5} />, component: KnowledgeGraph },
  { id: "trace", label: "Causal Trace", icon: <GitBranch className="h-4 w-4" strokeWidth={1.5} />, component: CausalTrace },
  { id: "timeline", label: "Session Timeline", icon: <Layers className="h-4 w-4" strokeWidth={1.5} />, component: SessionTimeline },
  { id: "vectors", label: "Vector Explorer", icon: <BarChart3 className="h-4 w-4" strokeWidth={1.5} />, component: VectorExplorer },
  { id: "query", label: "Query Playground", icon: <Braces className="h-4 w-4" strokeWidth={1.5} />, component: QueryPlayground },
]

export function KnowledgeWorkspace() {
  const [activeTab, setActiveTab] = useState(KNOWLEDGE_TABS[0]?.id ?? "embeddings")
  const ActiveComponent = KNOWLEDGE_TABS.find((t) => t.id === activeTab)?.component ?? KNOWLEDGE_TABS[0]?.component

  if (!ActiveComponent) return null

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[color:var(--Eulinx-color-background)]">
      {/* Tab bar */}
      <div className="flex h-10 shrink-0 items-center gap-0 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-2">
        {KNOWLEDGE_TABS.map((tab) => {
          const active = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex h-full items-center gap-2 border-b-2 px-3 text-[12px] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                active
                  ? "border-[color:var(--Eulinx-color-accent)] text-[color:var(--Eulinx-color-text)]"
                  : "border-transparent text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text-secondary)]",
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ActiveComponent />
      </div>
    </div>
  )
}
