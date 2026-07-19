/**
 * Sidebar — main composition.
 *
 * Renders (in fixed order): WorkspaceSwitcher, SearchEntry, collapsible
 * sections (Explorer / Workers / Workflows / Sessions), and a Settings
 * footer at the bottom. Clean, professional layout with proper hierarchy.
 *
 * In rail mode only icons render; clicking an icon expands to full.
 */

import { useMemo, useState } from "react"
import { token } from "@/ui/tokens"
import { Icon } from "@/ui/icons"
import { useSidebar } from "./use-sidebar"
import { SidebarSection } from "./section"
import { WorkspaceSwitcher } from "./workspace-switcher"
import { FileTree } from "./file-tree"
import { WorkerList } from "./worker-list"
import { WorkflowList } from "./workflow-list"
import { SessionList } from "./session-list"
import { SidebarSearch } from "./sidebar-search"
import type { SidebarNavigate } from "./sidebar-data"

export interface SidebarProps {
  readonly onNavigate: SidebarNavigate
  readonly onSwitchWorkspace: (workspaceId: string) => void
  readonly onOpenPalette: () => void
  readonly onOpenSettings?: () => void
}

export function Sidebar({
  onNavigate,
  onSwitchWorkspace,
  onOpenPalette,
  onOpenSettings,
}: SidebarProps): React.ReactElement {
  const {
    data,
    collapsed,
    sections,
    workspaceSwitcherOpen,
    setWorkspaceSwitcherOpen,
    toggleSection,
    setMode,
  } = useSidebar()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [localFilter, setLocalFilter] = useState("")
  const [selection, setSelection] = useState<{ kind: string; id: string } | null>(null)

  const navigate: SidebarNavigate = useMemo(
    () => (sel) => {
      setSelection(sel)
      onNavigate(sel)
    },
    [onNavigate],
  )

  const toggleGroup = (groupId: string): void => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const workerBadge = useMemo(
    () => data.workers.filter((w) => w.state === "blocked" || w.state === "failing" || w.state === "zombie").length,
    [data.workers],
  )

  const selectionId = selection?.id ?? null

  if (collapsed) {
    return (
      <Rail
        onExpand={() => setMode("expanded")}
        workerBadge={workerBadge}
        onOpenPalette={onOpenPalette}
      />
    )
  }

  return (
    <nav
      aria-label="Sidebar"
      className="flex h-full min-h-0 flex-col"
      style={{ background: token("--Eulinx-color-sidebar-bg") }}
    >
      <WorkspaceSwitcher
        workspaces={data.workspaces}
        activeWorkspaceId={data.activeWorkspaceId}
        activeProjectId={data.activeProjectId}
        open={workspaceSwitcherOpen}
        onOpenChange={setWorkspaceSwitcherOpen}
        onSwitch={onSwitchWorkspace}
      />

      <SidebarSearch onOpenPalette={onOpenPalette} onLocalFilter={setLocalFilter} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SidebarSection
          id="explorer"
          title="Explorer"
          expanded={sections.explorer}
          onToggle={() => toggleSection("explorer")}
          keepBodyMounted
        >
          <FileTree
            rootNodes={data.rootNodes}
            loadChildren={data.loadChildren}
            externalFilter={localFilter}
            onNavigate={navigate}
            selection={selectionId}
          />
        </SidebarSection>

        <SidebarSection
          id="workers"
          title="Workers"
          badge={workerBadge}
          expanded={sections.workers}
          onToggle={() => toggleSection("workers")}
        >
          <WorkerList
            workers={data.workers}
            collapsedGroups={collapsedGroups}
            onToggleGroup={toggleGroup}
            onNavigate={navigate}
            selection={selectionId}
          />
        </SidebarSection>

        <SidebarSection
          id="workflows"
          title="Workflows"
          expanded={sections.workflows}
          onToggle={() => toggleSection("workflows")}
        >
          <WorkflowList workflows={data.workflows} onNavigate={navigate} selection={selectionId} />
        </SidebarSection>

        <SidebarSection
          id="sessions"
          title="Sessions"
          expanded={sections.sessions}
          onToggle={() => toggleSection("sessions")}
        >
          <SessionList sessions={data.sessions} onNavigate={navigate} selection={selectionId} />
        </SidebarSection>
      </div>

      {/* Settings footer */}
      <div
        className="flex shrink-0 items-center border-t"
        style={{ borderColor: token("--Eulinx-color-border") }}
      >
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-[color:var(--Eulinx-color-hover)]"
          style={{ color: token("--Eulinx-color-text-muted") }}
        >
          <Icon name="domain.settings" size="sm" aria-hidden />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  )
}

/** Rail (icons-only) presentation. Each icon expands to full on click/focus. */
function Rail({
  onExpand,
  workerBadge,
  onOpenPalette,
}: {
  onExpand: () => void
  workerBadge: number
  onOpenPalette: () => void
}): React.ReactElement {
  const items = useMemo(
    () => [
      { icon: "domain.workspace", label: "Workspace" },
      { icon: "domain.search", label: "Search" },
      { icon: "domain.folder.tree", label: "Explorer" },
      { icon: "domain.worker", label: `Workers${workerBadge > 0 ? ` (${workerBadge})` : ""}` },
      { icon: "domain.workflow", label: "Workflows" },
      { icon: "domain.session", label: "Sessions" },
    ],
    [workerBadge],
  )

  return (
    <nav
      aria-label="Sidebar (rail)"
      className="flex h-full flex-col items-center gap-1 py-2"
      style={{ background: token("--Eulinx-color-sidebar-bg"), width: 48 }}
    >
      {items.map((it, i) => (
        <button
          key={it.label}
          type="button"
          aria-label={it.label}
          title={it.label}
          onClick={() => (i === 1 ? onOpenPalette() : onExpand())}
          className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[color:var(--Eulinx-color-hover)]"
          style={{ color: token("--Eulinx-color-text-muted") }}
          onFocus={() => {
            if (i !== 1) onExpand()
          }}
        >
          <Icon name={it.icon} size="sm" label={it.label} />
        </button>
      ))}
    </nav>
  )
}
