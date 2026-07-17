---
title: Encryption Specification - Part 03
status: draft
version: 1.0
tags:
  - database
  - encryption
  - rotation
related:
  - "[[08-database/README]]"
  - "[[Encryption-Part01]]"
  - "[[Encryption-Part02]]"
  - "[[BackupRestore-Part01]]"
---

# Encryption Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Key Hierarchy, and the Envelope Scheme
Part 02 - The Field-Level Rules, the OS Keychain Integration, and the Write/Read Path
Part 03 - Rotation, the Backup Exclusion Rule, Checklist, and Worked Examples

# Rotation

Rotation is why envelope encryption was chosen. Two rotation scopes:

**Data key rotation (per Workspace).** When a Workspace's data key is suspected compromised or on a scheduled interval, a new data key is generated. Existing secrets are re-encrypted under the new key by: decrypting each with the old key (volatile), encrypting with the new key, storing the new envelope with the new `key_id`. The master key is unchanged; only the wrapped data key in `workspace_meta` is re-wrapped. This is bounded work, not a full-database rewrite.

**Master key rotation (rare).** When the OS keychain master key changes (OS reinstall, explicit user action), every Workspace data key must be re-wrapped under the new master key. Because data keys are small and few, this is cheap. Field ciphertext is unaffected; only the wrappers change.

The `version` and `key_id` in each envelope let old and new ciphertext coexist during rotation; reads use the `key_id` to pick the correct data key.

# The Backup Exclusion Rule

This is the rule that ties Encryption to [[BackupRestore-Part01]]:

```text
No backup, snapshot, or export contains a plaintext secret, a wrapped data
key that can be unwrapped without the user's keychain, or a master key.
```

Concretely:

- Backups MUST exclude the master key (it is in the OS keychain, never in the database directory). See [[BackupRestore-Part01]]'s exclusion list.
- Backups MAY contain the wrapped Workspace data keys, because they are useless without the master key from the user's keychain on the same machine/account. Whether to include them is a policy choice; excluding them means a restore requires re-entering secrets, which is the safer default for sync/export.
- Backups MUST contain only envelope ciphertext for secret columns, never plaintext.
- An export intended for another machine MUST strip all wrapped keys and secret envelopes, requiring re-entry on import. This is what makes "graphs export as JSON" (see the product PRD) safe: the exported graph has no credentials.

# Implementation Checklist

- [ ] Master key in OS keychain; generated on first run; absent-key is fatal.
- [ ] Per-Workspace data key, wrapped by master key, stored only in wrapped form.
- [ ] Each encrypted field carries version, nonce, ciphertext, key_id.
- [ ] Field-level encryption is by schema metadata, not value inspection.
- [ ] Plaintext zeroed after encrypt and after decrypt-use.
- [ ] Keychain unavailability fails closed.
- [ ] Data key rotation re-encrypts secrets; master rotation re-wraps data keys.
- [ ] Backups exclude master key and plaintext secrets; exports strip credentials.

# Worked Examples

**Example 1 — store a provider key.** User enters an OpenAI key in Settings. The value arrives plaintext-in-memory at the repository. The backend unwraps the Workspace data key, encrypts the key into an envelope, stores it in `settings.value` for the sensitive key, zeroes the plaintext. SQLite holds only the envelope.

**Example 2 — use the key.** The AI call needs the key. The backend decrypts the envelope with the Workspace data key, passes the plaintext to the provider client in volatile memory, zeroes it after the call. The key is never returned to the frontend.

**Example 3 — rotate data key.** Suspicion of compromise. A new data key is generated; each secret is decrypted with the old key and re-encrypted with the new, `key_id` updated. The master key is untouched. Old envelopes are overwritten; no plaintext ever hits disk.

**Example 4 — export graph safely.** The user exports a workflow as JSON to share. The export strips all `settings` value envelopes and any wrapped keys; the recipient imports the graph and re-enters their own credentials. No secret leaves the machine.

# Invariants

```text
Rotation re-wraps or re-encrypts; it never leaves plaintext at rest.
Backups never contain a master key or plaintext secret.
Exports strip credentials; import requires re-entry.
Old and new ciphertext coexist during rotation via version/key_id.
The master key is only in the OS keychain, on the user's machine/account.
```

# AI Notes

Do not let a backup include the master key "so restore is seamless". The master key is in the OS keychain for a reason: it is the root of all secrecy. A backup with the master key is a credential dump that syncs to the user's cloud drive. Exclude it; require re-entry on a different machine.

Do not make export "convenient" by bundling credentials. Graphs are shared and portable; credentials are not. Strip them and let the importer re-enter. This is what makes the JSON-export feature safe rather than a leak vector.

Do not rotate the master key by re-encrypting every secret. Rotate the wrappers; field ciphertext is unaffected because it is keyed by the data key, not the master. Re-encrypting everything is the mistake envelope encryption was designed to avoid.

Do not leave the old envelope around after rotation "just in case". Overwrite it. A lingering old envelope with a compromised key is a foothold; rotation's purpose is to invalidate it.

# Related Documents

- [[08-database/README]]
- [[Encryption-Part02]]
- [[Encryption-Diagrams]]
- [[SQLiteSchema-Part05]]
- [[RepositoryLayer-Part03]]
- [[BackupRestore-Part01]]
- [[Versioning-Part01]]
- [[SearchIndex-Part01]]
