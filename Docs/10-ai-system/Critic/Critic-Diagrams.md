---
title: Critic Diagrams
status: draft
version: 1.0
tags:
  - ai-system
  - critic
  - diagrams
related:
  - "[[Critic-Part01]]"
---

# Critic Diagrams

## Critic in the Loop

```mermaid
flowchart LR
  B["Builder"] --> V["Verifier"]
  V --> C["Critic"]
  C --> J["Judge"]
  C -->|feedback| B
```

```text
Builder -> Verifier -> Critic -> Judge
              |
              +-> feedback -> Builder
```

## Critic Output Shape

```text
feedback:
  issues:     [ {severity, location, detail} ]
  strengths:  [ ... ]
  suggestions:[ ... ]
  questions:  [ ... ]
```

# Related Documents

- [[Critic-Part01]]
- [[RefinementLoop-Part03]]
