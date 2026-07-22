/**
 * P09-MEM-KB — KnowledgeBase ingestion tests
 */

import { describe, it, expect } from "vitest"
import { VectorMemoryStore } from "./memory-vector"
import { EmbeddingService } from "./embedding-service"
import { KnowledgeBase } from "./knowledge-base"
import { brand, type WorkspaceId } from "@/core/types"
import { chunkText } from "./chunker"

const WS = brand<WorkspaceId>("ws-kb")

function makeKb(): KnowledgeBase {
  return new KnowledgeBase(new VectorMemoryStore(new EmbeddingService()))
}

describe("chunker", () => {
  it("returns a single chunk for short text", () => {
    expect(chunkText("Short sentence here.")).toEqual(["Short sentence here."])
  })

  it("splits long text into multiple overlapping chunks", () => {
    const longText = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} about neural networks.`).join(" ")
    const chunks = chunkText(longText)
    expect(chunks.length).toBeGreaterThan(1)
    // Overlap should cause some shared content across adjacent chunks.
    const shared = (chunks[0] ?? "").split(" ").filter((w) => (chunks[1] ?? "").includes(w))
    expect(shared.length).toBeGreaterThan(0)
  })

  it("returns nothing for empty input", () => {
    expect(chunkText("   ")).toEqual([])
  })
})

describe("KnowledgeBase.ingest — markdown", () => {
  it("ingests markdown into multiple searchable chunks", async () => {
    const kb = makeKb()
    const doc = `# Rust Ownership

Memory safety without garbage collection. Ownership is transferred on move.

The borrow checker enforces aliasing rules at compile time. References must
not outlive their owner. This is what makes concurrent Rust safe.

Mention again the borrow checker and compile time guarantees for emphasis.`

    const result = await kb.ingest("markdown", doc, WS, { title: "rust" })
    expect(result.kind).toBe("markdown")
    expect(result.ids.length).toBeGreaterThan(0)
    expect(kb.store.count(WS)).toBe(result.ids.length)

    const found = await kb.search("borrow checker compile time", WS)
    expect(found.length).toBeGreaterThan(0)
    expect(found[0]?.record.chunkText.toLowerCase()).toContain("borrow checker")
  })

  it("strips markdown syntax before chunking", async () => {
    const kb = makeKb()
    await kb.ingest("markdown", "# Title\n\n**bold** and `code` and [link](http://x).", WS)
    const records = kb.store.getForWorkspace(WS)
    expect(records.some((r) => r.chunkText.includes("**"))).toBe(false)
    expect(records.some((r) => r.chunkText.includes("`code`"))).toBe(false)
  })
})

describe("KnowledgeBase.ingest — text", () => {
  it("ingests plain text and searches it", async () => {
    const kb = makeKb()
    const res = await kb.ingest("text", "Embeddings map text into a vector space for similarity search.", WS)
    expect(res.ids.length).toBeGreaterThan(0)
    const found = await kb.search("vector space similarity", WS)
    expect(found.length).toBeGreaterThan(0)
  })
})
