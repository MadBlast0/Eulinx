---
title: Experiments Diagrams
status: draft
version: 1.0
tags: [research, diagrams]
related: ["[[Experiments-Part01]]"]
---

# Experiments Diagrams

```mermaid
flowchart TD
  H["Hypothesis"] --> M["Method / Setup"]
  M --> R["Run (metrics captured)"]
  R --> D{"Decision Rule"}
  D -->|"passes threshold"| A["Adopt into Spec / Roadmap"]
  D -->|"fails threshold"| B["Change default / demote feature"]
  D -->|"contradicts spec"| C["Trigger Spec Review"]
  A --> S["status: done"]
  B --> S
  C --> S
  S --> L["Log: hypothesis, method, metrics, rule, status, result"]

  subgraph P1["Validation (Part 01)"]
    E1["E1 Refinement Gain"]
    E2["E2 Context Isolation Cost"]
    E3["E3 Merge Conflict Rate"]
  end
  subgraph P2["Scalability & UX (Part 02)"]
    E4["E4 Terminal Density"]
    E5["E5 Observability Trust"]
    E6["E6 Budget Behavior"]
  end
  H -.feeds.-> P1
  H -.feeds.-> P2
```

```text
EXPERIMENT LIFECYCLE
====================
  Hypothesis
     |
     v
  Method / Setup  (benchmark, N workers, A/B arms)
     |
     v
  Run  ->  capture metrics (cost, tokens, time, conflict %, correction speed)
     |
     v
  Decision Rule  -- threshold check -->
     |-- pass  -->  Adopt into Spec / Roadmap
     |-- fail  -->  Change default / demote feature
     |-- contradicts spec -->  Trigger Spec Review (never silent abandon)
     |
     v
  Log (status: planned|running|done|superseded) + result link

EXPERIMENT CATALOG
==================
 Part 01 (Validation)
   E1  Refinement Gain on Cheap Models   -> default max mode (High vs Ultra)
   E2  Context Isolation Cost            -> simplify memory bus if <15% saved
   E3  Parallel Worker Merge Conflicts   -> tighten Lock Manager if rate high
 Part 02 (Scalability & UX)
   E4  Terminal Density Limit            -> default max visible + auto-collapse
   E5  Observability Trust (animation)   -> demote to opt-in if no gain
   E6  Budget Behavior                   -> Ultra explicit confirmation?
```

# Related Documents
- [[Experiments-Part01]]
- [[13-roadmap/README]]
- [[10-ai-system/README]]
