import {
  Terminal,
  Globe,
  Map,
  Cpu,
  GitBranch,
  Users,
  CircleDot,
  Check,
  AlertTriangle,
  Info,
  Settings,
  Search,
  Command,
  Circle,
  SlidersHorizontal,
  FolderTree,
  Clock,
  ScrollText,
  type LucideIcon,
} from "lucide-react"

export const iconRegistry: Record<string, LucideIcon> = {
  terminal: Terminal,
  browser: Globe,
  map: Map,
  cpu: Cpu,
  "git-branch": GitBranch,
  users: Users,
  session: CircleDot,
  check: Check,
  alert: AlertTriangle,
  info: Info,
  settings: Settings,
  search: Search,
  command: Command,
  properties: SlidersHorizontal,
  git: GitBranch,
  files: FolderTree,
  sessions: Clock,
  logs: ScrollText,
}

export function getIcon(key: string): LucideIcon | undefined {
  return iconRegistry[key]
}

export const defaultIcon: LucideIcon = Circle
