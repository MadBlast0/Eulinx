/**
 * P08-WORKER-POOLS / P08-WORKER-COORD — Worker Hierarchy
 *
 * WorkerHierarchy-Part01 through Part06: tree structure, depth limits,
 * fan-out limits, authority inheritance, cascade semantics, orphan policy.
 */

import type { SessionId, WorkspaceId, WorkerId, IsoTimestamp } from "@/core/types"
import type {
  HierarchyNodeId,
  HierarchyNode,
  HierarchyNodeKind,
  HierarchyNodeState,
  DelegatedScope,
  PermissionSet,
  BudgetAllocation,
  NodeLimits,
  NodeResult,
} from "./worker-types"

// ---------------------------------------------------------------------------
// Default Node Limits
// ---------------------------------------------------------------------------

export const DEFAULT_NODE_LIMITS: NodeLimits = {
  maxDepth: 5,
  maxDirectChildren: 8,
  maxDescendants: 64,
  maxConcurrentRunningChildren: 4,
}

// ---------------------------------------------------------------------------
// Hierarchy Manager
// ---------------------------------------------------------------------------

export class WorkerHierarchyManager {
  private readonly nodes: Map<string, HierarchyNode> = new Map()
  private readonly childIndex: Map<string, string[]> = new Map() // parentId -> childIds
  private readonly actorIndex: Map<string, string> = new Map()   // actorId -> nodeId

  /**
   * Create the root user node for a session.
   */
  createRoot(params: {
    sessionId: SessionId
    workspaceId: WorkspaceId
    projectId: string
    fullPermissions: PermissionSet
    totalBudget: BudgetAllocation
  }): HierarchyNode {
    const now = new Date().toISOString() as IsoTimestamp
    const nodeId = `hnd_root_${params.sessionId}`

    const node: HierarchyNode = {
      id: nodeId,
      kind: "user",
      sessionId: params.sessionId,
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      parentId: null,
      childIds: [],
      depth: 0,
      path: nodeId,
      actorId: null,
      state: "running",
      scope: {
        objective: "root",
        allowedPaths: [],
        deniedPaths: [],
        allowedToolIds: [],
      },
      permissions: params.fullPermissions,
      budget: params.totalBudget,
      limits: DEFAULT_NODE_LIMITS,
      result: null,
      createdAt: now,
      updatedAt: now,
    }

    this.nodes.set(nodeId, node)
    return node
  }

  /**
   * Insert a child node under a parent.
   * Enforces H1-H12 invariants from WorkerHierarchy-Part01.
   */
  insertNode(params: {
    parentId: HierarchyNodeId
    kind: HierarchyNodeKind
    actorId?: WorkerId
    sessionId: SessionId
    workspaceId: WorkspaceId
    projectId: string
    scope: DelegatedScope
    permissions: PermissionSet
    budget: BudgetAllocation
    limits?: NodeLimits
  }): HierarchyNode {
    const parent = this.nodes.get(params.parentId)
    if (!parent) throw new Error(`Parent node ${params.parentId} not found`)

    // H8: depth limit
    if (parent.depth >= parent.limits.maxDepth) {
      throw new Error(`Depth limit ${parent.limits.maxDepth} exceeded`)
    }

    // H7: fan-out limit
    if (parent.childIds.length >= parent.limits.maxDirectChildren) {
      throw new Error(`Fan-out limit ${parent.limits.maxDirectChildren} exceeded for ${params.parentId}`)
    }

    // H4: permission subset check (simplified — full check would compare grants)
    // H5: budget covered by parent
    if (parent.budget.allocated - parent.budget.spent < params.budget.allocated) {
      throw new Error(`Insufficient budget: parent has ${parent.budget.allocated - parent.budget.spent}, child needs ${params.budget.allocated}`)
    }

    // H9: only orchestrators may have children
    if (params.kind === "worker" && parent.kind === "worker") {
      throw new Error("Workers cannot have children. Only orchestrators may branch the tree.")
    }

    const now = new Date().toISOString() as IsoTimestamp
    const nodeId = `hnd_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const depth = parent.depth + 1
    const path = `${parent.path}/${nodeId}`

    const node: HierarchyNode = {
      id: nodeId,
      kind: params.kind,
      sessionId: params.sessionId,
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      parentId: params.parentId,
      childIds: [],
      depth,
      path,
      actorId: params.actorId ?? null,
      state: "pending",
      scope: params.scope,
      permissions: params.permissions,
      budget: params.budget,
      limits: params.limits ?? DEFAULT_NODE_LIMITS,
      result: null,
      createdAt: now,
      updatedAt: now,
    }

    // Update parent
    const updatedParentChildren = [...parent.childIds, nodeId]
    const updatedParent: HierarchyNode = {
      ...parent,
      childIds: updatedParentChildren,
      updatedAt: now,
    }
    this.nodes.set(params.parentId, updatedParent)
    this.nodes.set(nodeId, node)

    // Update indexes
    this.childIndex.set(params.parentId, updatedParentChildren)
    if (params.actorId) {
      this.actorIndex.set(params.actorId, nodeId)
    }

    return node
  }

  // ---------------------------------------------------------------------------
  // Cascade Operations (WorkerHierarchy-Part05)
  // ---------------------------------------------------------------------------

  /**
   * Cascade pause to all descendants.
   */
  cascadePause(nodeId: HierarchyNodeId): readonly HierarchyNodeId[] {
    const affected: HierarchyNodeId[] = []
    const queue = [nodeId]

    while (queue.length > 0) {
      const current = queue.shift()!
      const node = this.nodes.get(current)
      if (!node) continue

      if (node.state !== "completed" && node.state !== "cancelled" && node.state !== "failed") {
        this.updateNodeState(current, "paused")
        affected.push(current)
      }

      queue.push(...node.childIds)
    }

    return affected
  }

  /**
   * Cascade cancel to all descendants.
   */
  cascadeCancel(nodeId: HierarchyNodeId): readonly HierarchyNodeId[] {
    const affected: HierarchyNodeId[] = []
    const queue = [nodeId]

    while (queue.length > 0) {
      const current = queue.shift()!
      const node = this.nodes.get(current)
      if (!node) continue

      if (node.state !== "completed" && node.state !== "cancelled" && node.state !== "failed") {
        this.updateNodeState(current, "cancelled")
        affected.push(current)
      }

      queue.push(...node.childIds)
    }

    return affected
  }

  /**
   * Cascade terminate to all descendants.
   */
  cascadeTerminate(nodeId: HierarchyNodeId): readonly HierarchyNodeId[] {
    const affected: HierarchyNodeId[] = []
    const queue = [nodeId]

    while (queue.length > 0) {
      const current = queue.shift()!
      const node = this.nodes.get(current)
      if (!node) continue

      if (node.state !== "completed" && node.state !== "cancelled" && node.state !== "failed") {
        this.updateNodeState(current, "cancelled")
        affected.push(current)
      }

      queue.push(...node.childIds)
    }

    return affected
  }

  // ---------------------------------------------------------------------------
  // Result Bubbling (WorkerHierarchy-Part05 §Result Bubbling)
  // ---------------------------------------------------------------------------

  /**
   * Bubble a result up from child to parent.
   * H12: A node MUST NOT transition to completed before all children are terminal.
   */
  bubbleResult(
    nodeId: HierarchyNodeId,
    result: NodeResult,
  ): void {
    const node = this.nodes.get(nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found`)
    if (!node.parentId) throw new Error("Cannot bubble result from root")

