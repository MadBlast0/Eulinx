---
title: Encryption Specification - Part 01
status: draft
version: 1.0
tags:
  - database
  - encryption
  - secrets
related:
  - "[[08-database/README]]"
  - "[[SQLiteSchema-Part01]]"
  - "[[RepositoryLayer-Part03]]"
  - "[[BackupRestore-Part01]]"
---

# Encryption Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, the Key Hierarchy, and the Envelope Scheme
Part 02 - The Field-Level Rules, the OS Keychain Integration, and the Write/Read Path
Part 03 - Rotation, the Backup Exclusion Rule, Checklist, and Worked Examples

# Purpose

Encryption owns the at-rest protection of secrets and credentials in Eulinx. Its mandate is unconditional: no API key, token, password, or credential ever persists in plaintext in SQLite, in a backup, or in a log. The plaintext of a secret exists only in volatile memory during an active operation and is zeroed afterward.

This topic defines the key hierarchy, the envelope encryption scheme, which columns are encrypted, how the OS keychain participates, and how the RepositoryLayer (see [[RepositoryLayer-Part03]]) and BackupRestore (see [[BackupRestore-Part01]]) must cooperate with it. It does NOT own the schema (that is [[SQLiteSchema-Part01]]); it owns the rule that sensitive columns hold only ciphertext plus a version tag.

# Core Philosophy

Secrets are the most dangerous thing Eulinx stores. A leaked model key or git token is a financial and security catastrophe. Three principles:

**Plaintext never persists.** The moment a secret would be written to disk, it is encrypted. SQLite stores ciphertext and a version tag; the plaintext is never a database value.

**Envelope encryption.** Secrets are not encrypted directly with the keychain key. They are encrypted with a per-Workspace data key, and that data key is itself encrypted (wrapped) by a master key in the OS keychain. This limits keychain exposure and makes rotation cheap (re-wrap the data key, not every secret).

**Fail closed.** If the keychain is unavailable, if the data key cannot be unwrapped, or if a field arrives at the repository in plaintext when it should be ciphertext, the write is rejected. A rejected write is safer than a plaintext secret on disk.

# The Key Hierarchy

Three tiers, each with a clear owner:

- **Master key** — held in the OS secure store (Tauri/Cocoa Keychain, Windows Credential Manager, or libsecret on Linux) via the Rust backend. It never leaves the OS keychain except into volatile memory to unwrap data keys. It is created on first run if absent.
- **Workspace data key** — a random key generated per Workspace, used to encrypt that Workspace's secrets. It is stored only in wrapped (encrypted) form in `workspace_meta` (or an equivalent key table), wrapped by the master key. Rotating it means re-wrapping, not re-encrypting every secret.
- **Field ciphertext** — each encrypted column value is the output of the authenticated encryption of the plaintext under the Workspace data key, plus a version tag and a nonce.

# The Envelope Scheme

Each encrypted field stores a self-describing envelope, not raw ciphertext:

- `version` — the scheme version, so a future algorithm can be introduced without breaking old values.
- `nonce` — a unique per-encryption value (never reused for a given key).
- `ciphertext` — the authenticated encryption output (confidentiality + integrity).
- `key_id` — which Workspace data key (by id) encrypted it, so rotation is traceable.

The envelope is what lets the RepositoryLayer decrypt on read and what lets the pruner/backup logic recognize an encrypted field without decrypting it. The plaintext is never stored.

# Invariants

```text
No secret persists in plaintext in SQLite, backup, or log.
Secrets are envelope-encrypted under a per-Workspace data key.
The data key is wrapped by the OS-keychain master key; the master key never persists in SQLite.
Encryption fails closed: unavailable key or plaintext-in-ciphertext-field rejects the write.
Each encrypted field carries version, nonce, ciphertext, and key_id.
The plaintext exists only in volatile memory and is zeroed after use.
```

# AI Notes

Do not encrypt secrets directly with the keychain master key. That exposes the master key on every encrypt/decrypt and makes rotation mean re-encrypting everything. Use envelope encryption: data key per Workspace, master key wraps the data key.

Do not persist the plaintext "temporarily" because "the column is inside an encrypted container". The container is a backup convenience owned by [[BackupRestore-Part01]]; the field-level rule is independent and unconditional. Plaintext in SQLite is a violation regardless of the container.

Do not let the repository accept a plaintext value for a field documented as encrypted. Reject it at the boundary (see [[RepositoryLayer-Part03]]). A silent encrypt-on-write of an already-plaintext secret means the secret was on disk in plaintext at least once.

Do not log a decrypted secret for debugging. Logs are retained (see [[SQLiteSchema-Part05]]) and may be shared; a logged plaintext key is a leak. Log only the envelope metadata or a redacted marker.

# Related Documents

- [[08-database/README]]
- [[Encryption-Part02]]
- [[Encryption-Diagrams]]
- [[SQLiteSchema-Part01]]
- [[SQLiteSchema-Part05]]
- [[RepositoryLayer-Part03]]
- [[BackupRestore-Part01]]
- [[Versioning-Part01]]
