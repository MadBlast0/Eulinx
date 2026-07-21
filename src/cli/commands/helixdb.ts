/**
 * P19-CLI-HELIXDB — helixdb command
 *
 * Export and import workspace data for backup, migration, or offline analysis.
 * T19.1 — helixdb export <workspaceId> [outputPath]
 * T19.2 — helixdb import <workspaceId> <inputPath>
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, fail } from "../cli-output"
import { HelixDBClient } from "@/integrations/helixdb/helixdb-client"
import type { HelixDBQueryEnvelope } from "@/integrations/helixdb/helixdb-types"
import {
  LABEL_MEMORY,
  LABEL_KNOWLEDGE,
  LABEL_EVENT,
  LABEL_SESSION,
  LABEL_WORKFLOW_RUN,
  LABEL_NODE_STATE,
  LABEL_WORKER_STATE,
  LABEL_RUN_CONTEXT,
  LABEL_ARTIFACT,
  LABEL_PROMPT,
  LABEL_SNAPSHOT,
  LABEL_PROVIDER_STATE,
  EDGE_HAS_EVENT,
  EDGE_CAUSED_BY,
  EDGE_CORRELATED_WITH,
  EDGE_HAS_MEMORY,
  EDGE_HAS_WORKER,
  EDGE_HAS_NODE,
  EDGE_HAS_ARTIFACT,
  EDGE_HAS_SNAPSHOT,
  EDGE_RELATES_TO,
  EDGE_REFERENCES,
  EDGE_DERIVED_FROM,
  EDGE_BRANCHED_FROM,
  EDGE_DEPENDS_ON,
  type HelixDBNodeLabel,
  type HelixDBEdgeLabel,
} from "@/integrations/helixdb/helixdb-types"
import * as fs from "node:fs"
import * as path from "node:path"

// ---------------------------------------------------------------------------
// Export/Import data types
// ---------------------------------------------------------------------------

interface ExportedNode {
  readonly label: string
  readonly properties: Record<string, unknown>
}

interface ExportedEdge {
  readonly label: string
  readonly from: string
  readonly to: string
  readonly properties: Record<string, unknown>
}

interface ExportedWorkspace {
  readonly version: number
  readonly exportedAt: string
  readonly workspaceId: string
  readonly nodeCount: number
  readonly edgeCount: number
  readonly nodes: readonly ExportedNode[]
  readonly edges: readonly ExportedEdge[]
}

// ---------------------------------------------------------------------------
// Node label → query mapping
// ---------------------------------------------------------------------------

const ALL_NODE_LABELS: readonly HelixDBNodeLabel[] = [
  LABEL_MEMORY,
  LABEL_KNOWLEDGE,
  LABEL_EVENT,
  LABEL_SESSION,
  LABEL_WORKFLOW_RUN,
  LABEL_NODE_STATE,
  LABEL_WORKER_STATE,
  LABEL_RUN_CONTEXT,
  LABEL_ARTIFACT,
  LABEL_PROMPT,
  LABEL_SNAPSHOT,
  LABEL_PROVIDER_STATE,
]

// ---------------------------------------------------------------------------
// Edge label → source label mapping (for querying edges)
// ---------------------------------------------------------------------------

const EDGE_SOURCE_LABELS: ReadonlyArray<readonly [HelixDBEdgeLabel, HelixDBNodeLabel]> = [
  [EDGE_HAS_EVENT, LABEL_SESSION],
  [EDGE_CAUSED_BY, LABEL_EVENT],
  [EDGE_CORRELATED_WITH, LABEL_EVENT],
  [EDGE_HAS_MEMORY, LABEL_SESSION],
  [EDGE_HAS_WORKER, LABEL_SESSION],
  [EDGE_HAS_NODE, LABEL_WORKFLOW_RUN],
  [EDGE_HAS_ARTIFACT, LABEL_WORKFLOW_RUN],
  [EDGE_HAS_SNAPSHOT, LABEL_SESSION],
  [EDGE_RELATES_TO, LABEL_MEMORY],
  [EDGE_REFERENCES, LABEL_MEMORY],
  [EDGE_DERIVED_FROM, LABEL_MEMORY],
  [EDGE_BRANCHED_FROM, LABEL_SESSION],
  [EDGE_DEPENDS_ON, LABEL_WORKFLOW_RUN],
]

// ---------------------------------------------------------------------------
// Batch size for import operations
// ---------------------------------------------------------------------------

const IMPORT_BATCH_SIZE = 50

// ---------------------------------------------------------------------------
// Create client helper
// ---------------------------------------------------------------------------

function createClient(): HelixDBClient {
  return new HelixDBClient({
    enabled: true,
    host: process.env["EULINX_HELIXDB_HOST"] ?? "127.0.0.1",
    port: Number(process.env["EULINX_HELIXDB_PORT"] ?? "9743"),
    timeout: 60_000,
    retryAttempts: 3,
  })
}

// ---------------------------------------------------------------------------
// T19.1 — Export
// ---------------------------------------------------------------------------

/**
 * Export all nodes and edges for a workspace from HelixDB to a JSON file.
 *
 * Queries every node label filtered by workspaceId, then queries every
 * edge type by traversing from source nodes. Writes the combined result
 * as a versioned JSON file.
 */
