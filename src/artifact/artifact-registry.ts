/**
 * P10-ART-REGISTRY — Artifact Kind Registry
 *
 * The single place that defines which artifact kinds exist and which typed spec
 * owns each one. From ArtifactArchitecture-Part04 §TheKindRegistry.
 */

import type { ArtifactKind } from "./artifact-types"

// ---------------------------------------------------------------------------
// Kind Descriptor
// ---------------------------------------------------------------------------

export interface KindDescriptor {
  readonly kind: ArtifactKind
  readonly label: string
  readonly description: string
  readonly contentType: string
  readonly isMergeable: boolean
  readonly isVerifiable: boolean
  readonly isVersioned: boolean
  readonly structuralValidator?: (content: string | Uint8Array) => boolean
}

// ---------------------------------------------------------------------------
// Baseline Registry (ArtifactArchitecture-Part04 §BaselineRegistry)
// ---------------------------------------------------------------------------

const BASELINE_KINDS: ReadonlyMap<ArtifactKind, KindDescriptor> = new Map([
  [
    "plan",
    {
      kind: "plan",
      label: "Plan",
      description: "A textual plan or outline of intended work",
      contentType: "text/markdown",
      isMergeable: false,
      isVerifiable: true,
      isVersioned: true,
    },
  ],
  [
    "task_list",
    {
      kind: "task_list",
      label: "Task List",
      description: "A decomposed checklist of subtasks",
      contentType: "application/json",
      isMergeable: false,
      isVerifiable: true,
      isVersioned: true,
    },
  ],
  [
    "patch",
    {
      kind: "patch",
      label: "Patch",
      description: "A diff/patch that can be applied to project files",
      contentType: "text/x-patch",
      isMergeable: true,
      isVerifiable: true,
      isVersioned: true,
    },
  ],
  [
    "code",
    {
      kind: "code",
      label: "Code",
      description: "A source-code Artifact, possibly multi-file",
      contentType: "text/plain",
      isMergeable: true,
      isVerifiable: true,
      isVersioned: true,
    },
  ],
  [
    "markdown",
    {
      kind: "markdown",
      label: "Markdown",
      description: "A documentation Artifact",
      contentType: "text/markdown",
      isMergeable: true,
      isVerifiable: true,
      isVersioned: true,
    },
  ],
  [
    "json",
    {
      kind: "json",
      label: "JSON",
      description: "A structured-data Artifact",
      contentType: "application/json",
      isMergeable: true,
      isVerifiable: true,
      isVersioned: true,
    },
  ],
  [
    "image",
    {
      kind: "image",
      label: "Image",
      description: "A binary image Artifact",
      contentType: "image/png",
      isMergeable: true,
      isVerifiable: false,
      isVersioned: true,
    },
  ],
  [
    "test_report",
    {
      kind: "test_report",
      label: "Test Report",
      description: "A test-result and coverage Artifact",
      contentType: "application/json",
      isMergeable: false,
      isVerifiable: false,
      isVersioned: true,
    },
  ],
  [
    "log",
    {
      kind: "log",
      label: "Log",
      description: "Raw or semi-structured output logs from a Worker or process",
      contentType: "text/plain",
      isMergeable: false,
      isVerifiable: false,
      isVersioned: false,
    },
  ],
  [
    "diagram",
    {
      kind: "diagram",
      label: "Diagram",
      description: "A graph or visual representation, usually rendered",
      contentType: "image/svg+xml",
      isMergeable: false,
      isVerifiable: false,
      isVersioned: true,
    },
  ],
  [
    "prompt",
    {
      kind: "prompt",
      label: "Prompt",
      description: "A prompt template or prompt instance",
      contentType: "text/plain",
      isMergeable: false,
      isVerifiable: false,
      isVersioned: true,
    },
  ],
  [
    "model_response",
    {
      kind: "model_response",
      label: "Model Response",
      description: "A raw or structured model output",
      contentType: "application/json",
      isMergeable: false,
      isVerifiable: false,
      isVersioned: true,
    },
  ],
  [
    "review",
    {
      kind: "review",
      label: "Review",
      description: "A review or critique text, usually from a critic",
      contentType: "text/markdown",
      isMergeable: false,
      isVerifiable: false,
      isVersioned: false,
    },
  ],
  [
    "verification_result",
    {
      kind: "verification_result",
      label: "Verification Result",
      description: "A Verifier's Verdict surfaced as an Artifact (read-only mirror)",
      contentType: "application/json",
      isMergeable: false,
      isVerifiable: false,
      isVersioned: false,
    },
  ],
  [
    "merge_result",
    {
      kind: "merge_result",
      label: "Merge Result",
      description: "A MergeManager result surfaced as an Artifact (read-only mirror)",
      contentType: "application/json",
      isMergeable: false,
      isVerifiable: false,
      isVersioned: false,
    },
  ],
])

// ---------------------------------------------------------------------------
// ArtifactRegistry
// ---------------------------------------------------------------------------

export class ArtifactRegistry {
  private readonly kinds = new Map<ArtifactKind, KindDescriptor>(BASELINE_KINDS)
  private readonly customKinds = new Set<ArtifactKind>()

  /** Check if a kind is registered. */
  has(kind: string): kind is ArtifactKind {
    return this.kinds.has(kind as ArtifactKind)
  }

  /** Get a kind descriptor. Returns undefined for unknown kinds. */
  get(kind: ArtifactKind): KindDescriptor | undefined {
    return this.kinds.get(kind)
  }

  /** Get all registered kinds. */
  all(): readonly KindDescriptor[] {
    return Array.from(this.kinds.values())
  }

  /** Get all mergeable kinds. */
  mergeable(): readonly KindDescriptor[] {
    return this.all().filter((k) => k.isMergeable)
  }

  /** Get all verifiable kinds. */
  verifiable(): readonly KindDescriptor[] {
    return this.all().filter((k) => k.isVerifiable)
  }

  /** Get all versioned kinds. */
  versioned(): readonly KindDescriptor[] {
    return this.all().filter((k) => k.isVersioned)
  }

  /**
   * Register a custom kind (plugin-registered).
   * From ArtifactArchitecture-Part04 §Extensibility:
   * - MUST NOT shadow a baseline kind
   * - MUST define its own typed rules
   */
  register(descriptor: KindDescriptor): boolean {
    if (this.kinds.has(descriptor.kind)) {
      return false // cannot shadow
    }
    this.kinds.set(descriptor.kind, descriptor)
    this.customKinds.add(descriptor.kind)
    return true
  }

  /** Unregister a custom kind. Baseline kinds cannot be removed. */
  unregister(kind: ArtifactKind): boolean {
    if (!this.customKinds.has(kind)) {
      return false // baseline or not registered
    }
    this.kinds.delete(kind)
    this.customKinds.delete(kind)
    return true
  }

  /** Validate that a kind is registered (rejects unknown kinds at creation). */
  validateKind(kind: string): kind is ArtifactKind {
    return this.has(kind)
  }

  /** Get the content type for a kind. */
  getContentType(kind: ArtifactKind): string | undefined {
    return this.kinds.get(kind)?.contentType
  }

  /** Check if a kind is mergeable. */
  isMergeable(kind: ArtifactKind): boolean {
    return this.kinds.get(kind)?.isMergeable ?? false
  }
}
