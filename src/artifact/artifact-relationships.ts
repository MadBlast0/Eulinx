/**
 * P10-ART-GRAPH / P10-ART-REF — Artifact Relationships & Dependency Graph
 *
 * How artifacts connect to each other: parent-child, derived-from, references,
 * supersedes, attached-to. From ArtifactRelationships-Part01 through Part03.
 */

import { generateId } from "@/core/uuid"
import type { ArtifactId, IsoTimestamp } from "@/core/types"
import type {
  ArtifactRelationship,
  ArtifactRelation,
  ArtifactRelationshipRequest,
} from "./artifact-types"

// ---------------------------------------------------------------------------
// Graph Node (for traversal)
// ---------------------------------------------------------------------------

export interface GraphNode {
  readonly artifactId: ArtifactId
  readonly relations: readonly ArtifactRelationship[]
}

// ---------------------------------------------------------------------------
// ArtifactRelationships
// ---------------------------------------------------------------------------

export class ArtifactRelationships {
  private readonly edges = new Map<string, ArtifactRelationship>()
  private readonly bySource = new Map<ArtifactId, Set<string>>()
  private readonly byTarget = new Map<ArtifactId, Set<string>>()

  /**
   * Create a relationship between two artifacts.
   * From ArtifactRelationships-Part01 §RelationshipRecord.
   * Validates no cycles are created.
   */
  create(request: ArtifactRelationshipRequest): ArtifactRelationship | null {
    // Validate no cycles for parent-child and derived-from
    if (
      (request.relation === "parent-child" || request.relation === "derived-from") &&
      this.wouldCreateCycle(request.fromArtifactId, request.toArtifactId)
    ) {
      return null // cycle detected
    }

    const id = generateId()
    const relationship: ArtifactRelationship = {
      id,
      fromArtifactId: request.fromArtifactId,
      toArtifactId: request.toArtifactId,
      relation: request.relation,
      context: request.context,
      createdBy: request.createdBy,
      createdAt: new Date().toISOString() as IsoTimestamp,
    }

    this.edges.set(id, relationship)

    // Index by source
    if (!this.bySource.has(request.fromArtifactId)) {
      this.bySource.set(request.fromArtifactId, new Set())
    }
    const sourceSet = this.bySource.get(request.fromArtifactId)
    if (sourceSet) sourceSet.add(id)

    // Index by target
    if (!this.byTarget.has(request.toArtifactId)) {
      this.byTarget.set(request.toArtifactId, new Set())
    }
    const targetSet = this.byTarget.get(request.toArtifactId)
    if (targetSet) targetSet.add(id)

    return relationship
  }

  /**
   * Get all outgoing relationships from an artifact.
   */
  getOutgoing(artifactId: ArtifactId): readonly ArtifactRelationship[] {
    const edgeIds = this.bySource.get(artifactId)
    if (!edgeIds) return []
    return Array.from(edgeIds)
      .map((id) => this.edges.get(id))
      .filter((r): r is ArtifactRelationship => r !== undefined)
  }

  /**
   * Get all incoming relationships to an artifact.
   */
  getIncoming(artifactId: ArtifactId): readonly ArtifactRelationship[] {
    const edgeIds = this.byTarget.get(artifactId)
    if (!edgeIds) return []
    return Array.from(edgeIds)
      .map((id) => this.edges.get(id))
      .filter((r): r is ArtifactRelationship => r !== undefined)
  }

  /**
   * Get relationships of a specific type from an artifact.
   */
  getOutgoingByType(
    artifactId: ArtifactId,
    relation: ArtifactRelation
  ): readonly ArtifactRelationship[] {
    return this.getOutgoing(artifactId).filter((r) => r.relation === relation)
  }

  /**
   * Get the parent artifact (parent-child relationship).
   */
  getParent(artifactId: ArtifactId): ArtifactId | undefined {
    const outgoing = this.getOutgoingByType(artifactId, "parent-child")
    return outgoing[0]?.toArtifactId
  }

