---
title: AIArchitecture Diagrams
status: draft
version: 1.0
tags:
  - ai-system
  - diagrams
related:
  - "[[AIArchitecture-Part01]]"
---

# AIArchitecture Diagrams

## Overall AI Subsystem

```mermaid
flowchart TD
  U["User Goal"] --> RO["Root Orchestrator"]
  RO --> PL["Planning"]
  PL --> RL["Refinement Loop"]
  RL --> B["Builder"]
  RL --> V["Verifier"]
  RL --> C["Critic"]
  RL --> J["Judge"]
  RO --> CTX["ContextManager"]
  RO --> MEM["MemoryManager"]
  RO --> PROV["Provider / ModelProfiles"]
  RO --> COST["CostOptimization"]
  J -->|accept| M["Merge Manager (runtime)"]
```

```text
User Goal
  -> Root Orchestrator
     -> Planning
     -> Refinement Loop (Builder/Verifier/Critic/Judge)
     -> Context, Memory, Provider, Cost
  -> Merge Manager (runtime)
```

## Role Flow

```mermaid
flowchart LR
  B["Builder"] --> V["Verifier"]
  V --> C["Critic"]
  C --> J["Judge"]
  J -->|reject| B
  J -->|accept| OUT["Artifact accepted"]
```

## AI Notes

Keep the reasoning layer above the runtime. The runtime owns execution, locks, and merges.

# Related Documents

- [[AIArchitecture-Part01]]
- [[RefinementLoop-Part01]]
