/**
 * P10-ART-GRAPH / P10-ART-REF tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ArtifactRelationships } from "./artifact-relationships"
import type { ArtifactId } from "./artifact-types"
import { brand } from "@/core/types"

describe("ArtifactRelationships", () => {
  let rels: ArtifactRelationships

  beforeEach(() => {
    rels = new ArtifactRelationships()
  })

  it("should create a relationship", () => {
    const result = rels.create({
      fromArtifactId: brand<ArtifactId>("a1"),
      toArtifactId: brand<ArtifactId>("a2"),
      relation: "parent-child",
      createdBy: "worker-1",
    })
    expect(result).not.toBeNull()
    expect(result?.relation).toBe("parent-child")
    expect(result?.fromArtifactId).toBe(brand<ArtifactId>("a1"))
    expect(result?.toArtifactId).toBe(brand<ArtifactId>("a2"))
  })

  it("should get outgoing relationships", () => {
    rels.create({
      fromArtifactId: brand<ArtifactId>("a1"),
      toArtifactId: brand<ArtifactId>("a2"),
      relation: "parent-child",
      createdBy: "worker-1",
    })
    rels.create({
      fromArtifactId: brand<ArtifactId>("a1"),
      toArtifactId: brand<ArtifactId>("a3"),
      relation: "references",
      createdBy: "worker-1",
    })

    const outgoing = rels.getOutgoing(brand<ArtifactId>("a1"))
    expect(outgoing).toHaveLength(2)
  })

  it("should get incoming relationships", () => {
    rels.create({
      fromArtifactId: brand<ArtifactId>("a1"),
      toArtifactId: brand<ArtifactId>("a2"),
      relation: "parent-child",
      createdBy: "worker-1",
    })
    rels.create({
      fromArtifactId: brand<ArtifactId>("a3"),
      toArtifactId: brand<ArtifactId>("a2"),
      relation: "references",
      createdBy: "worker-1",
    })

    const incoming = rels.getIncoming(brand<ArtifactId>("a2"))
    expect(incoming).toHaveLength(2)
  })

  it("should get relationships by type", () => {
    rels.create({
      fromArtifactId: brand<ArtifactId>("a1"),
      toArtifactId: brand<ArtifactId>("a2"),
      relation: "parent-child",
      createdBy: "worker-1",
    })
    rels.create({
      fromArtifactId: brand<ArtifactId>("a1"),
      toArtifactId: brand<ArtifactId>("a3"),
      relation: "references",
      createdBy: "worker-1",
    })

    const parentChild = rels.getOutgoingByType(
      brand<ArtifactId>("a1"),
      "parent-child"
    )
    expect(parentChild).toHaveLength(1)
    expect(parentChild[0].toArtifactId).toBe(brand<ArtifactId>("a2"))
  })

  it("should get parent artifact", () => {
    rels.create({
      fromArtifactId: brand<ArtifactId>("child"),
      toArtifactId: brand<ArtifactId>("parent"),
      relation: "parent-child",
      createdBy: "worker-1",
    })

    expect(rels.getParent(brand<ArtifactId>("child"))).toBe(
      brand<ArtifactId>("parent")
    )
  })

  it("should get children artifacts", () => {
    rels.create({
      fromArtifactId: brand<ArtifactId>("child1"),
      toArtifactId: brand<ArtifactId>("parent"),
      relation: "parent-child",
      createdBy: "worker-1",
    })
    rels.create({
      fromArtifactId: brand<ArtifactId>("child2"),
      toArtifactId: brand<ArtifactId>("parent"),
      relation: "parent-child",
      createdBy: "worker-1",
    })

    const children = rels.getChildren(brand<ArtifactId>("parent"))
    expect(children).toHaveLength(2)
    expect(children).toContain(brand<ArtifactId>("child1"))
    expect(children).toContain(brand<ArtifactId>("child2"))
  })

  it("should walk derivation chain to root", () => {
    rels.create({
      fromArtifactId: brand<ArtifactId>("v3"),
      toArtifactId: brand<ArtifactId>("v2"),
      relation: "parent-child",
      createdBy: "worker-1",
    })
    rels.create({
      fromArtifactId: brand<ArtifactId>("v2"),
      toArtifactId: brand<ArtifactId>("v1"),
      relation: "parent-child",
      createdBy: "worker-1",
    })

    const chain = rels.walkDerivationChain(brand<ArtifactId>("v3"))
    expect(chain).toEqual([
      brand<ArtifactId>("v1"),
      brand<ArtifactId>("v2"),
      brand<ArtifactId>("v3"),
    ])
  })

  it("should reject cycles", () => {
    rels.create({
      fromArtifactId: brand<ArtifactId>("a1"),
      toArtifactId: brand<ArtifactId>("a2"),
      relation: "parent-child",
      createdBy: "worker-1",
    })

    const result = rels.create({
      fromArtifactId: brand<ArtifactId>("a2"),
      toArtifactId: brand<ArtifactId>("a1"),
      relation: "parent-child",
      createdBy: "worker-1",
    })
    expect(result).toBeNull()
  })

  it("should reject self-referencing", () => {
    const result = rels.create({
      fromArtifactId: brand<ArtifactId>("a1"),
      toArtifactId: brand<ArtifactId>("a1"),
      relation: "parent-child",
      createdBy: "worker-1",
    })
    expect(result).toBeNull()
  })

  it("should get graph node", () => {
    rels.create({
      fromArtifactId: brand<ArtifactId>("a1"),
      toArtifactId: brand<ArtifactId>("a2"),
      relation: "parent-child",
      createdBy: "worker-1",
    })
    rels.create({
      fromArtifactId: brand<ArtifactId>("a3"),
      toArtifactId: brand<ArtifactId>("a1"),
      relation: "references",
      createdBy: "worker-1",
    })

    const node = rels.getGraphNode(brand<ArtifactId>("a1"))
    expect(node.artifactId).toBe(brand<ArtifactId>("a1"))
    expect(node.relations).toHaveLength(2)
  })

  it("should delete relationships", () => {
    const rel = rels.create({
      fromArtifactId: brand<ArtifactId>("a1"),
      toArtifactId: brand<ArtifactId>("a2"),
      relation: "parent-child",
      createdBy: "worker-1",
    })
    expect(rels.size()).toBe(1)

    rels.delete(rel!.id)
    expect(rels.size()).toBe(0)
  })

  it("should get all relationships for an artifact", () => {
    rels.create({
      fromArtifactId: brand<ArtifactId>("a1"),
      toArtifactId: brand<ArtifactId>("a2"),
      relation: "parent-child",
      createdBy: "worker-1",
    })
    rels.create({
      fromArtifactId: brand<ArtifactId>("a3"),
      toArtifactId: brand<ArtifactId>("a1"),
      relation: "references",
      createdBy: "worker-1",
    })

    const all = rels.getAll(brand<ArtifactId>("a1"))
    expect(all).toHaveLength(2)
  })
})
