---
title: Ideas Diagrams
status: draft
version: 1.0
tags: [research, diagrams]
related: ["[[Ideas-Part01]]"]
---

# Ideas Diagrams

```mermaid
flowchart TD
  RAW["Raw Idea Backlog (Ideas)"]
  RAW --> PR{"Promotion Rule?"}
  PR -->|"owner + evidence + roadmap home"| PROM["Promoted"]
  PR -->|"no"| STAY["Stays in Ideas"]
  PROM --> ROAD["13-roadmap/README"]
  PROM --> FUT["FutureResearch (research question)"]
  PROM --> SPEC["v1 Spec (e.g. 10-ai-system, 02-runtime)"]

  subgraph P1["Product & UX (Part 01)"]
    I001["I001 KB Per Workspace"]
    I002["I002 Replay & Time Travel"]
    I003["I003 Snapshots"]
    I004["I004 Simulation Mode"]
    I005["I005 Approval Gates"]
    I006["I006 Metrics Dashboard"]
    I007["I007 Template Gallery"]
    I008["I008 Critic vs Generator Models"]
  end
  subgraph P2["Architecture & Research (Part 02)"]
    I009["I009 Worker Beyond Terminals"]
    I010["I010 Runtime Plan Rewrite"]
    I011["I011 Progress Pyramid"]
    I012["I012 Symbol-Level Locking"]
    I013["I013 Event Bus Backbone"]
    I014["I014 Model Profiles"]
    I015["I015 Prompt Library"]
    I016["I016 Marketplace"]
  end
  P1 --> RAW
  P2 --> RAW
  I001 -->|"promotes to"| FUT
  I002 --> FUT
  I004 --> FUT
  I009 -->|"preserve in"| SPEC
  I014 --> SPEC
  I016 -->|"supports"| MKT["MarketResearch-Part03 GTM"]
```

```text
IDEA-CATALOG TAXONOMY
=====================
 Source: Raw backlog (hunches, user suggestions, opportunities)
 Promotion Rule: (a) clear owner topic  (b) evidence/rationale  (c) roadmap home

 Part 01 - Product & UX
   I001  Knowledge Base Per Workspace      -> FutureResearch (KB retrieval)
   I002  Replay & Time Travel              -> FutureResearch (replay eval)
   I003  Snapshots of Workspace State      -> memory notes (partial)
   I004  Simulation Mode                   -> FutureResearch FR2
   I005  Human Approval Gates (nodes)      -> 02-runtime PermissionManager
   I006  Metrics Dashboard                 -> worker metrics extension
   I007  Template Gallery (growth)         -> CompetitorAnalysis-Part01
   I008  Different Critic vs Generator     -> PRD open question

 Part 02 - Architecture & Research
   I009  Worker Beyond Terminals           -> 03-worker-system principle
   I010  Orchestrators Rewrite Plan        -> workflow engine research
   I011  Progress Aggregation Pyramid      -> Scheduler/metrics
   I012  Symbol-Level Locking              -> 02-runtime Lock Manager
   I013  Event Bus As Plugin Backbone      -> EventBus spec
   I014  Model Profiles (intent->model)    -> 10-ai-system
   I015  Prompt Library & Inheritance      -> AI system spec (when scoped)
   I016  Marketplace (workflows/agents/...) -> MarketResearch-Part03 GTM

 FLOW
   Ideas --> (promote) --> Roadmap | FutureResearch | Spec
   Ideas --> (stay)    --> backlog (single indexed entry)
```

# Related Documents
- [[Ideas-Part01]]
- [[13-roadmap/README]]
- [[10-ai-system/README]]
