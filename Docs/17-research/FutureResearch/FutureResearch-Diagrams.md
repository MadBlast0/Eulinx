---
title: FutureResearch Diagrams
status: draft
version: 1.0
tags: [research, diagrams]
related: ["[[FutureResearch-Part01]]"]
---

# FutureResearch Diagrams

```mermaid
flowchart LR
  subgraph P1["Strategic Unknowns (Part 01)"]
    FR1["FR1 Agent Capability Gaps"]
    FR2["FR2 Simulation Mode Eval"]
    FR3["FR3 Replay-Based Eval"]
    FR4["FR4 KB Retrieval Quality"]
    FR5["FR5 Cross-Device Sync Security"]
    FR6["FR6 Marketplace Dynamics"]
  end
  subgraph P2["Eval / Security / Ecosystem (Part 02)"]
    FR7["FR7 Refinement Equivalence Bounds"]
    FR8["FR8 Coordination Overhead Threshold"]
    FR9["FR9 Verifier Trust Calibration"]
    FR10["FR10 Permission Surface Minimization"]
    FR11["FR11 Local Model Suitability"]
    FR12["FR12 Ecosystem Standard Tracking"]
  end
  P1 -->|"answer + promote"| SPEC["v1+ Specs / Roadmap"]
  P2 -->|"answer + promote"| SPEC
  P1 -->|"retire w/ rationale"| RET["Retired (pointer kept)"]
  P2 -->|"retire w/ rationale"| RET
  FR1 -->|"ties to"| AI["10-ai-system MCP nodes"]
  FR2 -->|"ties to"| IDEA["Idea I004"]
  FR4 -->|"ties to"| MEM["04-memory VectorMemory"]
  FR6 -->|"ties to"| MKT["MarketResearch-Part03"]
```

```text
FUTURE-RESEARCH DIRECTION MAP
=============================
 Part 01 - Strategic Unknowns & Capability Gaps
   FR1  Agent Capability Gaps (web/image/video/publish/research via MCP)
   FR2  Simulation Mode Evaluation (dry-run trust)
   FR3  Replay-Based Evaluation (regression/eval corpus)
   FR4  Knowledge Base Retrieval Quality (workspace vs global)
   FR5  Cross-Device Sync Security (E2E, local-first)
   FR6  Marketplace Dynamics (governance / safety)

 Part 02 - Evaluation, Security, Ecosystem
   FR7  Refinement Equivalence Bounds (cheap vs flagship)
   FR8  Coordination Overhead Threshold (worker-count ceiling)
   FR9  Verifier Trust Calibration (LLM-judge confidence)
   FR10 Permission Surface Minimization (smallest vocabulary)
   FR11 Local Model Suitability (Ollama/LM Studio in loop)
   FR12 Ecosystem Standard Tracking (beyond MCP)

 CLOSURE
   direction --(a) answered + promoted--> Spec / Roadmap
   direction --(b) retired + rationale --> Retired (keeps pointer to decision)

 LINKS OUT
   FR1  -> 10-ai-system (MCP capability nodes)
   FR2  -> Idea I004 (Simulation Mode)
   FR3  -> Experiments E1/E5 data reuse
   FR4  -> 04-memory VectorMemory
   FR5  -> Plus/Pro tiers (MarketResearch-Part03)
   FR6  -> GTM wedge (Marketplace)
   FR7  -> Papers-Part02 / Experiment E1
   FR8  -> Scheduler caps / auto-spawn ceiling
   FR9  -> Papers-Part02 (objective vs semantic)
   FR10 -> 02-runtime PermissionManager
   FR11 -> CompetitorAnalysis-Part03 / BYOK
   FR12 -> MCP layer future-proofing (REF-015)
```

# Related Documents
- [[FutureResearch-Part01]]
- [[13-roadmap/README]]
- [[10-ai-system/README]]
