/**
 * P09-MEM-POLICIES / P09-MEM-COMPRESS / P09-MEM-PRUNE — Policies Tests
 */

import { describe, it, expect } from "vitest"
import type { WorkspaceId, IsoTimestamp } from "@/core/types"
import type { MemoryRecord } from "./memory-types"
import {
  containsSecrets,
  redactSecrets,
  isScopeViolation,
  isUnsafeForInjection,
  isPastRetention,
  compressRecords,
  pruneRecords,
  DEFAULT_MEMORY_POLICY,
} from "./memory-policies"

function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }

function mockRecord(overrides?: Partial<MemoryRecord>): MemoryRecord {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    id: "mem_1",
    kind: "stm",
    scope: "worker",
    workspaceId: ws("ws_1"),
    content: "Test",
    sensitivity: "internal",
    tags: [],
    tokenEstimate: 1,
    createdAt: now,
    updatedAt: now,
    metadata: {},
    ...overrides,
  }
}

describe("containsSecrets", () => {
  it("detects API keys", () => {
    expect(containsSecrets("api_key=sk_abc123def456ghi789jkl0")).toBe(true)
  })

  it("detects passwords", () => {
    expect(containsSecrets("password: mysecretpassword123")).toBe(true)
  })

  it("detects private keys", () => {
    expect(containsSecrets("-----BEGIN RSA PRIVATE KEY-----")).toBe(true)
  })

  it("does not flag normal text", () => {
    expect(containsSecrets("This is a normal sentence about coding.")).toBe(false)
  })
})

describe("redactSecrets", () => {
  it("redacts API keys", () => {
    const redacted = redactSecrets("api_key=sk_abc123def456ghi789jkl0")
    expect(redacted).toContain("[REDACTED]")
    expect(redacted).not.toContain("sk_abc123")
  })

  it("redacts passwords", () => {
    const redacted = redactSecrets("password: mysecretpassword123")
    expect(redacted).toContain("[REDACTED]")
  })
})

describe("isScopeViolation", () => {
  it("detects cross-workspace access", () => {
    const record = mockRecord({ workspaceId: ws("ws_1") })
    expect(isScopeViolation(record, ws("ws_2"))).toBe(true)
  })

  it("allows same workspace", () => {
    const record = mockRecord({ workspaceId: ws("ws_1") })
    expect(isScopeViolation(record, ws("ws_1"))).toBe(false)
  })
})

describe("isUnsafeForInjection", () => {
  it("flags secret records", () => {
    expect(isUnsafeForInjection(mockRecord({ sensitivity: "secret" }))).toBe(true)
  })

  it("allows internal records", () => {
    expect(isUnsafeForInjection(mockRecord({ sensitivity: "internal" }))).toBe(false)
  })
})

describe("isPastRetention", () => {
  it("detects old records", () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() as IsoTimestamp
    expect(isPastRetention(mockRecord({ createdAt: oldDate }), 90)).toBe(true)
  })

  it("allows recent records", () => {
    expect(isPastRetention(mockRecord(), 90)).toBe(false)
  })
})

describe("compressRecords", () => {
  it("compresses records into summary", () => {
    const records = [
      mockRecord({ content: "React hooks" }),
      mockRecord({ content: "Vue composition" }),
      mockRecord({ content: "React hooks" }), // duplicate
    ]

    const compressed = compressRecords(records)
    expect(compressed).toContain("React hooks")
    expect(compressed).toContain("Vue composition")
    // Should deduplicate
    expect(compressed.split("React hooks").length).toBe(2) // once in content, once as separator
  })

  it("returns empty for no records", () => {
    expect(compressRecords([])).toBe("")
  })
})

describe("pruneRecords", () => {
  it("prunes old records", () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() as IsoTimestamp
    const records = [
      mockRecord({ id: "old", createdAt: oldDate }),
      mockRecord({ id: "new" }),
    ]

    const result = pruneRecords(records, DEFAULT_MEMORY_POLICY)
    expect(result.prunedCount).toBe(1)
    expect(result.retainedCount).toBe(1)
    expect(result.prunedIds).toContain("old")
  })

  it("prunes secrets when autoRedact is on", () => {
    const records = [
      mockRecord({ id: "secret", sensitivity: "secret" }),
      mockRecord({ id: "ok", sensitivity: "internal" }),
    ]

    const result = pruneRecords(records, { ...DEFAULT_MEMORY_POLICY, autoRedactSecrets: true })
    expect(result.prunedIds).toContain("secret")
  })
})
