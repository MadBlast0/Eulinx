---
title: Migrations Specification - Part 04
status: draft
version: 1.0
tags:
  - database
  - migrations
  - testing
related:
  - "[[08-database/README]]"
  - "[[Migrations-Part01]]"
  - "[[SQLiteSchema-Part01]]"
---

# Migrations Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, the Ledger, and the Up/Down Contract
Part 02 - Idempotency, Ordering, the Apply Algorithm, and the Backup Gate
Part 03 - Authoring a Migration, Rollback Semantics, and Failure Branches
Part 04 - Testing, the Irreversible Flag, Checklist, and Worked Examples

# Testing a Migration

Each migration ships with a test that proves the up/down contract. The test:

1. Starts from a baseline database at `from_version` with representative data.
2. Applies `up`; asserts `PRAGMA user_version = to_version` and that the ledger has a completed row.
3. Asserts the new shape exists (table/column/index/trigger) and data transformed correctly.
4. Applies `down`; asserts the shape exactly equals the baseline shape (same `sqlite_master` set, same indexes, same triggers).
5. Re-applies `up`; asserts idempotency (no error, same final shape).
6. Simulates a crash after the DDL but before ledger completion; asserts the database reverts to `from_version` on reopen and the next apply succeeds.

A migration without this test is not merged. The test is what catches the "down leaves a stray index" and "up is not re-runnable" failures before they reach a user's Workspace.

# The Irreversible Flag

`irreversible` is a boolean on the migration definition. It is true only when `down` cannot recover data (a destructive drop with no copy). It MUST NOT be true merely because `down` is annoying to write; shape is always restorable.

When the Versioning verdict (see [[Versioning-Part01]]) includes an `irreversible` migration in `pendingSchemaMigrations`, the user-facing upgrade dialog changes its wording to warn that the operation cannot be cleanly undone except by restoring a backup. The backup gate is still mandatory; the flag changes communication, not enforcement.

# Implementation Checklist

- [ ] Migration id follows `NNNN_description`, unique forever.
- [ ] `from_version` and `to_version` differ by exactly 1.
- [ ] Every `up` step has an idempotency guard.
- [ ] A `down` step exists for every `up` step, in reverse order.
- [ ] `irreversible` is false unless data loss on revert is unavoidable.
- [ ] `checksum` is derived from the full definition and recorded in the ledger.
- [ ] A test executes up, asserts, down, asserts equality, re-up, asserts idempotency, and simulates a crash.
- [ ] The migration is compiled in; no runtime DDL path exists.
- [ ] The Versioning gate is re-run after apply in the runner.

# Worked Examples

**Example 1 — additive, reversible.** Migration `0007_add_run_context` adds the `run_context` table and sets `user_version` 6 to 7. `up` creates the table if absent. `down` drops it. `irreversible = false`. Test confirms the table appears and disappears symmetrically.

**Example 2 — column drop, irreversible.** Migration `0011_drop_legacy_token` drops a plaintext token column after its values were moved to the encrypted store (see [[Encryption-Part01]]). `up` drops the column. `down` re-adds the column but cannot recover the already-moved values. `irreversible = true`. The backup gate and the warning dialog apply.

**Example 3 — crash mid-apply.** Migration `0009_add_indexes` is applying its third index when the process is killed. On reopen, the Versioning gate sees `user_version` still at the prior version with a `failed` ledger row; the next apply re-runs the idempotent `up` steps, skipping the completed indexes and creating the rest, then commits. No manual recovery needed because each step is re-runnable.

# Invariants

```text
Every migration has an up/down test proving shape equality after down.
irreversible is false unless data loss on revert is unavoidable.
The crash simulation test passes for every migration.
The backup gate applies regardless of the irreversible flag.
The ledger checksum detects any post-authoring definition change.
```

# AI Notes

Do not skip the crash-simulation test because "SQLite transactions are atomic". The danger is not the DDL inside a transaction; it is the window between the DDL commit and the ledger write, and the case where a step was committed before the crash. The test proves the resume path, which is the only thing standing between a user and a torn database.

Do not set `irreversible = true` to avoid writing a proper `down`. A missing `down` is a defect; the flag is a confession that data is genuinely unrecoverable, not a license to be lazy.

Do not reuse a migration id. Ids are forever; reusing one makes the ledger lie about what was applied. A mistaken migration gets a new id that reverses the old one.

# Related Documents

- [[08-database/README]]
- [[Migrations-Part03]]
- [[Migrations-Diagrams]]
- [[SQLiteSchema-Part01]]
- [[SQLiteSchema-Part06]]
- [[Versioning-Part01]]
- [[BackupRestore-Part01]]
- [[Encryption-Part01]]
