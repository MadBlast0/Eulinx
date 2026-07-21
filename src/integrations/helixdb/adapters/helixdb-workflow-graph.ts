/**
 * HelixDB Workflow Graph — DEPENDS_ON edge storage and analysis queries
 *
 * Stores workflow dependency graphs as DEPENDS_ON edges between NodeState
 * nodes in HelixDB, and provides analysis queries for dependency traversal,
 * impact analysis, and critical path computation.
 *
 * T18.1 — DEPENDS_ON edge storage when saving workflow graph snapshots
 * T18.2 — Workflow analysis queries (tool usage, dependency path, impact)
 */

import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import type { HelixDBClient, TenantScopedClient } from "../helixdb-client"
import type { GraphSnapshot } from "@/workflow/workflow-types"
import {
  LABEL_WORKFLOW_RUN,
  LABEL_NODE_STATE,
  EDGE_DEPENDS_ON,
  EDGE_HAS_NODE,
} from "../helixdb-types"

// ---------------------------------------------------------------------------
// WorkflowAnalysisResult
// ---------------------------------------------------------------------------

export interface WorkflowAnalysisResult {
  readonly nodeIds: readonly string[]
  readonly edges?: readonly { readonly from: string; readonly to: string }[]
}

// ---------------------------------------------------------------------------
// HelixDB Workflow Graph
// ---------------------------------------------------------------------------

export class HelixDBWorkflowGraph {
  private readonly client: HelixDBClient | TenantScopedClient
  private readonly workspaceId: string

  constructor(client: HelixDBClient | TenantScopedClient, workspaceId: string) {
    this.client = client
    this.workspaceId = workspaceId
  }

  // -------------------------------------------------------------------------
  // storeSnapshot — Store DEPENDS_ON edges for a workflow graph snapshot
  //
  // For each edge in the snapshot, creates a DEPENDS_ON edge between the
  // from and to WorkflowRun nodes. Also creates WorkflowRun nodes and links
  // them via HAS_NODE edges to NodeState nodes.
  // T18.1
  // -------------------------------------------------------------------------

  async storeSnapshot(snapshot: GraphSnapshot): Promise<Result<void, string>> {
    const queries: { query: string; params?: Record<string, unknown> }[] = []

    // Create or update WorkflowRun node for this snapshot
    queries.push({
      query: `nWithLabelWhere("${LABEL_WORKFLOW_RUN}", eq("id", "${snapshot.snapshotId}")).drop()`,
    })
    queries.push({
      query: `addN("${LABEL_WORKFLOW_RUN}", $props)`,
      params: {
        props: {
          id: snapshot.snapshotId,
          workspaceId: this.workspaceId,
          workflowId: snapshot.workflowId,
          snapshotId: snapshot.snapshotId,
          status: "created",
          createdAt: snapshot.createdAt,
          updatedAt: snapshot.createdAt,
        },
      },
    })

    // Create NodeState nodes for each node in the snapshot
    for (const node of snapshot.nodes) {
      const compositeId = `${snapshot.snapshotId}:${node.nodeId}`
      queries.push({
        query: `nWithLabelWhere("${LABEL_NODE_STATE}", eq("id", "${compositeId}")).drop()`,
      })
      queries.push({
        query: `addN("${LABEL_NODE_STATE}", $props)`,
        params: {
          props: {
            id: compositeId,
            workspaceId: this.workspaceId,
            runId: snapshot.snapshotId,
            nodeId: node.nodeId,
            iterationIndex: 0,
            state: "pending",
            attempt: 0,
            config: node.config,
            createdAt: snapshot.createdAt,
            updatedAt: snapshot.createdAt,
          },
        },
      })

      // Link WorkflowRun → NodeState via HAS_NODE
      queries.push({
        query: `addE("${EDGE_HAS_NODE}", nWithLabelWhere("${LABEL_WORKFLOW_RUN}", eq("id", "${snapshot.snapshotId}")), nWithLabelWhere("${LABEL_NODE_STATE}", eq("id", "${compositeId}")), {})`,
      })
    }

    // Create DEPENDS_ON edges for each edge in the snapshot
    // DEPENDS_ON points FROM the dependent node TO the prerequisite node
    for (const edge of snapshot.edges) {
      const fromId = `${snapshot.snapshotId}:${edge.fromNodeId}`
      const toId = `${snapshot.snapshotId}:${edge.toNodeId}`
      queries.push({
        query: `addE("${EDGE_DEPENDS_ON}", nWithLabelWhere("${LABEL_NODE_STATE}", eq("id", "${fromId}")), nWithLabelWhere("${LABEL_NODE_STATE}", eq("id", "${toId}")), $edgeProps)`,
        params: {
          edgeProps: {
            edgeId: edge.edgeId,
            edgeKind: edge.kind,
            cardinality: edge.cardinality,
          },
        },
      })
    }

    const result = await this.client.batch(queries)
    if (!result.ok) {
      return err(`Failed to store workflow snapshot: ${result.error.message}`)
    }
    if (result.value.error) {
      return err(`Failed to store workflow snapshot: ${result.value.error}`)
    }
    return ok(undefined)
  }

