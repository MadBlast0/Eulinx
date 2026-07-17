---
title: Migrations Specification - Part 03
status: draft
version: 1.0
tags:
  - database
  - migrations
  - rollback
related:
  - "[[08-database/README]]"
  - "[[Migrations-Part01]]"
  - "[[BackupRestore-Part01]]"
---

# Migrations Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Ledger, and the Up/Down Contract
Part 02 - Idempotency, Ordering, the Apply Algorithm, and the Backup Gate
Part 03 - Authoring a Migration, Rollback Semantics, and Failure Branches
Part 04 - Testing, the Irreversible Flag, Checklist, and Worked Examples

# Authoring a Migration

A migration is defined at compile time in the Rust build, not at runtime. Authoring rules:

- The migration id is `zero_padded_version` + `_` + `snake_description`, e.g. `0008_add_encryption_tag`.
- The definition includes `from_version`, `to_version`, the `up` steps, the `down` steps, and the `irreversible` flag.
- Every DDL statement is preceded by the idempotency guard described in Part 02 (existence check).
- If the migration transforms data, the `down` step must back-transform it; if back-transformation loses information, the migration is flagged `irreversible` but `down` still restores shape.
- The migration's `checksum` is derived from its full definition. Editing any field changes the checksum, which the apply algorithm detects as `checksum_mismatch`.
- A new migration is accompanied by a unit test executing up then down and asserting the schema equals the baseline (see Part 04).

# Rollback Semantics

Rollback means applying `down` for the most recently applied migrations, in reverse order, to return to a target version. Two situations trigger it:

- **Explicit user downgrade** within supported range: rare, but supported for `down`-able migrations.
- **Failed forward apply**: when step 3g of Part 02 stops, the already-completed earlier migrations in that run are NOT automatically rolled back unless the failure left the database at a non-recoverable shape. Because each migration commits atomically, a crash after migration N completed but before N+1 means the database is at version N+1 with a `failed` ledger row for N+1; the recovery path is to restore the verified backup, not to invent a down for a half-run.

The clean rollback path is: restore the verified backup taken before the migration run. That backup is the authoritative undo. `down` steps exist for deliberate reversions and for tests, not as the primary disaster recovery. [[BackupRestore-Part01]] owns disaster recovery.

# Failure Branches

Every failure branch is named and recoverable:

- `backup_missing` — no verified backup for the pre-migration version. Recover by taking one.
- `checksum_mismatch` — the migration definition changed since it was recorded. Recover by reconciling the definition or restoring.
- `apply_failed` — a DDL or DML step errored. The transaction rolled back; database is at `from_version`. Recover by inspecting the error and the failed ledger row.
- `ledger_write_failed` — the `schema_migrations` write failed (disk full, locked). The transaction rolled back; nothing was applied.
- `post_migration_gate_failed` — after applying, Versioning disagrees. Recover by restoring the verified backup.
- `restore_required` — the only safe resolution after a torn migration; points the caller at [[BackupRestore-Part01]].

No failure branch leaves the database in a state where the next open silently proceeds with a wrong shape. The Versioning gate, run on every open, catches any residue.

# Invariants

```text
A migration definition is compile-time, never runtime-supplied.
Editing a migration definition changes its checksum and is detected.
down restores schema shape exactly, even when flagged irreversible.
A failed forward run does not auto-invent a down for a half-applied step.
The primary undo for a failed migration is the verified backup, not down.
Every failure branch is named and points at a recovery path.
The ledger records started/completed/failed so residue is diagnosable.
```

# AI Notes

Do not author migrations at runtime or accept them from a plugin. They are compiled, reviewed, and checksummed. Runtime DDL bypasses every safety in this document.

Do not write a `down` that "mostly" restores shape. The test in Part 04 asserts exact equality with the baseline; a `down` that leaves a stray index fails the test and would fail the Versioning re-gate in production.

Do not rely on `down` as your disaster recovery. If a migration run fails at step 5 of 9, the database is at `from_version` and the verified backup is the clean undo. `down` is for deliberate reversions and tests.

Do not mark a migration `irreversible` just because writing `down` is tedious. `irreversible` means data loss on revert is unavoidable (e.g. a column drop with no copy). Shape must always be restorable; only data may be lost, and that is what the flag and the UI wording communicate.

# Related Documents

- [[08-database/README]]
- [[Migrations-Part02]]
- [[Migrations-Part04]]
- [[Migrations-Diagrams]]
- [[BackupRestore-Part01]]
- [[Versioning-Part01]]
- [[SQLiteSchema-Part01]]
- [[SQLiteSchema-Part06]]
