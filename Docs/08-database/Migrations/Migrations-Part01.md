---
title: Migrations Specification - Part 01
status: draft
version: 1.0
tags:
  - database
  - migrations
  - schema-versioning
related:
  - "[[08-database/README]]"
  - "[[SQLiteSchema-Part01]]"
  - "[[Versioning-Part01]]"
  - "[[BackupRestore-Part01]]"
---

# Migrations Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, the Ledger, and the Up/Down Contract
Part 02 - Idempotency, Ordering, the Apply Algorithm, and the Backup Gate
Part 03 - Authoring a Migration, Rollback Semantics, and Failure Branches
Part 04 - Testing, the Irreversible Flag, Checklist, and Worked Examples

# Purpose

Migrations is the only subsystem permitted to change the SQL shape of the Eulinx database: the tables, columns, indexes, triggers, and CHECK constraints described in [[SQLiteSchema-Part01]].

It is the counterpart to [[Versioning-Part01]]. Versioning decides whether this build may open a Workspace and names the pending migrations. Migrations performs them, one at a time, in order, reversibly. Versioning never mutates; Migrations always mutates, and only under a verified backup from [[BackupRestore-Part01]].

# Core Philosophy

A migration is a recorded, reversible transformation, not a script you run once and forget. Three principles govern everything here.

**Reversibility.** Every up step has a down step that returns the shape to exactly what it was. "Exactly" means the same tables, columns, indexes, and triggers, with the same names. Data may be transformed and back-transformed, but the schema after down MUST equal the schema before up, modulo the version number. If a change cannot be reversed (a destructive column drop with no recovery path), it is flagged `irreversible` and the UI changes its wording, but it still runs only under a verified backup.

**Idempotency.** Running a migration twice MUST have the same effect as running it once. The ledger is the guard: a migration whose id is already marked completed is a no-op. Idempotency also means a crash mid-migration leaves the database in a state the next run can either complete or roll back, never a silent half-schema.

**Gated by backup.** No migration runs without a verified backup whose `schemaVersion` equals the pre-migration version. This is not advisory. [[BackupRestore-Part01]] and [[Versioning-Part01]] both depend on it; if the gate is bypassed, a failed migration has no safe return.

# The Ledger

Migrations owns exactly one table for its own bookkeeping, `schema_migrations`. Fields: `id` TEXT (the migration id, e.g. `0007_add_run_context`), `from_version` INTEGER, `to_version` INTEGER, `applied_at` RFC3339, `direction` (`up` | `down`), `status` (`started` | `completed` | `failed`), `checksum` TEXT (a hash of the migration definition, so a changed definition is detectable), `app_version` TEXT (the build that applied it). The ledger is the second witness the Versioning gate cross-checks against `PRAGMA user_version`; a disagreement is a refusal.

# The Up/Down Contract

A migration is a named, version-bounded pair:

- `id` — stable string, never reused.
- `from_version` / `to_version` — the single-step version transition it performs (e.g. 6 to 7).
- `up` — the set of DDL/DML statements that move the shape forward.
- `down` — the set that moves it back, in reverse order.
- `irreversible` — boolean; true only when down cannot fully restore data (never when it cannot restore shape).
- `checksum` — derived from the definition; if it changes, the migration is treated as new and the ledger flags a mismatch.

A migration MUST bump `schema_version` by exactly 1. Adding three tables and a column in one migration is fine; jumping version 6 to 9 in one migration is forbidden because it leaves no recoverable intermediate.

# Responsibilities

Migrations MUST:

- apply migrations only in increasing `from_version` order, named by id from the Versioning verdict
- write a `schema_migrations` row with `status = started` before the first DDL and `completed` after the last, in the same transaction as the version bump
- run every migration inside a single transaction where SQLite permits, or use a documented stepwise commit with restart-safe checkpoints
- refuse to apply a migration whose id is already `completed` for that version pair
- refuse to apply without a verified backup from [[BackupRestore-Part01]]
- set `PRAGMA user_version` to `to_version` only after all up steps succeed
- provide a `down` for every `up`, even when flagged `irreversible`
- re-run the [[Versioning-Part01]] gate after completion

Migrations MUST NOT:

- change `schema_version` by more than 1 per migration
- run raw DDL supplied at runtime by any caller, Worker, or plugin
- leave `PRAGMA user_version` and the ledger in disagreement
- skip the backup gate because "the change is small"
- apply a migration whose `checksum` disagrees with the ledger's recorded checksum

# Invariants

```text
schema_version increases by exactly 1 per applied migration.
The ledger has exactly one completed row per applied (from, to) pair.
PRAGMA user_version equals the max to_version in the completed ledger rows.
Every completed up has a corresponding down definition.
No migration runs without a verified backup for the pre-migration version.
After apply, the Versioning gate runs again and agrees.
A checksum mismatch is a refusal, never a silent reapply.
```

# AI Notes

Do not write a migration that jumps two versions at once because "it is simpler". A multi-version jump means there is no recoverable intermediate if it crashes at step three, and the ledger cannot represent it. One version, one migration.

Do not set `PRAGMA user_version` before the DDL commits. If the transaction rolls back, the pragma does not, and you now have a database that claims version 7 with a version-6 shape. Set it last, inside the transaction.

Do not let a plugin or Worker supply migration SQL. Migrations are compiled into the Rust build, reviewed, and checksummed. Runtime DDL is how a malicious or buggy extension reshapes your database into something unrecoverable.

Do not treat the backup gate as optional for "safe" migrations like adding an index. Adding an index on a multi-GB table can fail and leave a half-built index; the verified backup is what makes "it failed, restore" a one-line recovery.

# Related Documents

- [[08-database/README]]
- [[Migrations-Part02]]
- [[Migrations-Diagrams]]
- [[SQLiteSchema-Part01]]
- [[SQLiteSchema-Part06]]
- [[Versioning-Part01]]
- [[BackupRestore-Part01]]
- [[HistoryTables-Part01]]
