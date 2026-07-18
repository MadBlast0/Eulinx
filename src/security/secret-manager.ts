/**
 * P14-SEC-SECRET — Secret Manager
 *
 * Secure storage and retrieval of secrets.
 * From PermissionManager-Part04: secret management.
 */

import type { SecretEntry } from "./security-types"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Secret Manager
// ---------------------------------------------------------------------------

export class SecretManager {
  private readonly logger: Logger
  private readonly secrets = new Map<string, SecretEntry>()

  constructor() {
    this.logger = createLogger("SecretManager")
  }

  /** Store a secret */
  set(secret: Omit<SecretEntry, "id" | "createdAt">): SecretEntry {
    const id = `secret-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    const entry: SecretEntry = {
      ...secret,
      id,
      createdAt: new Date().toISOString(),
    }

    this.secrets.set(id, entry)
    this.logger.info(`Secret stored: ${secret.name}`)
    return entry
  }

  /** Get a secret by ID */
  get(id: string): SecretEntry | undefined {
    const secret = this.secrets.get(id)
    if (secret) {
      // Update last accessed
      this.secrets.set(id, {
        ...secret,
        lastAccessedAt: new Date().toISOString(),
      })
    }
    return secret
  }

  /** Get a secret by name */
  getByName(name: string, workspaceId?: string): SecretEntry | undefined {
    return Array.from(this.secrets.values()).find(
      (s) => s.name === name && (!workspaceId || s.workspaceId === workspaceId),
    )
  }

  /** Delete a secret */
  delete(id: string): boolean {
    const result = this.secrets.delete(id)
    if (result) {
      this.logger.info(`Secret deleted: ${id}`)
    }
    return result
  }

  /** List secrets (names only, not values) */
  list(workspaceId?: string): readonly { id: string; name: string; createdAt: string }[] {
    return Array.from(this.secrets.values())
      .filter((s) => !workspaceId || s.workspaceId === workspaceId)
      .map((s) => ({ id: s.id, name: s.name, createdAt: s.createdAt }))
  }

  /** Check if a secret exists */
  has(id: string): boolean {
    return this.secrets.has(id)
  }

  /** Get secret count */
  get size(): number {
    return this.secrets.size
  }
}
