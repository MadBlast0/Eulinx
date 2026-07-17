---
title: JSONArtifacts Specification - Part 01
status: draft
version: 1.0
tags:
  - artifacts
  - json-artifacts
  - structured-data
related:
  - "[[05-artifacts/README]]"
  - "[[ArtifactArchitecture-Part04]]"
  - "[[Verification-Part03]]"
---

# JSONArtifacts Specification (Part 01)

## Document Index

Part 01 - What a JSON Artifact IS, schema obligations, and validation
Part 02 - Merge semantics for config and data

# Purpose

JSONArtifacts defines the `json` kind: structured-data Artifacts such as config blobs, API responses, extracted data, settings, and tool outputs. JSON is both human- and machine-readable, so it gets strict structural verification.

# What A JSON Artifact IS

A JSON Artifact carries well-formed JSON. Its `contentType` is `application/json`. It is used for:

- configuration the user may later apply (for example a settings file)
- structured tool outputs (for example a web-search result set)
- extracted or transformed data
- API responses cached as Artifacts
- schema-bearing data the workflow consumes downstream

# Schema Obligations

A JSON Artifact SHOULD declare a `schemaRef` in metadata when it claims to satisfy a schema. Validation then:

- parses the JSON (reject if invalid)
- if `schemaRef` is present, validates the parsed object against that schema
- records `validationState` on the envelope

Schemas are referenced, not embedded in the Artifact, so the same schema can govern many Artifacts and be versioned independently. A missing `schemaRef` means "valid JSON, schema unenforced", which is acceptable for free-form data but SHOULD still be valid JSON.

# Deterministic Verification

JSON verification is deterministic and authoritative:

- parseability is a hard gate (invalid JSON is `rejected`)
- schema conformance is a hard gate when a `schemaRef` is declared
- a JSON Artifact that fails schema MUST NOT be merged, because applying malformed config can corrupt project state

AI review of JSON (for example "is this the right shape for the API?") is advisory only.

# Invariants

```text
A JSON Artifact is always valid JSON or it is rejected.
schemaRef, when present, is enforced as a hard gate.
Schemas are referenced, not embedded.
AI JSON review is advisory; parse/schema is authoritative.
```

# AI Notes

Do not emit "JSON-ish" text as a JSON Artifact. If it does not parse, validation rejects it and the downstream node gets nothing.

Do not embed the schema inside the Artifact. Reference it so the schema can evolve without rewriting every Artifact.

Do not let an AI "fix the shape" verdict override a schema failure. Schema is deterministic and wins.

# Related Documents

- [[05-artifacts/README]]
- [[JSONArtifacts-Part02]]
- [[ArtifactArchitecture-Part04]]
- [[Verification-Part03]]
- [[ArtifactLifecycle-Part02]]
