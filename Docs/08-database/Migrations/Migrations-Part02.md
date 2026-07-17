---
title: Migrations Specification - Part 02
status: draft
version: 1.0
tags:
  - database
  - migrations
  - idempotency
related:
  - "[[08-database/README]]"
  - "[[Migrations-Part01]]"
  - "[[BackupRestore-Part01]]"
  - "[[Versioning-Part01]]"
---

# Migrations Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Ledger, and the Up/Down Contract
Part 02 - Idempotency, Ordering, the Apply Algorithm, and the Backup Gate
Part 03 - Authoring a Migration, Rollback Semantics, and Failure Branches
Part 04 - Testing, the Irreversible Flag, Checklist, and Worked Examples

# Idempotency in Detail

Idempotency is what makes a crashed migration survivable. Concretely, every up step MUST be re-runnable without error. Patterns that achieve this:

- Creating a table: guard with a check of `sqlite_master` and create only if absent; on re-run the create is skipped.
- Adding a column: add only if the column is not already present in `pragma_table_info`.
- Inserting seed rows: insert only if a matching row does not exist (upsert or existence check).
- Transforming data: key the transformation on a stable id and make it overwrite-idempotent.

The ledger is the coarse guard (a completed id is a no-op), but idempotency at the statement level is what lets a migration resume after a crash that happened between the DDL and the ledger write.

# Ordering

The Versioning verdict (see [[Versioning-Part01]]) returns a list of pending migration ids in exact order. Migrations applies them in that order and no other. Skipping, parallelizing, or reordering is forbidden because a later migration's `from_version` equals an earlier one's `to_version`; applying out of order produces a shape the later migration cannot assume.

When the running build has dropped migration code for versions below `EULINX_MIN_SCHEMA_VERSION`, the gate refuses before ordering is computed. Migrations therefore never receives an order it cannot execute; the refusal is upstream.

# The Apply Algorithm

The numbered algorithm every migration run follows:

1. Receive the ordered `pendingSchemaMigrations` list and the `backupRequired` flag from the Versioning verdict.
2. Verify a verified backup exists for the current `schema_version`. If not, return `backup_missing` and touch nothing.
3. For each migration id in order:
   a. Read the migration definition; compute its checksum; compare to the ledger. Mismatch returns `checksum_mismatch`.
   b. If a completed ledger row exists for this `(from, to)`, skip (idempotent no-op).
   c. Begin a transaction. Write `schema_migrations` row `status = started`.
   d. Execute every `up` step, each idempotent.
   e. Set `PRAGMA user_version = to_version` inside the transaction.
   f. Set ledger row `status = completed`, `applied_at`, `app_version`. Commit.
   g. On any error, roll back the transaction, set ledger row `status = failed`, and stop. The database is at `from_version` with no partial shape.
4. After the loop, re-run the [[Versioning-Part01]] gate. If it does not return OPEN, return `post_migration_gate_failed` and let the caller restore from the verified backup.

# The Backup Gate

Step 2 is the structural enforcement of the rule from [[BackupRestore-Part01]] and [[Versioning-Part01]]: a migration MUST NOT run without a verified backup. The gate checks three things, all required:

- a `BackupManifest` exists whose `status` is `verified`
- its `schemaVersion` equals the current `schema_version` (the pre-migration version)
- its `workspaceId` equals the Workspace being migrated

If any fails, the migration aborts before the first DDL. The migration never "optimistically" proceeds and backs up afterward; the backup precedes the mutation by definition.

# Invariants

```text
Migrations apply in the exact order Versioning named.
Each migration bumps schema_version by exactly 1.
Every up step is re-runnable without error.
The backup gate passes before the first DDL of the first migration.
PRAGMA user_version is set inside the same transaction as the ledger completion.
A failed migration leaves the database at from_version, never a half-shape.
The Versioning gate runs again after the last migration and agrees.
```

# AI Notes

Do not execute the backup inside the migration transaction. The backup is a precondition checked before step 3a; it is read-only against a separate copy. Mixing it into the migration transaction would lock the very database you are trying to copy.

Do not parallelize migrations "for speed". They are sequential by construction; `from_version` chaining makes parallelism either a no-op or a corruption. A migration of a local app database is measured in milliseconds to seconds; speed is not the constraint, correctness is.

Do not skip the post-apply gate re-run. It is the only check that catches a migration that claimed `to_version = 7` but left `user_version = 6`. The ledger and the pragma must agree, and the gate is what enforces the agreement.

# Related Documents

- [[08-database/README]]
- [[Migrations-Part01]]
- [[Migrations-Part03]]
- [[Migrations-Diagrams]]
- [[Versioning-Part01]]
- [[BackupRestore-Part01]]
- [[SQLiteSchema-Part01]]
