---
title: Backlog Diagrams
status: draft
version: 1.0
tags: [roadmap, diagrams]
related: ["[[Backlog-Part01]]"]
---

# Backlog Diagrams

```mermaid
flowchart TD
  INTAKE["Backlog (unordered intake pile)"] --> TRIAGE{"Triage at each phase boundary"}

  TRIAGE -->|promote| PH["Concrete phase (with acceptance criteria)"]
  TRIAGE -->|merge| FI["FutureIdeas (if large / deferred concept)"]
  TRIAGE -->|discard| DROP["Drop"]

  subgraph A["Part 01 Items (A-M)"]
    B1["Accessibility pass (SR, contrast, zoom)"]
    B2["Browser node (hosted Premium)"]
    B3["Command palette + shortcuts"]
    B4["Concurrency tuning per plan"]
    B5["Cost analytics enhancements"]
    B6["Theme polish + runtime switch"]
    B7["Lock Manager edge-case hardening"]
    B8["Workspace export/import bundles"]
    B9["File explorer + terminal cwd"]
    B10["Git panel depth (diff/history/commit)"]
    B11["HITL UX patterns library"]
    B12["Internationalization / RTL"]
  end

  subgraph C["Part 02 Items (N-Z)"]
    B13["Notifications + toasts center"]
    B14["Onboarding flow (first-run)"]
    B15["Orchestrator rewrite-plan viz"]
    B16["Performance hardening (virtualize/memo)"]
    B17["Permission UX (per-worker editor)"]
    B18["Prompt library UI"]
    B19["Refinement modes depth (critic vs gen)"]
    B20["Release notes / changelog gen"]
    B21["Sandbox visualization"]
    B22["Templates gallery + publish"]
    B23["Verifier judge labeling (suggested)"]
    B24["Worker metrics dashboard"]
  end

  INTAKE --- A
  INTAKE --- C
```

```text
BACKLOG — unordered candidate work (refinements, speculative features, small improvements)
          The intake pile. NOT prioritized. Awaits triage.

TRIAGE RULES (at each phase boundary):
  - promote to a phase  -> only when deps shipped + concrete owner/acceptance exist
  - merge into FutureIdeas -> if the item is large (one paragraph max here) or duplicates a FutureIdea
  - discard
  - backlog MAY stay messy; that is its purpose. It is NOT a commitment.

PART 01 (A-M):
  Accessibility pass | Browser node (Premium) | Command palette + shortcuts
  Concurrency tuning per plan | Cost analytics enhancements | Theme polish + runtime switch
  Lock Manager edge-case hardening (symbol locks, deadlock detect)
  Workspace export/import bundles | File explorer + terminal cwd
  Git panel depth (diff/history/commit/push) | HITL UX patterns library
  Internationalization / RTL

PART 02 (N-Z):
  Notifications + toasts center | Onboarding flow | Orchestrator rewrite-plan viz
  Performance hardening (virtualized lists, memo, lazy routes)
  Permission UX (per-worker editor) | Prompt library UI
  Refinement modes depth (cheap generator + strong critic)
  Release notes / changelog gen | Sandbox visualization
  Templates gallery + publish-your-own | Verifier judge labeling ("suggested" not "correct")
  Worker metrics dashboard (tokens/cost/time/success rate)
```

# Related Documents

- [[Backlog-Part01]]
- [[06-workflow-engine/README]]
- [[12-development/README]]
- [[04-memory/README]]
