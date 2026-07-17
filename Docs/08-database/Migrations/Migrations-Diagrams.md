---
title: Migrations Diagrams
status: draft
version: 1.0
tags:
  - database
  - diagrams
related:
  - "[[Migrations-Part01]]"
---

# Migrations Diagrams

```mermaid
flowchart TD
  V["Versioning verdict: MIGRATE"] --> B["Backup gate: verified backup?"]
  B -->|"No"| E1["backup_missing. Abort."]
  B -->|"Yes"| L["For each pending id in order"]
  L --> C["Checksum matches ledger?"]
  C -->|"No"| E2["checksum_mismatch. Abort."]
  C -->|"Yes"| S["BEGIN. ledger started"]
  S --> U["Apply up steps (idempotent)"]
  U --> P["PRAGMA user_version = to_version"]
  P --> D["ledger completed. COMMIT"]
  D --> N{"More pending?"}
  N -->|"Yes"| L
  N -->|"No"| G["Re-run Versioning gate"]
  G -->|"OPEN"| OK["Migration complete"]
  G -->|"Not OPEN"| E3["post_migration_gate_failed. Restore backup."]
  U -.->|"error"| R["ROLLBACK. database at from_version. ledger failed."]
```

```mermaid
flowchart TD
  subgraph UP["up: version 6 -> 7"]
    A1["create run_context"] --> A2["set user_version = 7"]
  end
  subgraph DOWN["down: version 7 -> 6"]
    B1["set user_version = 6"] --> B2["drop run_context"]
  end
  UP -->|"reversible"| DOWN
```

# ASCII Overview

```text
Versioning names pending ids (in order)
        |
        v
Backup gate  (verified backup for pre-version, or abort)
        |
        v
For each id:
   checksum check --> ledger started --> up steps --> user_version -->
   ledger completed --> commit
        |
        v
Re-run Versioning gate  -->  OPEN  (or restore backup)
```
