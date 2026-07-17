---
title: Encryption Specification - Part 02
status: draft
version: 1.0
tags:
  - database
  - encryption
  - keychain
related:
  - "[[08-database/README]]"
  - "[[Encryption-Part01]]"
  - "[[SQLiteSchema-Part05]]"
  - "[[RepositoryLayer-Part04]]"
---

# Encryption Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Key Hierarchy, and the Envelope Scheme
Part 02 - The Field-Level Rules, the OS Keychain Integration, and the Write/Read Path
Part 03 - Rotation, the Backup Exclusion Rule, Checklist, and Worked Examples

# The Field-Level Rules

Encryption owns which columns are encrypted and how. The rule set:

- **Encrypted by default for secrets.** Any column carrying a credential is encrypted: model provider API keys, OAuth tokens, git credentials, SSH keys, MCP server secrets, and any `settings.value` whose key is in the sensitive-set.
- **Node config secrets.** `node.config` JSON may contain sensitive fields (e.g. a tool's API key). Those fields are encrypted before the JSON is stored; the config is not encrypted as a whole, only the sensitive leaves.
- **Not encrypted.** Ordinary content — chat messages, artifacts, workflows, memory (unless it embeds a secret, in which case the PermissionManager redacts it before storage, see [[SQLiteSchema-Part05]]), prompts, logs — is NOT encrypted at the field level. Encrypting everything would crush performance and make search ([[SearchIndex-Part01]]) and semantic retrieval ([[VectorStore-Part01]]) impossible.
- **Detection without decryption.** The RepositoryLayer knows a field is encrypted by schema metadata, not by peeking at the value. This lets the pruner and backup logic handle encrypted fields correctly without decrypting them.

# The OS Keychain Integration

The master key lives in the OS secure store, accessed through the Rust backend (Tauri's secure-storage or the platform-native API):

- On first run, if no master key exists, one is generated and stored. Generation failure is fatal; Eulinx cannot store secrets without it.
- To encrypt a Workspace's secrets, the backend unwraps that Workspace's data key using the master key (in volatile memory only), then encrypts the field under the data key.
- The master key is never written to SQLite, never to a backup, and never to a log.
- If the keychain is unavailable (locked, permission denied), encryption operations fail closed; the write that needs encryption is rejected rather than attempted with a fallback.

# The Write/Read Path

**Write.** The RepositoryLayer receives a value for an encrypted field. The value MUST already be plaintext-in-memory (the caller held it transiently, e.g. from a user input or a provider response). The backend:
1. Unwraps the Workspace data key with the master key (volatile).
2. Encrypts the value into an envelope (version, nonce, ciphertext, key_id).
3. Stores the envelope in the column.
4. Zeroes the plaintext and the unwrapped data key from memory.

**Read.** When a legitimate operation needs the secret (e.g. an AI call needs the API key), the backend decrypts the envelope, uses the plaintext in volatile memory, and zeroes it immediately after. The decrypted value is never returned to the frontend except through an explicit, permissioned channel, and never persisted.

# Invariants

```text
Credential columns are encrypted; ordinary content is not.
Sensitive leaves of node.config are encrypted, not the whole JSON.
The master key lives only in the OS keychain; never in SQLite/backup/log.
Keychain unavailability fails closed, rejecting the needing write.
Plaintext is zeroed from memory after encrypt and after decrypt-use.
Encrypted fields are detected by schema metadata, not by value inspection.
```

# AI Notes

Do not encrypt every column "for safety". Encrypting chats and artifacts makes search and semantic retrieval impossible and destroys performance. Encrypt secrets; leave ordinary content clear so the derived indexes work.

Do not return a decrypted secret to the frontend as a routine response. The frontend should not hold keys; it holds the intent ("call this provider") and the backend uses the key transiently. Returning keys to TypeScript is a leak.

Do not inspect a value to decide if it is encrypted. Schema metadata says which fields are encrypted; relying on a magic prefix or format invites a plaintext value slipping through. Detection is by declaration, not by sniffing.

Do not cache the unwrapped data key in memory across operations "for speed". Unwrap per operation and zero it. A long-lived unwrapped key in memory is what a crash dump or a compromised process would exfiltrate.

# Related Documents

- [[08-database/README]]
- [[Encryption-Part01]]
- [[Encryption-Part03]]
- [[Encryption-Diagrams]]
- [[SQLiteSchema-Part05]]
- [[RepositoryLayer-Part03]]
- [[RepositoryLayer-Part04]]
- [[SearchIndex-Part01]]
- [[VectorStore-Part01]]
- [[PermissionManager-Part01]]
