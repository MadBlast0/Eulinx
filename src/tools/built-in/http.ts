/**
 * P13-TOOL-HTTP — HTTP Built-in Tool
 *
 * Outbound HTTP request via the platform `fetch`. Requires the `net.out`
 * capability, enforced through the permission manager (network resource).
 */

import type { CoreTool } from "../tool-types"
import { enforcePermission, DEFAULT_TOOL_CONTEXT } from "./permission-gate"
import { requireString, optionalString, optionalRecord } from "./types"
import type { BuiltInTool, ToolContext } from "./types"

// ---------------------------------------------------------------------------
// Definition
// ---------------------------------------------------------------------------

export const HTTP_REQUEST: CoreTool = {
  id: "http.request",
  name: "HTTP Request",
  description: "Make an outbound HTTP request. Supports GET, POST, PUT, DELETE, PATCH methods.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "The URL to request" },
      method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"], description: "HTTP method" },
      headers: { type: "object", description: "Request headers" },
      body: { type: "string", description: "Request body (for POST/PUT/PATCH)" },
    },
    required: ["url"],
    additionalProperties: false,
  },
  sideEffect: { kind: "mutating", idempotent: false, network: true },
  category: "http",
}

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

export interface HttpRequestResult {
  readonly status: number
  readonly ok: boolean
  readonly headers: Readonly<Record<string, string>>
  readonly body: string
}

// ---------------------------------------------------------------------------
// Options (injectable for tests)
// ---------------------------------------------------------------------------

export interface HttpToolOptions {
  readonly fetchImpl?: typeof fetch
}

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH"])

function coerceHeaders(record: Record<string, unknown> | undefined): Record<string, string> {
  const headers: Record<string, string> = {}
  if (!record) return headers
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") headers[key] = value
  }
  return headers
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function httpRequest(
  args: Record<string, unknown>,
  options: HttpToolOptions = {},
): Promise<HttpRequestResult> {
  const fetchImpl = options.fetchImpl ?? fetch
  const url = requireString(args, "url")
  const method = (optionalString(args, "method") ?? "GET").toUpperCase()
  if (!ALLOWED_METHODS.has(method)) {
    throw new TypeError(`Unsupported HTTP method "${method}"`)
  }
  const headers = coerceHeaders(optionalRecord(args, "headers"))
  const body = optionalString(args, "body")

  const init: RequestInit = { method, headers }
  if (body !== undefined && method !== "GET") {
    init.body = body
  }

  const response = await fetchImpl(url, init)
  const responseHeaders: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value
  })
  const text = await response.text()

  return {
    status: response.status,
    ok: response.ok,
    headers: responseHeaders,
    body: text,
  }
}

export function createHttpRequestTool(
  context: ToolContext = DEFAULT_TOOL_CONTEXT,
  options: HttpToolOptions = {},
): BuiltInTool {
  return {
    tool: HTTP_REQUEST,
    permission: { action: "network", resourceType: "network", riskLevel: "medium" },
    async invoke(args): Promise<HttpRequestResult> {
      enforcePermission(HTTP_REQUEST.id, { action: "network", resourceType: "network", riskLevel: "medium" }, context)
      return httpRequest(args, options)
    },
  }
}
