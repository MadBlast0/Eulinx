---
title: Versioning Diagrams
status: draft
version: 1.0
tags:
  - database
  - diagrams
related:
  - "[[Versioning-Part01]]"
---

# Versioning Diagrams

```mermaid
flowchart TD
  A["Open connection to workspace.db"] --> B["PRAGMA user_version"]
  B --> C{"Readable?"}
  C -->|"No"| X["REFUSE: version_check_failed"]
  C -->|"Yes"| D["SELECT from workspace_meta"]
  D --> E{"Exactly one row?"}
  E -->|"No"| X2["REFUSE: missing or corrupt workspace_meta"]
  E -->|"Yes"| F{"eulinx_magic valid?"}
  F -->|"No"| X3["REFUSE: not_a_eulinx_workspace"]
  F -->|"Yes"| G{"mirror == user_version?"}
  G -->|"No"| X4["REFUSE: version_mirror_mismatch"]
  G -->|"Yes"| H{"highest_app_version_seen > running?"}
  H -->|"Yes"| X5["REFUSE: newer_app_version_seen. FAIL CLOSED."]
  H -->|"No"| I{"user_version > build schema?"}
  I -->|"Yes"| X6["REFUSE: newer_schema_version"]
  I -->|"No"| J{"format > build format?"}
  J -->|"Yes"| X7["REFUSE: newer_workspace_format"]
  J -->|"No"| K{"user_version < build min?"}
  K -->|"Yes"| X8["REFUSE: schema_version_too_old"]
  K -->|"No"| L["Cross-check schema_migrations ledger"]
  L --> M{"Ledger agrees and complete?"}
  M -->|"No"| X9["REFUSE: ledger disagreement or incomplete"]
  M -->|"Yes"| N{"user_version == build schema AND format matches?"}
  N -->|"Yes"| O["OPEN. Write last_opened. Raise high-water mark."]
  N -->|"No"| P["MIGRATE. Name pending migrations. Require backup."]
  P -.->|"backup + migrate done"| B
```

```mermaid
flowchart LR
  SV["schema_version (PRAGMA user_version)"] -->|"MIGRATE"| M1["needs shape change?"]
  AV["app_version (highest_app_version_seen)"] -->|"REFUSE"| R1["newer build wrote here?"]
  WF["workspace_format_version"] -->|"MIGRATE"| M2["needs folder move?"]
```

# ASCII Overview

```text
Three numbers, three questions, never compared to each other:

schema_version           -> "do I need to change the shape?"    -> MIGRATE
app_version              -> "did something I cannot understand already write here?" -> REFUSE
workspace_format_version -> "do I need to move folders?"         -> MIGRATE

Verdicts: OPEN | MIGRATE | REFUSE  (fail closed on any doubt)
```
