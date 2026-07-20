/**
 * P13-TOOL-BROWSER — Browser Built-in Tool
 *
 * Fetches a URL's textual content via a simple GET, delegating transport to the
 * HTTP tool's `fetch`. Requires the `net.out` capability. This is a minimal
 * browsing capability (retrieve + return content), not a full headless engine.
 */

import type { CoreTool } from "../tool-types"
import { enforcePermission, DEFAULT_TOOL_CONTEXT } from "./permission-gate"
import { httpRequest } from "./http"
import type { HttpToolOptions } from "./http"
import { requireString } from "./types"
import type { BuiltInTool, ToolContext } from "./types"

// ---------------------------------------------------------------------------
// Definition
// ---------------------------------------------------------------------------

export const BROWSER_FETCH: CoreTool = {
  id: "browser.fetch",
  name: "Fetch Page",
  description: "Fetch the content of a web page via HTTP GET and return its body as text.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "The URL of the page to fetch" },
    },
    required: ["url"],
    additionalProperties: false,
  },
  sideEffect: { kind: "read_only", idempotent: true, network: true },
  category: "browser",
}

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

export interface BrowserFetchResult {
  readonly url: string
  readonly status: number
  readonly contentType: string
  readonly content: string
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function fetchPage(
  url: string,
  options: HttpToolOptions = {},
): Promise<BrowserFetchResult> {
  const result = await httpRequest({ url, method: "GET" }, options)
  return {
    url,
    status: result.status,
    contentType: result.headers["content-type"] ?? "",
    content: result.body,
  }
}

export function createBrowserFetchTool(
  context: ToolContext = DEFAULT_TOOL_CONTEXT,
  options: HttpToolOptions = {},
): BuiltInTool {
  return {
    tool: BROWSER_FETCH,
    permission: { action: "network", resourceType: "network", riskLevel: "medium" },
    async invoke(args): Promise<BrowserFetchResult> {
      enforcePermission(BROWSER_FETCH.id, { action: "network", resourceType: "network", riskLevel: "medium" }, context)
      const url = requireString(args, "url")
      return fetchPage(url, options)
    },
  }
}
