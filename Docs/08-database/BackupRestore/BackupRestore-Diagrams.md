---
title: BackupRestore Diagrams
status: draft
version: 1.0
tags:
  - database
  - diagrams
related:
  - "[[BackupRestore-Part01]]"
---

# BackupRestore Diagrams

```mermaid
flowchart TD
  T1["Trigger: pre_migration"] --> G["Backup Coordinator"]
  T2["Trigger: pre_merge"] --> G
  T3["Trigger: scheduled"] --> G
  T4["Trigger: manual"] --> G
  G --> A["Allocate backup dir. status = pending"]
  A --> B{"Disk space sufficient?"}
  B -->|"No"| E1["insufficient_disk_space"]
  B -->|"Yes"| C["Choose method by trigger"]
  C --> D["Copy DB via Online Backup API or VACUUM INTO. status = copying"]
  D --> F["Copy artifact store"]
  F --> H["Copy workspace config, secrets stripped"]
  H --> I["status = verifying"]
  I --> J["PRAGMA integrity_check"]
  J --> K["PRAGMA foreign_key_check"]
  K --> L{"Both ok?"}
  L -->|"No"| M["status = quarantined"]
  L -->|"Yes"| N["Compute sha256 per file"]
  N --> O["Write manifest atomically"]
  O --> P["status = verified"]
  P -.->|"event"| Q["backup.completed"]
  M -.->|"event"| R["backup.verification_failed"]
  E1 -.->|"event"| R
  P --> S["Migration gate opens"]
```

```mermaid
flowchart TD
  REQ["RestoreRequest (confirmed)"] --> SB["Take safety backup (verified)"]
  SB --> CK{"Runtime quiesced?"}
  CK -->|"No"| E1["runtime_not_quiesced"]
  CK -->|"Yes"| VR{"Backup verified?"}
  VR -->|"No"| E2["backup_not_verified"]
  VR -->|"Yes"| CP["Copy DB + artifacts into live dir"]
  CP --> PV["Post-restore PRAGMA checks"]
  PV -->|"fail"| RB["Rollback to safety backup"]
  PV -->|"ok"| OK["Restore complete. Emit restored event."]
```

# ASCII Overview

```text
Backup (disaster artifact):
  trigger -> allocate -> copy (Online Backup API / VACUUM INTO, never fs copy)
         -> verify (integrity_check + foreign_key_check) -> manifest (atomic)
         -> status = verified  (ONLY this is restorable)

Restore (destructive, explicit):
  confirmed request -> safety backup -> quiesce -> copy -> post-verify
         -> on any failure, rollback to safety backup
```
