import {
  Activity,
  BarChart3,
  BellRing,
  Bot,
  Boxes,
  Braces,
  CalendarClock,
  Circle,
  Clock,
  Cloud,
  Cpu,
  Database,
  FileText,
  Folder,
  FolderTree,
  GitBranch,
  GitMerge,
  Globe,
  HardDrive,
  HelpCircle,
  Key,
  LayoutDashboard,
  Layers,
  Map,
  MessageSquare,
  Monitor,
  Network,
  PanelBottom,
  Play,
  Plug,
  Redo2,
  Route,
  ScrollText,
  Search,
  Settings,
  Share2,
  StickyNote,
  Terminal,
  Undo2,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { memo, type SVGProps } from "react"

export interface AppIconProps extends SVGProps<SVGSVGElement> {
  name: string
  size?: number
  className?: string
  strokeWidth?: number
  color?: string
  weight?: "thin" | "normal" | "heavy"
}

function AppIconComponent({
  name,
  size,
  className,
  strokeWidth,
  color,
  weight,
  ...props
}: AppIconProps) {
  const config = iconConfig[name]
  const sizePx = size || config?.size || 20
  const strokeWidthPx = strokeWidth || config?.strokeWidth || 2.25

  const Icon = iconRegistry[name as IconKey] || iconRegistry.default || Circle

  const style = color ? { color } : undefined

  return (
    <Icon
      className={cn(
        weight ? weightMap[weight] : `[stroke-width:${strokeWidthPx}]`,
        "shrink-0",
        className
      )}
      size={sizePx}
      strokeWidth={strokeWidthPx}
      style={style}
      {...props}
    />
  )
}

export const AppIcon = memo(AppIconComponent)

const weightMap = {
  thin: "[stroke-width:1.5]",
  normal: "[stroke-width:2.25]",
  heavy: "[stroke-width:2.5]",
}

const iconConfig: Record<string, {
  size?: number,
  strokeWidth?: number
}> = {
  workspace: { size: 20 },
  knowledge: { size: 20 },
  settings: { size: 20 },
  projects: { size: 20 },
  graph: { size: 20 },
  artifacts: { size: 20 },
  terminal: { size: 20 },
  logs: { size: 20 },
  diagnostics: { size: 20 },
  events: { size: 20 },
  runtime: { size: 20 },
  search: { size: 20 },
  files: { size: 20 },
  connections: { size: 20 },
  api: { size: 20 },
  cloud: { size: 20 },
  aiAgent: { size: 20 },
  memory: { size: 20 },
  prompt: { size: 20 },
  variables: { size: 20 },
  secrets: { size: 20 },
  scheduler: { size: 20 },
  conditions: { size: 20 },
  loops: { size: 20 },
  browser: { size: 20 },
  dashboard: { size: 20 },
  timeline: { size: 20 },
  vector: { size: 20 },
  route: { size: 20 },
  network: { size: 20 },
  help: { size: 20 },
  git: { size: 20 },
  sessions: { size: 20 },
  map: { size: 20 },
  undo: { size: 20 },
  redo: { size: 20 },
  panel: { size: 20 },
  run: { size: 20 },
  file: { size: 20 },
  event: { size: 20 },
  note: { size: 20 },
  merge: { size: 20 },
  router: { size: 20 },
  tool: { size: 20 },
  harddrive: { size: 20 },
  split: { size: 20 },
}

type IconKey =
  | "workspace"
  | "knowledge"
  | "settings"
  | "projects"
  | "graph"
  | "artifacts"
  | "terminal"
  | "logs"
  | "diagnostics"
  | "events"
  | "runtime"
  | "search"
  | "files"
  | "connections"
  | "api"
  | "cloud"
  | "aiAgent"
  | "memory"
  | "prompt"
  | "variables"
  | "secrets"
  | "scheduler"
  | "conditions"
  | "loops"
  | "browser"
  | "dashboard"
  | "timeline"
  | "vector"
  | "route"
  | "network"
  | "help"
  | "git"
  | "sessions"
  | "map"
  | "undo"
  | "redo"
  | "panel"
  | "run"
  | "file"
  | "event"
  | "note"
  | "merge"
  | "router"
  | "tool"
  | "harddrive"
  | "split"
  | "default"

const iconRegistry: Record<IconKey, LucideIcon> = {
  workspace: Share2,
  knowledge: Database,
  settings: Settings,
  projects: Folder,
  graph: Share2,
  artifacts: Boxes,
  terminal: Terminal,
  logs: ScrollText,
  diagnostics: Activity,
  events: BellRing,
  runtime: Cpu,
  search: Search,
  files: FolderTree,
  connections: Plug,
  api: Globe,
  cloud: Cloud,
  aiAgent: Bot,
  memory: Database,
  prompt: MessageSquare,
  variables: Braces,
  secrets: Key,
  scheduler: CalendarClock,
  conditions: Route,
  loops: Clock,
  browser: Monitor,
  dashboard: LayoutDashboard,
  timeline: Layers,
  vector: BarChart3,
  route: GitBranch,
  network: Network,
  help: HelpCircle,
  git: GitBranch,
  sessions: Clock,
  map: Map,
  undo: Undo2,
  redo: Redo2,
  panel: PanelBottom,
  run: Play,
  file: FileText,
  event: Zap,
  note: StickyNote,
  merge: GitMerge,
  router: Network,
  tool: Wrench,
  harddrive: HardDrive,
  split: Network,
  default: Circle,
}