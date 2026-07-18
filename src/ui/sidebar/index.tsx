/**
 * Eulinx Sidebar — public API barrel.
 *
 * Consumers mount the Sidebar inside the WorkspaceLayout `sidebar` region via
 * `<SidebarInLayout>` (which drops it into the layout's `SidebarSlot`), wrapped
 * in `<SidebarProvider>` with data. The provider owns rail/expanded + section
 * view state; the Sidebar owns rendering.
 */

import { SidebarSlot } from "@/ui/layout/workspace-layout"
import { Sidebar } from "./sidebar"
import type { SidebarProps } from "./sidebar"

export { Sidebar } from "./sidebar"
export type { SidebarProps } from "./sidebar"
export { SidebarProvider, useSidebar } from "./use-sidebar"
export type {
  SidebarProviderProps,
  SidebarContextValue,
} from "./use-sidebar"
export type { SidebarRegionMode } from "./sidebar-data"
export * from "./sidebar-data"
export { FileTree } from "./file-tree"
export type { TreeRow, FileTreeProps } from "./file-tree"
export { VirtualList } from "./virtual-list"
export type { VirtualListProps, VirtualListHandle } from "./virtual-list"
export { WorkspaceSwitcher } from "./workspace-switcher"
export { WorkerList } from "./worker-list"
export { WorkflowList } from "./workflow-list"
export { SessionList } from "./session-list"
export { SidebarSearch } from "./sidebar-search"
export { SidebarSection } from "./section"
export { StatePill, WorkerStatePill } from "./state-pill"

/** Mounts the Sidebar into the WorkspaceLayout `sidebar` region slot. */
export function SidebarInLayout(props: SidebarProps): React.ReactElement {
  return (
    <SidebarSlot>
      <Sidebar {...props} />
    </SidebarSlot>
  )
}
