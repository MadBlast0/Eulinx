import { useState } from "react"
import {
  ChevronRight,
  Folder,
  Globe,
  HelpCircle,
  LayoutGrid,
  ListFilter,
  Map as MapIcon,
  Plus,
  Search,
  Settings,
  TerminalSquare,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { Dot } from "./primitives"
import { useWorkspace } from "./use-workspace"

interface TreeNode {
  readonly kind: "terminal" | "browser" | "map"
  readonly label: string
  readonly dot: "g" | "a" | "r"
  readonly active?: boolean
}

interface Project {
  readonly id: string
  readonly name: string
  readonly nodes?: readonly TreeNode[]
  readonly active?: boolean
  readonly defaultOpen?: boolean
}

const PROJECTS: readonly Project[] = [
  {
    id: "big-idea",
    name: "Big Idea",
    nodes: [
      { kind: "terminal", label: "Main Terminal", dot: "g" },
      { kind: "terminal", label: "Terminal 1", dot: "g" },
      { kind: "browser", label: "Browser", dot: "g" },
    ],
  },
  { id: "cli-launcher", name: "Cli-launcher" },
  {
    id: "eulinx",
    name: "Eulinx",
    active: true,
    defaultOpen: true,
    nodes: [
      { kind: "terminal", label: "Main Terminal", dot: "g", active: true },
      { kind: "terminal", label: "Terminal 1", dot: "g" },
      { kind: "terminal", label: "Terminal 2", dot: "g" },
      { kind: "browser", label: "Browser", dot: "g" },
      { kind: "map", label: "Map", dot: "a" },
    ],
  },
]

function TreeIcon({ kind }: { kind: TreeNode["kind"] }) {
  const cls = "h-3.5 w-3.5 shrink-0"
  if (kind === "terminal") return <TerminalSquare className={cls} strokeWidth={1.5} />
  if (kind === "browser") return <Globe className={cls} strokeWidth={1.5} />
  return <MapIcon className={cls} strokeWidth={1.5} />
}

export function LeftSidebar() {
  const { setOverlay } = useWorkspace()

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-panel)]">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 rounded-[var(--wsx-r-sm)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)] px-3 py-2 text-xs text-[color:var(--wsx-text-muted)]">
            <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
            Search
          </div>
        </div>

        <div className="flex items-center justify-between px-4 pb-1 pt-2">
          <span className="text-xs font-semibold text-[color:var(--wsx-text-sec)]">Projects</span>
          <div className="flex gap-1">
            <button
              type="button"
              title="Filter"
              className="flex h-[22px] w-[22px] items-center justify-center rounded-[var(--wsx-r-sm)] text-[color:var(--wsx-text-muted)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text-sec)]"
            >
              <ListFilter className="h-3 w-3" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              title="New project"
              className="flex h-[22px] w-[22px] items-center justify-center rounded-[var(--wsx-r-sm)] text-[color:var(--wsx-text-muted)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text-sec)]"
            >
              <Plus className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {PROJECTS.map((project) => (
          <ProjectItem key={project.id} project={project} />
        ))}
      </div>

      <div className="flex justify-between border-t border-[color:var(--wsx-border)] px-4 py-2">
        <button
          type="button"
          title="Settings"
          onClick={() => setOverlay("settings")}
          className="flex h-6 w-6 items-center justify-center rounded-[var(--wsx-r-sm)] text-[color:var(--wsx-text-muted)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text-sec)]"
        >
          <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          title="Help"
          className="flex h-6 w-6 items-center justify-center rounded-[var(--wsx-r-sm)] text-[color:var(--wsx-text-muted)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text-sec)]"
        >
          <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

function ProjectItem({ project }: { project: Project }) {
  const [open, setOpen] = useState(project.defaultOpen ?? false)
  const { selectNode } = useWorkspace()

  return (
    <div>
      <div className="h-0.5" />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-2 text-[13px] font-medium text-[color:var(--wsx-text)] transition-colors hover:bg-[color:var(--wsx-bg-hover)]",
          project.active && "bg-[color:var(--wsx-bg-surface)]",
        )}
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 text-[color:var(--wsx-text-muted)] transition-transform",
            open && "rotate-90",
          )}
          strokeWidth={1.5}
        />
        <Folder className="h-3.5 w-3.5 text-[color:var(--wsx-text-muted)]" strokeWidth={1.5} />
        <span className="flex-1 text-left">{project.name}</span>
      </button>

      {open && project.nodes && (
        <>
          {/* Level 1: project -> node graph */}
          <div className="relative pl-8">
            <span className="absolute bottom-0 left-[18px] top-0 w-px bg-[color:var(--wsx-border-strong)]" />
            <div className="relative flex items-center gap-2 rounded-[var(--wsx-r-sm)] px-3 py-1 text-xs text-[color:var(--wsx-text-sec)] transition-colors hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text)] before:absolute before:left-[-14px] before:top-1/2 before:h-px before:w-[14px] before:bg-[color:var(--wsx-border-strong)] before:content-['']">
              <LayoutGrid className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              Node Graph
            </div>
          </div>

          {/* Level 2: node graph -> nodes */}
          <div className="relative mt-0.5 pl-12">
            <span className="absolute bottom-3 left-8 top-0 w-px bg-[color:var(--wsx-border-strong)]" />
            {project.nodes.map((node, i) => (
              <button
                key={`${node.label}-${i}`}
                type="button"
                onClick={() => {
                  if (node.active) selectNode("node-main-term")
                }}
                className={cn(
                  "relative flex w-full items-center gap-2 rounded-[var(--wsx-r-sm)] px-3 py-[3px] text-xs text-[color:var(--wsx-text-sec)] transition-colors hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text)] before:absolute before:left-[-16px] before:top-1/2 before:h-px before:w-4 before:bg-[color:var(--wsx-border-strong)] before:content-['']",
                  node.active &&
                    "bg-[color:var(--wsx-accent-surf)] text-[color:var(--wsx-text)]",
                )}
              >
                <TreeIcon kind={node.kind} />
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">
                  {node.label}
                </span>
                <Dot color={node.dot} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
