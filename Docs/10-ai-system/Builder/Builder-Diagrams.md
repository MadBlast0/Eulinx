---
title: Builder Diagrams
status: draft
version: 1.0
tags:
  - ai-system
  - builder
  - diagrams
related:
  - "[[Builder-Part01]]"
---

# Builder Diagrams

## Builder Flow

```mermaid
flowchart TD
  CTX["Context Package"] --> B["Builder"]
  FB["Critic Feedback"] --> B
  P["Prompt Template"] --> B
  B --> ART["Artifact"]
  ART --> AM["ArtifactManager"]
  AM --> MM["MergeManager (runtime)"]
```

```text
Context + Feedback + Prompt -> Builder -> Artifact -> ArtifactManager -> MergeManager
```

## No Direct Mutation

```text
Builder  --produces-->  Artifact  --stored-->  ArtifactManager
                                         |
                                         v
                                    MergeManager (locks, conflicts)
                                         |
                                         v
                                    Workspace
```

# Related Documents

- [[Builder-Part01]]
- [[RefinementLoop-Part03]]
