---
title: Encryption Diagrams
status: draft
version: 1.0
tags:
  - database
  - diagrams
related:
  - "[[Encryption-Part01]]"
---

# Encryption Diagrams

```mermaid
flowchart TD
  subgraph TIER1["OS Keychain (never in SQLite)"]
    MK["Master Key"]
  end
  subgraph TIER2["Per-Workspace"]
    DK["Data Key (wrapped by MK, stored wrapped)"]
  end
  subgraph TIER3["SQLite columns"]
    SEC["secret columns: envelope (version, nonce, ciphertext, key_id)"]
  end
  MK -->|"unwrap (volatile)"| DK
  DK -->|"encrypt plaintext"| SEC
  MK -.->|"never persisted"| SEC
```

```mermaid
flowchart TD
  W["Write: plaintext-in-memory"] --> UW["Unwrap data key with master (volatile)"]
  UW --> ENC["Encrypt -> envelope"]
  ENC --> ST["Store envelope in column"]
  ST --> Z["Zero plaintext + data key from memory"]

  R["Read: need secret"] --> D["Decrypt envelope with data key"]
  D --> U["Use plaintext in volatile memory"]
  U --> Z2["Zero plaintext immediately"]
```

# ASCII Overview

```text
Master Key (OS keychain)
   | wraps
   v
Workspace Data Key (wrapped, stored only wrapped)
   | encrypts
   v
Secret columns = envelope(version, nonce, ciphertext, key_id)

Plaintext: exists only in volatile memory, zeroed after use.
Backups: no master key, no plaintext secret. Exports: strip credentials.
```