export async function exportWorkspace(
  client: HelixDBClient,
  workspaceId: string,
  outputPath: string,
): Promise<void> {
  // --- Phase 1: Query all nodes across all labels ---
  const nodeQueries: HelixDBQueryEnvelope[] = ALL_NODE_LABELS.map((label) => ({
    query: `nWithLabelWhere("${label}", eq("workspaceId", "${workspaceId}")).valueMap()`,
  }))

  const nodeBatch = await client.batch(nodeQueries)
  if (!nodeBatch.ok) {
    throw new Error(`Failed to query nodes: ${nodeBatch.error.message}`)
  }

  const nodes: ExportedNode[] = []
  for (let i = 0; i < ALL_NODE_LABELS.length; i++) {
    const label = ALL_NODE_LABELS[i]!
    const response = nodeBatch.value.results[i]
    if (!response || response.error) continue

    for (const row of response.results) {
      const props = row as Record<string, unknown>
      nodes.push({ label, properties: props })
    }
  }

  // --- Phase 2: Query all edges across all edge labels ---
  const edgeQueries: HelixDBQueryEnvelope[] = EDGE_SOURCE_LABELS.map(([edgeLabel, sourceLabel]) => ({
    query: `nWithLabelWhere("${sourceLabel}", eq("workspaceId", "${workspaceId}")).outE("${edgeLabel}").project(["$from", "$to"])`,
  }))

  const edgeBatch = await client.batch(edgeQueries)
  if (!edgeBatch.ok) {
    throw new Error(`Failed to query edges: ${edgeBatch.error.message}`)
  }

  const edges: ExportedEdge[] = []
  for (let i = 0; i < EDGE_SOURCE_LABELS.length; i++) {
    const [edgeLabel] = EDGE_SOURCE_LABELS[i]!
    const response = edgeBatch.value.results[i]
    if (!response || response.error) continue

    for (const row of response.results) {
      const props = row as Record<string, unknown>
      const from = props["$from"] as string | undefined
      const to = props["$to"] as string | undefined
      if (!from || !to) continue

      // Strip internal $-prefixed keys from exported properties
      const edgeProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(props)) {
        if (!key.startsWith("$")) {
          edgeProps[key] = value
        }
      }

      edges.push({ label: edgeLabel, from, to, properties: edgeProps })
    }
  }

  // --- Phase 3: Write JSON ---
  const exportData: ExportedWorkspace = {
    version: 1,
    exportedAt: new Date().toISOString(),
    workspaceId,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges,
  }

  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), "utf-8")
}

// ---------------------------------------------------------------------------
// T19.2 — Import
// ---------------------------------------------------------------------------

/**
 * Import nodes and edges from a JSON file into HelixDB for a workspace.
 *
 * Reads the export JSON, creates all nodes (re-keyed to the target workspaceId
 * if different), then creates all edges. Reports counts on completion.
 */