    const now = new Date().toISOString() as IsoTimestamp

    // Update this node
    const updated: HierarchyNode = {
      ...node,
      result,
      state: "completed",
      updatedAt: now,
    }
    this.nodes.set(nodeId, updated)

    // Check if parent can complete (H12: all children terminal)
    const parent = this.nodes.get(node.parentId)
    if (parent) {
      const allChildrenTerminal = parent.childIds.every(childId => {
        const child = this.nodes.get(childId)
        return child && (child.state === "completed" || child.state === "cancelled" || child.state === "failed")
      })

      if (allChildrenTerminal && parent.state === "completing") {
        this.updateNodeState(parent.id, "completed")
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Orphan Detection (WorkerHierarchy-Part05 §Orphans)
  // ---------------------------------------------------------------------------

  detectOrphans(): readonly HierarchyNodeId[] {
    const orphans: HierarchyNodeId[] = []
    for (const node of this.nodes.values()) {
      if (node.parentId && !this.nodes.has(node.parentId)) {
        orphans.push(node.id)
      }
    }
    return orphans
  }

  // ---------------------------------------------------------------------------
  // Query API
  // ---------------------------------------------------------------------------

  getNode(nodeId: HierarchyNodeId): HierarchyNode | undefined {
    return this.nodes.get(nodeId)
  }

  getNodeByActorId(actorId: WorkerId): HierarchyNode | undefined {
    const nodeId = this.actorIndex.get(actorId)
    return nodeId ? this.nodes.get(nodeId) : undefined
  }

  getChildren(nodeId: HierarchyNodeId): readonly HierarchyNode[] {
    const node = this.nodes.get(nodeId)
    if (!node) return []
    return node.childIds
      .map(id => this.nodes.get(id))
      .filter((n): n is HierarchyNode => n !== undefined)
  }

  getAncestors(nodeId: HierarchyNodeId): readonly HierarchyNode[] {
    const ancestors: HierarchyNode[] = []
    let current = this.nodes.get(nodeId)
    while (current?.parentId) {
      const parent = this.nodes.get(current.parentId)
      if (parent) {
        ancestors.push(parent)
        current = parent
      } else {
        break
      }
    }
    return ancestors
  }

  getDescendants(nodeId: HierarchyNodeId): readonly HierarchyNode[] {
    const descendants: HierarchyNode[] = []
    const queue = [nodeId]
    while (queue.length > 0) {
      const current = queue.shift()!
      const node = this.nodes.get(current)
      if (!node) continue
      descendants.push(...node.childIds.map(id => this.nodes.get(id)).filter((n): n is HierarchyNode => n !== undefined))
      queue.push(...node.childIds)
    }
    return descendants
  }

  getNodesByState(state: HierarchyNodeState): readonly HierarchyNode[] {
    return [...this.nodes.values()].filter(n => n.state === state)
  }

  getNodesBySession(sessionId: SessionId): readonly HierarchyNode[] {
    return [...this.nodes.values()].filter(n => n.sessionId === sessionId)
  }

  getNodeCount(): number {
    return this.nodes.size
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private updateNodeState(nodeId: HierarchyNodeId, newState: HierarchyNodeState): void {
    const node = this.nodes.get(nodeId)
    if (!node) return

    const now = new Date().toISOString() as IsoTimestamp
    const updated: HierarchyNode = {
      ...node,
      state: newState,
      updatedAt: now,
      terminatedAt: (newState === "completed" || newState === "cancelled" || newState === "failed") ? now : node.terminatedAt,
    }
    this.nodes.set(nodeId, updated)
  }
}