  // -------------------------------------------------------------------------
  // getDependencies — Return nodes that this node depends on (outgoing)
  //
  // Walks DEPENDS_ON edges from the given node to find its prerequisites.
  // T18.2
  // -------------------------------------------------------------------------

  async getDependencies(nodeId: string): Promise<Result<readonly string[], string>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_NODE_STATE}", eq("workspaceId", "${this.workspaceId}"), eq("nodeId", "${nodeId}")).out("${EDGE_DEPENDS_ON}").valueMap(["nodeId"])`,
    })

    if (!result.ok) {
      return err(`Failed to get dependencies: ${result.error.message}`)
    }

    const deps = (result.value.results ?? []).map(
      (r) => (r as { nodeId: string }).nodeId,
    )
    return ok(deps)
  }

  // -------------------------------------------------------------------------
  // getDependents — Return nodes that depend on this node (incoming)
  //
  // Walks DEPENDS_ON edges into the given node to find its dependents.
  // T18.2
  // -------------------------------------------------------------------------

  async getDependents(nodeId: string): Promise<Result<readonly string[], string>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_NODE_STATE}", eq("workspaceId", "${this.workspaceId}"), eq("nodeId", "${nodeId}")).in("${EDGE_DEPENDS_ON}").valueMap(["nodeId"])`,
    })

    if (!result.ok) {
      return err(`Failed to get dependents: ${result.error.message}`)
    }

    const dependents = (result.value.results ?? []).map(
      (r) => (r as { nodeId: string }).nodeId,
    )
    return ok(dependents)
  }

  // -------------------------------------------------------------------------
  // findAffectedByRemoval — Walk repeat(in("DEPENDS_ON")).emitAll()
  //
  // Finds all nodes transitively affected if the given node is removed.
  // Returns the full transitive closure of incoming DEPENDS_ON edges.
  // T18.2
  // -------------------------------------------------------------------------

  async findAffectedByRemoval(nodeId: string): Promise<Result<readonly string[], string>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_NODE_STATE}", eq("workspaceId", "${this.workspaceId}"), eq("nodeId", "${nodeId}")).repeat(in("${EDGE_DEPENDS_ON}")).emitAll().dedup().valueMap(["nodeId"])`,
    })

    if (!result.ok) {
      return err(`Failed to find affected nodes: ${result.error.message}`)
    }

    const affected = (result.value.results ?? []).map(
      (r) => (r as { nodeId: string }).nodeId,
    )
    return ok(affected)
  }

  // -------------------------------------------------------------------------
  // getCriticalPath — Find longest dependency chain in a workflow run
  //
  // Starting from root nodes (no incoming DEPENDS_ON edges), walks all
  // paths and returns the longest one as the critical path.
  // T18.2
  // -------------------------------------------------------------------------

  async getCriticalPath(runId: string): Promise<Result<readonly string[], string>> {
    // Fetch all nodes for this run
    const nodesResult = await this.client.query({
      query: `nWithLabelWhere("${LABEL_NODE_STATE}", eq("workspaceId", "${this.workspaceId}"), eq("runId", "${runId}")).valueMap(["nodeId"])`,
    })

    if (!nodesResult.ok) {
      return err(`Failed to get nodes: ${nodesResult.error.message}`)
    }

    const nodeIds = (nodesResult.value.results ?? []).map(
      (r) => (r as { nodeId: string }).nodeId,
    )

    if (nodeIds.length === 0) {
      return ok([])
    }

    // Build adjacency: for each node, find its parents (nodes it depends on)
    const parentOf = new Map<string, string[]>()
    for (const nid of nodeIds) {
      const depsResult = await this.client.query({
        query: `nWithLabelWhere("${LABEL_NODE_STATE}", eq("workspaceId", "${this.workspaceId}"), eq("runId", "${runId}"), eq("nodeId", "${nid}")).out("${EDGE_DEPENDS_ON}").valueMap(["nodeId"])`,
      })
      if (depsResult.ok) {
        const parents = (depsResult.value.results ?? []).map(
          (r) => (r as { nodeId: string }).nodeId,
        )
        parentOf.set(nid, parents)
      }
    }

    // DFS to find longest path ending at each node
    const memo = new Map<string, readonly string[]>()
    const visiting = new Set<string>()

    function longestPath(nid: string): readonly string[] {
      const cached = memo.get(nid)
      if (cached) return cached
      if (visiting.has(nid)) return [nid] // cycle guard
      visiting.add(nid)

      const parents = parentOf.get(nid) ?? []
      let best: readonly string[] = [nid]

      for (const parent of parents) {
        const path = longestPath(parent)
        const candidate = [...path, nid]
        if (candidate.length > best.length) {
          best = candidate
        }
      }

      visiting.delete(nid)
      memo.set(nid, best)
      return best
    }

    let longest: readonly string[] = []
    for (const nid of nodeIds) {
      const path = longestPath(nid)
      if (path.length > longest.length) {
        longest = path
      }
    }

    return ok(longest)
  }

  // -------------------------------------------------------------------------
  // findWorkflowsUsingTool — Find all workflows that use a specific tool
  //
  // Queries NodeState nodes by config.kind to find tool usage, then
  // traverses HAS_NODE edges up to the parent WorkflowRun.
  // T18.2
  // -------------------------------------------------------------------------

  async findWorkflowsUsingTool(toolName: string): Promise<Result<readonly string[], string>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_NODE_STATE}", eq("workspaceId", "${this.workspaceId}")).where(eq("config.kind", "${toolName}")).in("${EDGE_HAS_NODE}").valueMap(["id"])`,
    })

    if (!result.ok) {
      return err(`Failed to find workflows using tool: ${result.error.message}`)
    }

    const workflowIds = (result.value.results ?? []).map(
      (r) => (r as { id: string }).id,
    )
    return ok([...new Set(workflowIds)])
  }

  // -------------------------------------------------------------------------
  // traceDependencyPath — Trace path from node A to node B
  //
  // Uses repeat(out("DEPENDS_ON")).until() to find if there's a path
  // from the source node to the target node, returning all intermediate nodes.
  // T18.2
  // -------------------------------------------------------------------------

  async traceDependencyPath(
    fromNodeId: string,
    toNodeId: string,
  ): Promise<Result<readonly string[], string>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_NODE_STATE}", eq("workspaceId", "${this.workspaceId}"), eq("nodeId", "${fromNodeId}")).repeat(out("${EDGE_DEPENDS_ON}")).until(eq("nodeId", "${toNodeId}")).emitAll().valueMap(["nodeId"])`,
    })

    if (!result.ok) {
      return err(`Failed to trace dependency path: ${result.error.message}`)
    }

    const path = (result.value.results ?? []).map(
      (r) => (r as { nodeId: string }).nodeId,
    )

    // Include the start node if path is non-empty
    if (path.length > 0) {
      return ok([fromNodeId, ...path])
    }

    return ok([])
  }

  // -------------------------------------------------------------------------
  // findAffectedIfRemoved — What is affected if I remove node C?
  //
  // Run-scoped variant of findAffectedByRemoval.
  // T18.2
  // -------------------------------------------------------------------------

  async findAffectedIfRemoved(
    runId: string,
    nodeId: string,
  ): Promise<Result<readonly string[], string>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_NODE_STATE}", eq("workspaceId", "${this.workspaceId}"), eq("runId", "${runId}"), eq("nodeId", "${nodeId}")).repeat(in("${EDGE_DEPENDS_ON}")).emitAll().dedup().valueMap(["nodeId"])`,
    })

    if (!result.ok) {
      return err(`Failed to find affected nodes: ${result.error.message}`)
    }

    const affected = (result.value.results ?? []).map(
      (r) => (r as { nodeId: string }).nodeId,
    )
    return ok(affected)
  }
}
