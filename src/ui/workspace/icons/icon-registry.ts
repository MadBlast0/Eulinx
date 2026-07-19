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
}

export function getIcon(key: string): LucideIcon | undefined {
  return iconRegistry[key]
}

export const defaultIcon: LucideIcon = Circle
