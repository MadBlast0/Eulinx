---
title: Verifier Diagrams
status: draft
version: 1.0
tags:
  - ai-system
  - verifier
  - diagrams
related:
  - "[[Verifier-Part01]]"
---

# Verifier Diagrams

## Verification Flow

```mermaid
flowchart TD
  A["Artifact"] --> OBJ["Objective checks (build/lint/test)"]
  OBJ --> RPT["Verification Report"]
  RPT --> SEM["Semantic check (suggested)"]
  SEM --> OUT["Report + labels"]
```

```text
Artifact -> objective checks -> report -> (optional semantic, suggested)
```

## Hard Gate

```text
required check fails -> Builder must fix -> loop continues
required check passes -> Judge may accept
```

# Related Documents

- [[Verifier-Part01]]
- [[RefinementLoop-Part03]]
- [[Judge-Part02]]