export async function importWorkspace(
  client: HelixDBClient,
  workspaceId: string,
  inputPath: string,
): Promise<{ nodeCount: number; edgeCount: number }> {
  // --- Phase 1: Read and validate JSON ---
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`)
  }

  const raw = fs.readFileSync(inputPath, "utf-8")
  const data = JSON.parse(raw) as ExportedWorkspace

  if (data.version !== 1) {
    throw new Error(`Unsupported export version: ${data.version}. Expected version 1.`)
  }

  const sourceWorkspaceId = data.workspaceId
  const remapWorkspace = sourceWorkspaceId !== workspaceId

  // --- Phase 2: Create all nodes ---
  let createdNodes = 0

  // Chunk nodes into batches for efficient import
  for (let i = 0; i < data.nodes.length; i += IMPORT_BATCH_SIZE) {
    const chunk = data.nodes.slice(i, i + IMPORT_BATCH_SIZE)
    const queries: HelixDBQueryEnvelope[] = chunk.map((node) => {
      const props: Record<string, unknown> = { ...node.properties }
      if (remapWorkspace) {
        props["workspaceId"] = workspaceId
      }
      return {
        query: `addN("${node.label}", $props)`,
        params: { props },
      }
    })

    const batchResult = await client.batch(queries)
    if (!batchResult.ok) {
      throw new Error(`Failed to import nodes (batch ${Math.floor(i / IMPORT_BATCH_SIZE) + 1}): ${batchResult.error.message}`)
    }

    createdNodes += chunk.length
  }

  // --- Phase 3: Create all edges ---
  let createdEdges = 0

  // Build a set of all node IDs we just created, to filter edges
  const nodeIds = new Set(data.nodes.map((n) => n.properties["id"] as string))

  for (let i = 0; i < data.edges.length; i += IMPORT_BATCH_SIZE) {
    const chunk = data.edges.slice(i, i + IMPORT_BATCH_SIZE)
    const queries: HelixDBQueryEnvelope[] = []

    for (const edge of chunk) {
      // Skip edges whose source or target node wasn't in the export
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue

      const props: Record<string, unknown> = { ...edge.properties }
      queries.push({
        query: `nWithLabelWhere("*", eq("id", "${edge.from}")).addE("${edge.label}", nWithLabelWhere("*", eq("id", "${edge.to}")), $props)`,
        params: { props },
      })
    }

    if (queries.length === 0) continue

    const batchResult = await client.batch(queries)
    if (!batchResult.ok) {
      throw new Error(`Failed to import edges (batch ${Math.floor(i / IMPORT_BATCH_SIZE) + 1}): ${batchResult.error.message}`)
    }

    createdEdges += queries.length
  }

  return { nodeCount: createdNodes, edgeCount: createdEdges }
}

// ---------------------------------------------------------------------------
// CLI Command Definition
// ---------------------------------------------------------------------------

async function handler(
  args: { positional: string[]; flags: Record<string, string | boolean | number> },
  _config: CliConfig,
): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "export": {
      const workspaceId = args.positional[1] as string | undefined
      if (!workspaceId) {
        return fail("missing_workspace", "Workspace ID required", "eulinx helixdb export <workspaceId> [outputPath]")
      }

      const defaultPath = path.join(process.cwd(), `helixdb-export-${workspaceId}-${Date.now()}.json`)
      const outputPath = (args.positional[2] as string | undefined) ?? defaultPath

      const client = createClient()
      try {
        const connectResult = await client.connect()
        if (!connectResult.ok) {
          return fail("connection_failed", `Cannot connect to HelixDB: ${connectResult.error.message}`, "Ensure HelixDB server is running on the configured host:port")
        }

        await exportWorkspace(client, workspaceId, outputPath)
        return success("Workspace exported", { workspaceId, outputPath })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return fail("export_failed", `Export failed: ${message}`)
      } finally {
        await client.close()
      }
    }

    case "import": {
      const workspaceId = args.positional[1] as string | undefined
      if (!workspaceId) {
        return fail("missing_workspace", "Workspace ID required", "eulinx helixdb import <workspaceId> <inputPath>")
      }

      const inputPath = args.positional[2] as string | undefined
      if (!inputPath) {
        return fail("missing_input", "Input file path required", "eulinx helixdb import <workspaceId> <inputPath>")
      }

      const client = createClient()
      try {
        const connectResult = await client.connect()
        if (!connectResult.ok) {
          return fail("connection_failed", `Cannot connect to HelixDB: ${connectResult.error.message}`, "Ensure HelixDB server is running on the configured host:port")
        }

        const result = await importWorkspace(client, workspaceId, inputPath)
        return success("Workspace imported", {
          workspaceId,
          inputPath,
          nodesCreated: result.nodeCount,
          edgesCreated: result.edgeCount,
        })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return fail("import_failed", `Import failed: ${message}`)
      } finally {
        await client.close()
      }
    }

    default:
      return fail(
        "unknown_subcommand",
        `Unknown helixdb subcommand: ${subcommand ?? "(none)"}`,
        "Use: export, import",
      )
  }
}

export const helixdbCommand: CliCommand = {
  name: "helixdb",
  description: "Export/import workspace data for backup and migration",
  options: [],
  handler,
}
