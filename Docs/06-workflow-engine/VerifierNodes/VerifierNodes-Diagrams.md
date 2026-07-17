---
title: VerifierNodes Diagrams
status: draft
version: 1.0
tags:
  - workflow-engine
  - verifier-nodes
  - diagrams
related:
  - "[[06-workflow-engine/README]]"
  - "[[VerifierNodes-Part01]]"
  - "[[VerifierNodes-Part05]]
---

# VerifierNodes Diagrams

## Deterministic vs AI Verifier

```mermaid
flowchart TD
  ART["artifactRef"] --> DV["deterministic verifier (typecheck/build/test)"]
  ART --> AV["ai verifier (critic / judge)"]
  DV --> GATE["authoritative gate: passed?"]
  AV --> ADV["advisory score + reasons"]
  GATE --> OUT["controls downstream (merge or skip)"]
  ADV --> HUMAN["informs human / review"]
```

## The Authorship Rule

```text
Builder (produces artifact)
   |
   v
Verifier (checks artifact)  -- allowed, distinct instances

Verifier (produces artifact)
   |
   v
Verifier (checks same artifact)  -- FORBIDDEN (self-verification)
```

## Gate Routing

```mermaid
flowchart TD
  V["verdict.passed"] --> Q{"true?"}
  Q -->|"yes"| PROCEED["downstream apply becomes ready"]
  Q -->|"no"| BLOCK["downstream apply skipped / routed to fix"]
```

## Related Documents

- [[06-workflow-engine/README]]
- [[VerifierNodes-Part01]]
- [[VerifierNodes-Part03]]
- [[VerifierNodes-Part05]]
- [[BuilderNodes-Part01]]
- [[MergeManager-Part01]]
