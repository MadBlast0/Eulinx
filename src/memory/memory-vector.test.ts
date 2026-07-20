/**
 * P09-MEM-EMBED / P09-MEM-SEARCH — Vector memory & hybrid search tests
 */

import { describe, it, expect } from "vitest"
import type { WorkspaceId } from "@/core/types"
import { VectorMemoryStore } from "./memory-vector"
import { EmbeddingService, cosineSimilarity } from "./embedding-service"
import { brand } from "@/core/types"

const WS = brand<string, "WorkspaceId">("ws-test")

async function seed(store: VectorMemoryStore, ws: WorkspaceId) {
  await store.index({
    sourceId: "s1",
    sourceType: "document",
    workspaceId: ws,
    chunkText: "The quantum neural compiler optimizes tensor graphs for GPU acceleration.",
    embeddingModel: "pending",
    vectorRef: "s1#0",
  })
  await store.index({
    sourceId: "s2",
    sourceType: "document",
    workspaceId: ws,
    chunkText: "Grilling vegetables on the barbecue requires medium-high heat and olive oil.",
    embeddingModel: "pending",
    vectorRef: "s2#0",
  })
  await store.index({
    sourceId: "s3",
    sourceType: "document",
    workspaceId: ws,
    chunkText: "We refactored the authentication module to use OAuth2 bearer tokens.",
    embeddingModel: "pending",
    vectorRef: "s3#0",
  })
}

describe("EmbeddingService (local fallback)", () => {
  it("produces a fixed-dimension, normalized vector", async () => {
    const svc = new EmbeddingService()
    const { vector, backend, model } = await svc.embed("hello world")
    expect(backend).toBe("local")
    expect(model).toBe("local-hash-256")
    expect(vector.length).toBe(svc.localDim)
    const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0))
    expect(norm).toBeCloseTo(1, 5)
  })

  it("is deterministic for identical input", async () => {
    const svc = new EmbeddingService()
    const a = await svc.embed("the cat sat on the mat")
    const b = await svc.embed("the cat sat on the mat")
    expect(a.vector).toEqual(b.vector)
  })

  it("cosine similarity of a vector with itself is 1", () => {
    const v = [0.1, 0.2, -0.3, 0.4]
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6)
  })
})

describe("VectorMemoryStore hybrid search", () => {
  it("ranks the semantically relevant chunk above an irrelevant one", async () => {
    const store = new VectorMemoryStore(new EmbeddingService())
    await seed(store, WS)

    const results = await store.search({
      text: "GPU tensor computation and neural network training",
      workspaceId: WS,
    })

    expect(results.length).toBeGreaterThan(0)
    const top = results[0]
    expect(top?.record.chunkText).toContain("quantum neural compiler")
    expect(top?.matchType).toBe("semantic")
    expect(top?.semanticScore).toBeGreaterThan(0.1)
  })

  it("keyword query boosts the exact-match chunk", async () => {
    const store = new VectorMemoryStore(new EmbeddingService())
    await seed(store, WS)

    const results = await store.search({
      text: "barbecue",
      workspaceId: WS,
    })
    expect(results[0]?.record.chunkText).toContain("barbecue")
    expect(results[0]?.matchType).toBe("exact")
  })

  it("scopes results to the workspace", async () => {
    const store = new VectorMemoryStore(new EmbeddingService())
    await seed(store, WS)
    const other = brand<string, "WorkspaceId">("other")
    const results = await store.search({ text: "neural", workspaceId: other })
    expect(results.length).toBe(0)
  })
})
