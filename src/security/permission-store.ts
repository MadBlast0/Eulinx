/**
 * P14-SEC-PERMISSION — Permission Store (Zustand)
 *
 * Reactive wrapper around the PermissionManager singleton. The panel and other
 * UI read grants from here and toggle them via grant/revoke, so the state is
 * real and shared across the app rather than local component useState.
 */

import { create } from "zustand"
import { PermissionManager } from "@/security/permission-manager"
import type {
  ActorType,
  PermissionGrant,
  ResourceType,
  PermissionAction,
} from "@/security/security-types"
import type { WorkspaceId } from "@/core/types"

// ---------------------------------------------------------------------------
// Singleton PermissionManager
// ---------------------------------------------------------------------------

export const permissionManager = new PermissionManager()

// ---------------------------------------------------------------------------
// Permission catalog entry
// ---------------------------------------------------------------------------

export interface PermissionCatalogEntry {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly tone: "success" | "warning" | "info" | "error"
  readonly defaultOn: boolean
  readonly actorType: ActorType
  readonly actions: readonly PermissionAction[]
  readonly resourceTypes: readonly ResourceType[]
}

// ---------------------------------------------------------------------------
// Default catalog (UI metadata + capability mapping)
// ---------------------------------------------------------------------------

export const PERMISSION_CATALOG: readonly PermissionCatalogEntry[] = [
  {
    id: "fs.read",
    label: "Filesystem Read",
    description: "Read local files and directories",
    tone: "success",
    defaultOn: true,
    actorType: "user",
    actions: ["read"],
    resourceTypes: ["filesystem"],
  },
  {
    id: "fs.write",
    label: "Filesystem Write",
    description: "Create and modify local files",
    tone: "warning",
    defaultOn: false,
    actorType: "user",
    actions: ["write"],
    resourceTypes: ["filesystem"],
  },
  {
    id: "net.out",
    label: "Network Egress",
    description: "Make outbound HTTP requests",
    tone: "info",
    defaultOn: true,
    actorType: "user",
    actions: ["network"],
    resourceTypes: ["network"],
  },
  {
    id: "shell.exec",
    label: "Shell Execute",
    description: "Run system shell commands",
    tone: "error",
    defaultOn: false,
    actorType: "user",
    actions: ["execute", "spawn"],
    resourceTypes: ["terminal"],
  },
]

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

interface PermissionStoreState {
  /** Active workspace/actor context for grants. */
  readonly workspaceId: WorkspaceId
  readonly actorId: string

  /** Bumped whenever grants change so subscribers re-render. */
  readonly version: number

  /** Set the workspace/actor context (resets grants to catalog defaults). */
  readonly setContext: (workspaceId: WorkspaceId, actorId: string) => void

  /** Whether a catalog permission id is currently granted. */
  readonly isGranted: (id: string) => boolean

  /** Grant or revoke a catalog permission. */
  readonly setGranted: (id: string, on: boolean) => void
}

const DEFAULT_WORKSPACE: WorkspaceId = "default" as WorkspaceId
const DEFAULT_ACTOR = "user"

function buildGrant(
  entry: PermissionCatalogEntry,
  workspaceId: WorkspaceId,
  actorId: string,
): PermissionGrant {
  const now = new Date().toISOString()
  return {
    id: entry.id,
    actorId,
    actorType: entry.actorType,
    workspaceId,
    actions: entry.actions,
    resourceTypes: entry.resourceTypes,
    riskLimit: "critical",
    createdBy: actorId,
    createdAt: now,
    expiryType: "until_workspace_close",
  }
}

function applyDefaults(
  manager: PermissionManager,
  workspaceId: WorkspaceId,
  actorId: string,
): void {
  for (const entry of PERMISSION_CATALOG) {
    if (entry.defaultOn) {
      manager.grant(buildGrant(entry, workspaceId, actorId))
    }
  }
}

// Seed defaults once for the initial context.
applyDefaults(permissionManager, DEFAULT_WORKSPACE, DEFAULT_ACTOR)

export const usePermissionStore = create<PermissionStoreState>((set, get) => ({
  workspaceId: DEFAULT_WORKSPACE,
  actorId: DEFAULT_ACTOR,
  version: 0,

  setContext: (workspaceId, actorId) => {
    // Clear and re-seed for the new context.
    for (const entry of PERMISSION_CATALOG) {
      permissionManager.revoke(entry.id)
    }
    applyDefaults(permissionManager, workspaceId, actorId)
    set((state) => ({ workspaceId, actorId, version: state.version + 1 }))
  },

  isGranted: (id) => {
    const { workspaceId, actorId } = get()
    return permissionManager
      .getGrantsForActor(actorId)
      .some((g) => g.id === id && g.workspaceId === workspaceId && !g.revokedAt)
  },

  setGranted: (id, on) => {
    const { workspaceId, actorId } = get()
    const entry = PERMISSION_CATALOG.find((e) => e.id === id)
    if (!entry) return
    if (on) {
      permissionManager.grant(buildGrant(entry, workspaceId, actorId))
    } else {
      permissionManager.revoke(id)
    }
    set((state) => ({ version: state.version + 1 }))
  },
}))
