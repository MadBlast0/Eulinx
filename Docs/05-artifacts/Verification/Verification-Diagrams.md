---
title: Verification Diagrams
status: draft
version: 1.0
tags:
  - artifacts
  - verification
  - diagrams
related:
  - "[[Verification-Part01]]"
  - "[[Verification-Part04]]"
---

# Verification Diagrams

## Verify Before Merge

```mermaid
flowchart TD
  B["Builder emits Artifact"] --> V["Verification"]
  V --> DET["deterministic verifier (authoritative)"]
  V --> AI["ai verifier (advisory)"]
  DET -->|"pass"| OK["verificationState = passed"]
  DET -->|"fail/timeout/error"| NO["verificationState = failed -> rejected"]
  AI -->|"score vs threshold"| ADV["advisory finding only"]
  OK --> M["MergeManager (eligible)"]
  ADV -.->|"cannot flip fail"| NO
```

## Precedence Rule

```text
deterministic pass  +  ai pass     -> verified (merge eligible)
deterministic pass  +  ai fail     -> verified (ai is advisory)
deterministic fail  +  ai pass     -> REJECTED (ai cannot override)
deterministic fail  +  ai fail     -> REJECTED
```

## Authorship Exclusion

```mermaid
flowchart TD
  A["Artifact produced by Worker W"] --> CHECK{"verifier Worker == W?"}
  CHECK -->|"node scope"| B["block: authorship_violation"]
  CHECK -->|"tree scope (rootWorkerId)"| C["block: authorship_violation"]
  CHECK -->|"different Worker"| D["run verification"]
```

## AI Notes

Do not draw AI verification as equal-weight with deterministic. Show deterministic as the floor and AI as a suggestion above it.

# Related Documents

- [[Verification-Part01]]
- [[Verification-Part02]]
- [[Verification-Part03]]
- [[Verification-Part04]]
- [[06-workflow-engine/VerifierNodes/VerifierNodes-Part01]]
