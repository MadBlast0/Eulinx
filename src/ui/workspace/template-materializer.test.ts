/**
 * P11-TEMPLATE — template materializer tests
 *
 * Verifies that importing a template creates one artifact per blueprint file
 * in the workspace via the ArtifactManager.
 */

import { describe, it, expect } from "vitest"
import { ArtifactManager } from "@/artifact/artifact-manager"
import type { WorkspaceId } from "@/core/types"
import { materializeTemplate, blueprintForTemplate } from "./template-materializer"
import { TEMPLATES } from "./templates-store"

function makeTemplate(id: string) {
  const found = TEMPLATES.find((t) => t.id === id)
  if (!found) throw new Error(`missing template ${id}`)
  return found
}

describe("materializeTemplate", () => {
  it("creates one artifact per blueprint file", () => {
    const manager = new ArtifactManager("ws-test" as unknown as WorkspaceId)
    const template = makeTemplate("code-review")

    const result = materializeTemplate(template, manager)

    expect(result.artifactIds.length).toBe(blueprintForTemplate(template).length)
    expect(result.filenames[0]).toContain("code-review")
    expect(result.artifactIds.every((id) => id.length > 0)).toBe(true)
  })

  it("falls back to a single README for unknown templates", () => {
    const manager = new ArtifactManager("ws-test" as unknown as WorkspaceId)
    const template = {
      ...makeTemplate("doc-writer"),
      id: "does-not-exist",
    }
    const result = materializeTemplate(template, manager)
    expect(result.artifactIds.length).toBe(1)
    expect(result.filenames[0]).toBe("does-not-exist/README.md")
  })

  it("stores content that round-trips through the manager", () => {
    const manager = new ArtifactManager("ws-test" as unknown as WorkspaceId)
    const template = makeTemplate("build-pipeline")
    const result = materializeTemplate(template, manager)
    const id = result.artifactIds[0]
    const stored = manager.get(id)
    expect(stored).toBeDefined()
    expect(stored?.title).toContain("build.sh")
  })
})
