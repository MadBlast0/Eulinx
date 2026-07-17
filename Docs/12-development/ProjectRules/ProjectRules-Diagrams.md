---
title: ProjectRules Diagrams
status: draft
version: 1.0
tags: [development, diagrams]
related:
  - "[[ProjectRules-Part01]]"
---

# ProjectRules Diagrams

```mermaid
flowchart TD
  Vault["docs/ vault (source of truth)"] -.conflict.-> Root["Root files win"]
  Root --> Readme["README.md"]
  Root --> AI["CLAUDE.md (rule file)"]
  Root --> License["LICENSE (proprietary)"]
  Env[".env.example committed"] -.->|never| Repo["Secrets out of repo"]
  Worker["Workers/Agents"] --> Scope["Limited to workspace folder"]
  Worker --> HITL["Destructive actions need approval"]
```

```text
Governance summary
===================
license     : proprietary, no OSS, no redistribution
root truth  : README + CLAUDE.md + LICENSE (vault defers to these)
secrets     : OS secure store / CI only, never in repo
scope       : workers confined to selected workspace
HITL        : push/delete/publish require approval
contributors: humans AND AI model follow 12-development rules
```

# Related Documents

- [[ProjectRules-Part01]]
- [[AIInstructions-Part01]]