  /**
   * Get all children of an artifact.
   */
  getChildren(artifactId: ArtifactId): readonly ArtifactId[] {
    return this.getIncoming(artifactId)
      .filter((r) => r.relation === "parent-child")
      .map((r) => r.fromArtifactId)
  }

  /**
   * Get all artifacts that reference this one.
   */
  getReferences(artifactId: ArtifactId): readonly ArtifactId[] {
    return this.getIncoming(artifactId)
      .filter((r) => r.relation === "references")
      .map((r) => r.fromArtifactId)
  }

  /**
   * Get all artifacts derived from this one.
   */
  getDerived(artifactId: ArtifactId): readonly ArtifactId[] {
    return this.getIncoming(artifactId)
      .filter((r) => r.relation === "derived-from")
      .map((r) => r.fromArtifactId)
  }

  /**
   * Get all artifacts that supersedes this one.
   */
  getSupersededBy(artifactId: ArtifactId): ArtifactId | undefined {
    const incoming = this.getIncoming(artifactId).filter(
      (r) => r.relation === "supersedes"
    )
    return incoming[0]?.fromArtifactId
  }

  /**
   * Get all artifacts attached to this one.
   */
  getAttached(artifactId: ArtifactId): readonly ArtifactId[] {
    return this.getIncoming(artifactId)
      .filter((r) => r.relation === "attached-to")
      .map((r) => r.fromArtifactId)
  }

  /**
   * Walk the derivation chain from an artifact back to its root.
   * From ArtifactRelationships-Part02 §DerivationChains.
   */
  walkDerivationChain(
    artifactId: ArtifactId
  ): readonly ArtifactId[] {
    const chain: ArtifactId[] = [artifactId]
    const visited = new Set<ArtifactId>([artifactId])

    let current = artifactId
    while (true) {
      const parent = this.getParent(current)
      if (!parent || visited.has(parent)) break
      visited.add(parent)
      chain.push(parent)
      current = parent
    }

    return chain.reverse()
  }

  /**
   * Get the full graph node for an artifact (all relationships).
   */
  getGraphNode(artifactId: ArtifactId): GraphNode {
    const allRelations = [
      ...this.getOutgoing(artifactId),
      ...this.getIncoming(artifactId),
    ]
    return { artifactId, relations: allRelations }
  }

  /**
   * Check if creating a relationship would create a cycle.
   * Cycles are illegal: ArtifactRelationships-Part03 §RelationshipIntegrity.
   */
  private wouldCreateCycle(from: ArtifactId, to: ArtifactId): boolean {
    if (from === to) return true
    // Walk from 'to' backwards through parent-child and derived-from edges
    const visited = new Set<ArtifactId>([from])
    const queue: ArtifactId[] = [to]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (current === from) return true
      if (visited.has(current)) continue
      visited.add(current)
      // Check outgoing parent-child and derived-from from current
      const outgoing = this.getOutgoing(current)
      for (const rel of outgoing) {
        if (rel.relation === "parent-child" || rel.relation === "derived-from") {
          queue.push(rel.toArtifactId)
        }
      }
    }
    return false
  }

  /**
   * Delete a relationship.
   */
  delete(relationshipId: string): boolean {
    const rel = this.edges.get(relationshipId)
    if (!rel) return false

    this.edges.delete(relationshipId)
    this.bySource.get(rel.fromArtifactId)?.delete(relationshipId)
    this.byTarget.get(rel.toArtifactId)?.delete(relationshipId)
    return true
  }

  /**
   * Get all relationships for an artifact (both directions).
   */
  getAll(artifactId: ArtifactId): readonly ArtifactRelationship[] {
    return [
      ...this.getOutgoing(artifactId),
      ...this.getIncoming(artifactId),
    ]
  }

  /** Total number of relationships. */
  size(): number {
    return this.edges.size
  }
}
