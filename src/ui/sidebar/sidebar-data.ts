/**
 * Eulinx Sidebar — data-shape contract.
 *
 * The Sidebar is a navigator: it renders data fed via props/context and never
 * invents entries. Every shape here is a stable contract the app can fill with
 * real backend data later. No backend calls live in these types — they are
 * pure data descriptions (Sidebar-Part01 §Sidebar Object Model).
 *
 * The 13 worker states are re-exported verbatim from `@/a11y` (the canonical
 * source of truth) so the Sidebar never diverges from the accessibility model.
 */

import type { WorkerState } from "@/a11y"

/** Re-export the canonical 13 worker lifecycle states. */
export type { WorkerState } from "@/a11y"

/** A workspace the user can switch between. */
export interface Workspace {
  readonly id: string
  readonly name: string
  /** Optional human label for the active project within the workspace. */
  readonly projectName?: string
  /** Optional short description shown in the switcher. */
  readonly description?: string
}

/** A single node in the (virtualized) file tree. */
export interface FileNode {
  /** Absolute, OS-native path. Stable, unique key. */
  readonly path: string
  /** Basename only. */
  readonly name: string
  readonly kind: "file" | "directory" | "symlink"
  /** null for directories. */
  readonly sizeBytes: number | null
  /** ISO 8601. */
  readonly modifiedAt: string
  /** null until children are loaded. */
  readonly childCount: number | null
  readonly gitStatus: GitRowStatus | null
  /** Matched .gitignore. */
  readonly isIgnored: boolean
}

export type GitRowStatus =
  | "untracked"
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "conflicted"

/** A worker row, grouped by lifecycle state. */
export interface WorkerSummary {
  readonly workerId: string
  readonly label: string
  readonly state: WorkerState
  readonly health: "healthy" | "degraded" | "unresponsive" | "unknown"
  readonly projectId: string
  readonly sessionId: string
  /** Parent worker for nested workers; null at the top level. */
  readonly parentWorkerId: string | null
  readonly depth: number
  /** ISO 8601 or null if not started. */
  readonly startedAt: string | null
}

/** A workflow row in the active workspace. */
export interface WorkflowSummary {
  readonly workflowId: string
  readonly name: string
  readonly status: "draft" | "running" | "paused" | "completed" | "failed"
  readonly nodeCount: number
  readonly completedNodeCount: number
  /** ISO 8601. */
  readonly updatedAt: string
}

/** A past session. */
export interface SessionSummary {
  readonly sessionId: string
  readonly title: string
  /** ISO 8601. */
  readonly startedAt: string
  /** ISO 8601 or null if still open. */
  readonly endedAt: string | null
  readonly workerCount: number
  readonly artifactCount: number
}

/** What is currently selected. Exactly one kind/id. */
export type SidebarItemKind =
  | "workspace"
  | "project"
  | "folder"
  | "file"
  | "worker"
  | "workflow"
  | "session"

export interface SidebarSelection {
  readonly kind: SidebarItemKind
  /** path for fs items, entity id otherwise. */
  readonly id: string
}

/** The full data bundle the Sidebar consumes. */
export interface SidebarData {
  readonly workspaces: readonly Workspace[]
  readonly activeWorkspaceId: string | null
  readonly activeProjectId: string | null
  /** Root file nodes (the workspace root entry). */
  readonly rootNodes: readonly FileNode[]
  /**
   * Lazy children loader for a directory path. Called on first expand only.
   * The Sidebar tracks what is loaded; callers MUST NOT call this redundantly.
   * Return an empty array for leaves / errors.
   */
  readonly loadChildren: (path: string) => Promise<readonly FileNode[]>
  readonly workers: readonly WorkerSummary[]
  readonly workflows: readonly WorkflowSummary[]
  readonly sessions: readonly SessionSummary[]
}

/** The kind of rail/collapse presentation. */
export type SidebarRegionMode = "expanded" | "rail"

/** Section ids (fixed order). */
export type SidebarSectionId = "explorer" | "workers" | "workflows" | "sessions"

/** Per-section collapse state (Tier 2 view state). */
export type SidebarSectionState = Record<SidebarSectionId, boolean>

/** Callback fired when the user picks a row to navigate to. */
export type SidebarNavigate = (selection: SidebarSelection) => void

/** Callback fired when the user switches the active workspace. */
export type SidebarSwitchWorkspace = (workspaceId: string) => void

/** Callback fired when the user requests the command palette. */
export type SidebarOpenPalette = () => void
