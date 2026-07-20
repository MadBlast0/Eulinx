# HelixDB Integration — Complete Implementation Plan

> **Status:** Implemented  
> **Target:** Fully integrate HelixDB as the durable graph-vector backend for all memory, knowledge, event, state, and session systems.  
> **Estimated effort:** ~30–40 person-days across 8 phases.  
> **Prerequisite:** HelixDB server (v3.0.8+) running as a sidecar, container, or cloud instance.

## Implementation Summary (Completed)

All 9 phases have been fully implemented with 2106 tests passing across 148 test files.

### Files Created (~50+)
- `src/integrations/helixdb/helixdb-client.ts` — HTTP client wrapper (HelixDBClient, TenantScopedClient, HelixDBError)
- `src/integrations/helixdb/helixdb-types.ts` — 12 node labels, 13 edge labels, 72 PROP_* constants, TypeScript types
- `src/integrations/helixdb/helixdb-migration.ts` — 30 idempotent indexes (2 vector, 2 text, 21 equality, 5 range)
- `src/integrations/helixdb/helixdb-config.ts` — Config schema, defaults, validation
- `src/integrations/helixdb/index.ts` — Barrel export for all modules
- `src/integrations/helixdb/adapters/helixdb-embedding-adapter.ts` — OpenAI/Ollama/LM Studio/Gemini + FNV-1a fallback
- `src/integrations/helixdb/adapters/helixdb-memory-adapter.ts` — Full CRUD + hybrid search + policy enforcement
- `src/integrations/helixdb/adapters/helixdb-knowledge-adapter.ts` — 5 ingest formats + hybrid search
- `src/integrations/helixdb/adapters/helixdb-event-adapter.ts` — Event nodes + CAUSED_BY + HAS_EVENT edges
- `src/integrations/helixdb/adapters/helixdb-state-store.ts` — StateStore interface, 8 entity→label mappings
- `src/integrations/helixdb/adapters/helixdb-persistence-adapter.ts` — Atomic persistRunState
- `src/integrations/helixdb/adapters/helixdb-session-adapter.ts` — Session nodes + BRANCHED_FROM + history
- `src/integrations/helixdb/adapters/helixdb-workflow-graph.ts` — DEPENDS_ON edges + analysis queries
- `src/integrations/helixdb/adapters/helixdb-workflow-adapter.ts` — Workflow engine persistence
- `src/ui/workspace/panels/unified-search.tsx` — Cmd+K semantic search
- `src/ui/workspace/panels/workspace-dashboard.tsx` — Metric cards, sparklines, health
- `src/ui/workspace/panels/memory-graph.tsx` — React Flow force-directed graph
- `src/ui/workspace/panels/knowledge-graph.tsx` — Cluster layout with REFERENCES edges
- `src/ui/workspace/panels/causal-trace.tsx` — CAUSED_BY tree visualization
- `src/ui/workspace/panels/session-timeline.tsx` — Gantt chart with replay
- `src/ui/workspace/panels/vector-explorer.tsx` — Canvas scatter plot with PCA
- `src/ui/workspace/panels/query-playground.tsx` — HelixQL editor
- `src/cli/commands/helixdb.ts` — Export/import CLI commands
- 10+ test files with 347+ new tests

### Files Modified (~15)
- `package.json` — Added AGPL-3.0 license
- `src/core/config.ts` — Added helixdb config section + memory.backend option
- `src/memory/memory-manager.ts` — Accepts optional HelixDBMemoryAdapter
- `src/memory/knowledge-base.ts` — Accepts optional HelixDBKnowledgeAdapter
- `src/event-bus/event-history.ts` — HelixDB write/query delegation
- `src/event-bus/event-bus.ts` — Adapter injection
- `src/state/persistence.ts` — HelixDBStateStore factory
- `src/workflow/adapters/persistence-adapter.ts` — HelixDB delegation
- `src/session/session-manager.ts` — HelixDB session persistence
- `src/session/session-branch.ts` — createBranchEdge + getSessionHistory
- `src/ui/workspace/workspace-app.tsx` — Panel registration
- `src/ui/workspace/project-types.ts` — CanvasViewKind entries
- `src/ui/workspace/canvas-views/registry.tsx` — Panel registry
- `src/ui/workspace/left-sidebar.tsx` — Sidebar navigation
- `src/memory/index.ts`, `src/memory/memory-types.ts` — Exports + type fixes

---

## Table of Contents

1. [Why HelixDB](#1-why-helixdb)
2. [Architecture Overview](#2-architecture-overview)
3. [Graph Schema — Complete Data Model](#3-graph-schema--complete-data-model)
4. [Project Isolation Model (Multi-Tenancy)](#4-project-isolation-model-multi-tenancy)
5. [Feature-to-Feature Mapping](#5-feature-to-feature-mapping)
6. [What Stays Unchanged](#6-what-stays-unchanged)
7. [Implementation Phases](#7-implementation-phases)
   - [Phase 0 — Foundation](#phase-0--foundation)
   - [Phase 1 — Memory Layer](#phase-1--memory-layer)
   - [Phase 2 — Knowledge Base](#phase-2--knowledge-base)
   - [Phase 3 — Event Log](#phase-3--event-log)
   - [Phase 4 — State Persistence](#phase-4--state-persistence)
   - [Phase 5 — Session Management](#phase-5--session-management)
   - [Phase 6 — Visualizations](#phase-6--visualizations)
   - [Phase 7 — Workflow Graphs](#phase-7--workflow-graphs)
   - [Phase 8 — Export & Backup](#phase-8--export--backup)
8. [Complete File Change List](#8-complete-file-change-list)
9. [New Capabilities Matrix](#9-new-capabilities-matrix)
10. [Architecture Decision Records](#10-architecture-decision-records)

---

## 1. Why HelixDB

HelixDB is an OLTP graph-vector database written in Rust (Apache 2.0, YC-backed). It combines labeled property graphs, approximate nearest-neighbor (ANN) vector indexes, and BM25 full-text search in a single engine — queryable over HTTP with TypeScript, Rust, Go, and Python SDKs.

### Current State: All Memory/State Is Ephemeral

Every memory, knowledge, event, session, and state system in Eulinx currently lives in in-memory `Map<string, ...>` objects. Data vanishes on page refresh or process restart. Vector search is O(n) brute-force cosine similarity computed in JavaScript. There is no full-text search, no graph traversal, no causal tracing, no ACID persistence.

| System | Current Backend | Limitation |
|---|---|---|
| STM, LTM, Episodic, Semantic, Working Memory | In-memory `Map` | Lost on restart |
| Vector memory store | In-memory `Map` + O(n) cosine in JS | No index, ephemeral |
| KnowledgeBase | Delegates to vector store | Same limitation |
| Event log | SQLite DDL declared, no client wired | Schema only |
| Session state | In-memory `Map` | Lost on restart |
| Workflow state | In-memory `Map` + localStorage | Not production-grade |
| StateStore | `InMemoryStateStore` only | Testing only |
| Embeddings | FNV-1a hash (low quality) or unwired provider | No real embeddings |

### What HelixDB Provides

| Capability | Details |
|---|---|
| Labeled property graph | Nodes and edges with typed properties |
| ANN vector search | k-NN with tenant-partitioned indexes |
| BM25 full-text search | Tokenized relevance scoring |
| ACID transactions | Atomic batch writes |
| Multi-tenancy | Row-level + tenant-partitioned search indexes |
| 6 index types | Equality, unique, range (ASC/DESC), vector, text |
| Graph traversal | `out`, `in`, `both`, `repeat`, `union`, `choose`, `coalesce`, `optional` |
| Row bindings | Cross-hop correlation in a single query |
| Multi-language SDK | TypeScript, Rust, Go, Python |
| HTTP API | POST `/v1/query` with dynamic envelopes |

---

## 2. Architecture Overview

```
  +--------------------------------------------------------------------+
  |                       Eulinx App Process                           |
  |                                                                    |
  |  +--------------------------------------------------------------+ |
  |  |                   Existing Layers (unchanged)                  | |
  |  |  +----------+  +---------+  +----------+  +----------------+ | |
  |  |  | React UI |  | CLI     |  |Event Bus |  | Workflow Engine| | |
  |  |  +----------+  +---------+  +----------+  +----------------+ | |
  |  +--------------------------------------------------------------+ |
  |                              |                                     |
  |  +---------------------------v-----------------------------------+ |
  |  |                     Adapter Layer (NEW)                        | |
  |  |                                                               | |
  |  |  +------------------+  +--------------+  +------------------+ | |
  |  |  | HelixDBMemory    |  | HelixDB      |  | HelixDBState     | | |
  |  |  | Adapter          |  | EventAdapter |  | Adapter          | | |
  |  |  +------------------+  +--------------+  +------------------+ | |
  |  |  +------------------+  +--------------+                       | |
  |  |  | HelixDBKnowledge |  | HelixDB      |                       | |
  |  |  | Adapter          |  | Embeddings   |                       | |
  |  |  +------------------+  +--------------+                       | |
  |  +--------------------------------------------------------------+ |
  |                              |                                     |
  |  +---------------------------v-----------------------------------+ |
  |  |               HelixDBClient (shared HTTP wrapper)              | |
  |  |  - connect(host, port)  - query(req) => Response              | |
  |  |  - health() => boolean  - batch(queries[]) => Response        | |
  |  |  - admin/migrate()      - tenantScope(workspaceId)            | |
  |  +--------------------------------------------------------------+ |
  +------------------------------------|-------------------------------+
                                       | HTTP :9743
                        +--------------v--------------+
                        |       HelixDB Server        |
                        |  (sidecar / docker / cloud) |
                        |                             |
                        |  +-----------------------+  |
                        |  | Tenant: workspace_abc |  |
                        |  | +---+ +-----+ +----+ |  |
                        |  | |Mem| |Event| |Sess| |  |
                        |  | +---+ +-----+ +----+ |  |
                        |  +-----------------------+  |
                        |  +-----------------------+  |
                        |  | Tenant: workspace_xyz |  |
                        |  | +---+ +-----+ +----+ |  |
                        |  | |Mem| |Event| |Sess| |  |
                        |  | +---+ +-----+ +----+ |  |
                        |  +-----------------------+  |
                        |                             |
                        |  ANN Vec . BM25 . Traversal |
                        +-----------------------------+
```

### Data Flow: Read Path

```
User searches for "deployment issue from last week"
  => MemoryManager.searchMemory({ text: "deployment issue...", workspaceId })
    => HelixDBMemoryAdapter.search(query)
      => 1. Compute embedding via EmbeddingService (real provider)
      => 2. HelixDBClient.post("/v1/query", {
             vectorSearchNodes("Memory", "embedding", [...], 10, workspaceId),
             textSearchNodes("Memory", "content", "deployment...", 10, workspaceId)
           })
      => 3. Merge, rank, filter by sensitivity/scope in TypeScript
      => 4. Return results with scores
```

### Data Flow: Write Path

```
Agent writes a memory
  => MemoryManager.writeStm({ content, workspaceId, sessionId, ... })
    => HelixDBMemoryAdapter.write("stm", params)
      => 1. Validate policy (capacity, sensitivity, redaction)
      => 2. Compute embedding via EmbeddingService
      => 3. HelixDBClient.post("/v1/query", {
             addN("Memory", {
               id, workspaceId, kind:"stm", content, embedding:[...],
               sessionId, scope, sensitivity, tags, ...
             })
           })
      => 4. If related memories exist, addE("RELATES_TO", ...)
      => 5. Return StmRecord
```

---

## 3. Graph Schema — Complete Data Model

### 3.1 Node Labels

Every node carries a `workspaceId` property for tenant isolation.

```
+----------------------------------------------------------------------+
|                           Node: Memory                               |
+----------------------------------------------------------------------+
| Property        | Type       | Index          | Notes                |
|-----------------+------------+----------------+----------------------|
| id              | string     | PK (unique)    | e.g. "mem_a1b2c3"   |
| workspaceId     | string     | equality       | tenant partition key |
| kind            | string     | equality       | stm|ltm|episodic|    |
|                 |            |                | semantic|working     |
| scope           | string     | -              | workspace|session|   |
|                 |            |                | task|worker|execution|
| content         | string     | TEXT (tenant)  | BM25-indexed         |
| summary         | string     | -              | optional             |
| sessionId       | string     | equality       | nullable             |
| workerId        | string     | equality       | nullable             |
| sourceRef       | string     | -              | origin identifier    |
| sensitivity     | string     | -              | public|internal|     |
|                 |            |                | confidential|secret  |
| tags            | string[]   | -              | empty array default  |
| tokenEstimate   | i64        | -              | ceil(len/4)          |
| createdAt       | datetime   | range          | ISO 8601             |
| updatedAt       | datetime   | -              | ISO 8601             |
| expiresAt       | datetime   | -              | nullable, for STM    |
| expiryMode      | string     | -              | worker_end|task_end| |
|                 |            |                | session_end|ttl|     |
|                 |            |                | manual_clear         |
| ttlMs           | i64        | -              | nullable             |
| category        | string     | -              | for LTM: architecture|
|                 |            |                | _rule|user_preference|
|                 |            |                | |command_pattern|   |
|                 |            |                | decision|known_     |
|                 |            |                | failure|fact|custom  |
| reviewedAt      | datetime   | -              | for LTM review       |
| reviewStatus    | string     | -              | pending|approved|    |
|                 |            |                | rejected             |
| eventType       | string     | -              | for episodic         |
| eventTimestamp  | datetime   | -              | for episodic         |
| participant     | string     | -              | for episodic         |
| outcome         | string     | -              | for episodic         |
| factType        | string     | -              | for semantic:        |
|                 |            |                | definition|relation- |
|                 |            |                | ship|rule|procedure  |
| confidence      | f64        | -              | for semantic, 0..1   |
| sourceIds       | string[]   | -              | for semantic         |
| slot            | string     | -              | for working memory   |
| priority        | i64        | -              | for working memory   |
| metadata        | object     | -              | arbitrary JSON       |
| embedding       | f32[]      | VECTOR (tenant)| 256..1536-dim float  |
+----------------------------------------------------------------------+

Indexes:
  - equality(id)
  - equality(workspaceId)
  - equality(kind)
  - equality(sessionId)
  - equality(workerId)
  - vector(embedding) with tenant partition on workspaceId
  - text(content) with tenant partition on workspaceId
  - range(createdAt)
```

```
+----------------------------------------------------------------------+
|                          Node: Knowledge                             |
+----------------------------------------------------------------------+
| Property    | Type     | Index          | Notes                      |
|-------------+----------+----------------+----------------------------|
| id          | string   | PK            | e.g. "know_d4e5f6"         |
| workspaceId | string   | equality       | tenant partition key       |
| sourceType  | string   | equality       | markdown|text|url|repo|pdf|
| sourcePath  | string   | -              | file path or URL           |
| title       | string   | -              | optional title             |
| chunkText   | string   | TEXT (tenant)  | BM25-indexed content       |
| tags        | string[] | -              | from ingest options        |
| metadata    | object   | -              | arbitrary JSON             |
| createdAt   | datetime | range          | ISO 8601                   |
| embedding   | f32[]    | VECTOR (tenant)| 256..1536-dim float        |
+----------------------------------------------------------------------+

Indexes:
  - equality(id)
  - equality(workspaceId)
  - equality(sourceType)
  - vector(embedding) with tenant partition on workspaceId
  - text(chunkText) with tenant partition on workspaceId
  - range(createdAt)
```

```
+----------------------------------------------------------------------+
|                           Node: Event                                |
+----------------------------------------------------------------------+
| Property      | Type     | Index          | Notes                    |
|---------------+----------+----------------+--------------------------|
| id            | string   | PK             | e.g. "evt_g7h8i9"       |
| workspaceId   | string   | equality       | tenant partition key     |
| sequence      | i64      | -              | monotonic, per-workspace |
| type          | string   | equality       | fully qualified event    |
|               |          |                | type, e.g.               |
|               |          |                | "runtime.state_changed"  |
| payload       | string   | -              | JSON-serialized          |
| service       | string   | -              | source service           |
| sessionId     | string   | equality       | nullable                 |
| executionId   | string   | equality       | nullable                 |
| correlationId | string   | equality       | for correlated events    |
| causationId   | string   | equality       | for causal chains        |
| emittedAt     | datetime | range          | ISO 8601                 |
+----------------------------------------------------------------------+

Indexes:
  - equality(id)
  - equality(workspaceId)
  - equality(executionId)
  - equality(correlationId)
  - equality(type)
  - range(emittedAt)
```

```
+----------------------------------------------------------------------+
|                          Node: Session                               |
+----------------------------------------------------------------------+
| Property        | Type     | Index     | Notes                       |
|-----------------+----------+-----------+-----------------------------|
| id              | string   | PK        | e.g. "sess_j0k1l2"         |
| workspaceId     | string   | equality  | tenant partition key        |
| runtimeId       | string   | -         | associated runtime ID      |
| kind            | string   | -         | chat|terminal|agent        |
| state           | string   | equality  | created|initializing|      |
|                 |          |           | running|paused|completed|...|
| displayName     | string   | -         | optional human label       |
| parentSessionId | string   | -         | for branched sessions      |
| branchPoint     | i64      | -         | event seq at branch        |
| createdAt       | datetime | range     | ISO 8601                   |
| updatedAt       | datetime | -         | ISO 8601                   |
+----------------------------------------------------------------------+

Indexes:
  - equality(id)
  - equality(workspaceId)
  - equality(state)
  - range(createdAt)
```

Additional node labels follow the same pattern:

```
+----------------------------------------------------------------------+
|                          Node: WorkflowRun                           |
+----------------------------------------------------------------------+
| Property    | Type     | Index     | Notes                           |
|-------------+----------+-----------+---------------------------------|
| id          | string   | PK        | run ID                          |
| workspaceId | string   | equality  | tenant                          |
| workflowId  | string   | equality  | workflow definition ID          |
| snapshotId  | string   | -         | graph snapshot reference        |
| status      | string   | equality  | pending|running|completed|     |
|             |          |           | failed|cancelled                |
| error       | string   | -         | nullable error message          |
| createdAt   | datetime | range     | ISO 8601                        |
| updatedAt   | datetime | -         | ISO 8601                        |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
|                          Node: NodeState                             |
+----------------------------------------------------------------------+
| Property       | Type     | Index     | Notes                        |
|----------------+----------+-----------+------------------------------|
| id             | string   | PK        | composite: runId:nodeId      |
| workspaceId    | string   | equality  | tenant                       |
| runId          | string   | equality  | parent workflow run          |
| nodeId         | string   | -         | workflow node ID             |
| iterationIndex | i64      | -         | loop iteration               |
| state          | string   | equality  | pending|ready|running|      |
|                |          |           | succeeded|failed|skipped     |
| attempt        | i64      | -         | retry counter                |
| error          | string   | -         | nullable error               |
| config         | object   | -         | node runtime config          |
| createdAt      | datetime | -         | ISO 8601                     |
| updatedAt      | datetime | -         | ISO 8601                     |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
|                          Node: WorkerState                           |
+----------------------------------------------------------------------+
| Property    | Type     | Index     | Notes                           |
+-------------+----------+-----------+---------------------------------+
| id          | string   | PK        | worker ID                       |
| workspaceId | string   | equality  | tenant                          |
| runId       | string   | equality  | parent run                      |
| workerId    | string   | -         | logical worker identifier       |
| status      | string   | equality  | idle|busy|waiting|completed|   |
|             |          |           | failed                          |
| kind        | string   | -         | worker type identifier          |
| model       | string   | -         | AI model name (if applicable)   |
| config      | object   | -         | worker configuration             |
| metrics     | object   | -         | performance metrics              |
| createdAt   | datetime | -         | ISO 8601                        |
| updatedAt   | datetime | -         | ISO 8601                        |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
|                          Node: RunContext                            |
+----------------------------------------------------------------------+
| Property    | Type     | Index     | Notes                           |
+-------------+----------+-----------+---------------------------------+
| id          | string   | PK        | "ctx:" + runId                  |
| workspaceId | string   | equality  | tenant                          |
| runId       | string   | equality  | parent run                      |
| context     | object   | -         | free-form context data           |
| createdAt   | datetime | -         | ISO 8601                        |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
|                          Node: Artifact                              |
+----------------------------------------------------------------------+
| Property    | Type     | Index     | Notes                           |
+-------------+----------+-----------+---------------------------------+
| id          | string   | PK        | artifact ID                     |
| workspaceId | string   | equality  | tenant                          |
| kind        | string   | equality  | file|image|data|log             |
| path        | string   | -         | storage path                    |
| checksum    | string   | -         | content hash                    |
| size        | i64      | -         | bytes                           |
| mimeType    | string   | -         | MIME type                       |
| metadata    | object   | -         | additional metadata              |
| createdAt   | datetime | -         | ISO 8601                        |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
|                          Node: Prompt                                |
+----------------------------------------------------------------------+
| Property    | Type     | Index     | Notes                           |
+-------------+----------+-----------+---------------------------------+
| id          | string   | PK        | prompt ID                       |
| workspaceId | string   | equality  | tenant                          |
| name        | string   | -         | prompt name                     |
| content     | string   | -         | template content                |
| version     | i64      | -         | version number                  |
| tags        | string[] | -         | categorization tags             |
| createdAt   | datetime | -         | ISO 8601                        |
| updatedAt   | datetime | -         | ISO 8601                        |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
|                         Node: Snapshot                               |
+----------------------------------------------------------------------+
| Property        | Type     | Index     | Notes                       |
+-----------------+----------+-----------+-----------------------------|
| id              | string   | PK        | snapshot ID                  |
| workspaceId     | string   | equality  | tenant                       |
| kind            | string   | equality  | workspace|workflow|memory|  |
|                 |          |           | pre_merge|session            |
| label           | string   | -         | human label                  |
| payload         | object   | -         | snapshot data                 |
| parentSnapshotId| string   | -         | for incremental snapshots    |
| createdAt       | datetime | -         | ISO 8601                     |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
|                        Node: ProviderState                           |
+----------------------------------------------------------------------+
| Property    | Type     | Index     | Notes                           |
+-------------+----------+-----------+---------------------------------+
| id          | string   | PK        | provider config ID              |
| workspaceId | string   | equality  | tenant                          |
| providerId  | string   | equality  | openai|ollama|gemini|...        |
| model       | string   | -         | model name                      |
| baseUrl     | string   | -         | API endpoint                    |
| config      | object   | -         | additional configuration         |
| status      | string   | -         | enabled|disabled|error          |
| lastUsedAt  | datetime | -         | last usage timestamp             |
+----------------------------------------------------------------------+
```

### 3.2 Edge Labels

```
+--------------------+----------------+----------------+------------------+
| Edge Label         | From           | To             | Properties       |
+--------------------+----------------+----------------+------------------+
| HAS_EVENT          | Session        | Event          | sequence (i64)   |
| CAUSED_BY          | Event (child)  | Event (parent) | -                |
| CORRELATED_WITH    | Event          | Event          | reason (string)  |
| HAS_MEMORY         | Session        | Memory         | -                |
| HAS_WORKER         | Session /      | WorkerState    | -                |
|                    | WorkflowRun    |                |                  |
| HAS_NODE           | WorkflowRun    | NodeState      | -                |
| HAS_ARTIFACT       | WorkflowRun /  | Artifact       | -                |
|                    | Session        |                |                  |
| HAS_SNAPSHOT       | Session /      | Snapshot       | -                |
|                    | WorkflowRun    |                |                  |
| RELATES_TO         | Memory         | Memory         | strength (f64),  |
|                    |                |                | relation (string)|
| REFERENCES         | Memory         | Knowledge      | -                |
| DERIVED_FROM       | Memory         | Event          | -                |
| BRANCHED_FROM      | Session        | Session        | atEventSeq (i64) |
| DEPENDS_ON         | WorkflowRun    | WorkflowRun    | -                |
+--------------------+----------------+----------------+------------------+

Direction notes:
  - CAUSED_BY points FROM the child event TO the parent (cause).
    This enables: repeat(in("CAUSED_BY")) to trace back to root cause.
  - BRANCHED_FROM points FROM the branched session TO the source session.
  - DEPENDS_ON points FROM the dependent run TO the prerequisite run.
```

### 3.3 Schema Migration

Run once at startup when HelixDB is enabled. All `createIndexIfNotExists` calls are idempotent.

```
Migration batch structure:

  WriteBatch {
    // Tenant-partitioned vector indexes (search isolation)
    idx_vector_memory:    createIndexIfNotExists(nodeVector("Memory", "embedding", "workspaceId"))
    idx_vector_knowledge: createIndexIfNotExists(nodeVector("Knowledge", "embedding", "workspaceId"))

    // Tenant-partitioned text indexes (search isolation)
    idx_text_memory:      createIndexIfNotExists(nodeText("Memory", "content", "workspaceId"))
    idx_text_knowledge:   createIndexIfNotExists(nodeText("Knowledge", "chunkText", "workspaceId"))

    // Equality indexes (fast tenant scoping)
    eq_memory_ws:         createIndexIfNotExists(nodeEquality("Memory", "workspaceId"))
    eq_event_ws:          createIndexIfNotExists(nodeEquality("Event", "workspaceId"))
    eq_session_ws:        createIndexIfNotExists(nodeEquality("Session", "workspaceId"))
    eq_workflow_ws:       createIndexIfNotExists(nodeEquality("WorkflowRun", "workspaceId"))
    eq_nodestate_ws:      createIndexIfNotExists(nodeEquality("NodeState", "workspaceId"))
    eq_worker_ws:         createIndexIfNotExists(nodeEquality("WorkerState", "workspaceId"))
    eq_artifact_ws:       createIndexIfNotExists(nodeEquality("Artifact", "workspaceId"))
    eq_snapshot_ws:       createIndexIfNotExists(nodeEquality("Snapshot", "workspaceId"))
    eq_prompt_ws:         createIndexIfNotExists(nodeEquality("Prompt", "workspaceId"))
    eq_provider_ws:       createIndexIfNotExists(nodeEquality("ProviderState", "workspaceId"))

    // Equality indexes on query fields
    eq_memory_kind:       createIndexIfNotExists(nodeEquality("Memory", "kind"))
    eq_memory_session:    createIndexIfNotExists(nodeEquality("Memory", "sessionId"))
    eq_memory_worker:     createIndexIfNotExists(nodeEquality("Memory", "workerId"))
    eq_event_exec:        createIndexIfNotExists(nodeEquality("Event", "executionId"))
    eq_event_corr:        createIndexIfNotExists(nodeEquality("Event", "correlationId"))
    eq_event_type:        createIndexIfNotExists(nodeEquality("Event", "type"))
    eq_session_state:     createIndexIfNotExists(nodeEquality("Session", "state"))
    eq_workflow_wfid:     createIndexIfNotExists(nodeEquality("WorkflowRun", "workflowId"))
    eq_workflow_status:   createIndexIfNotExists(nodeEquality("WorkflowRun", "status"))
    eq_nodestate_run:     createIndexIfNotExists(nodeEquality("NodeState", "runId"))
    eq_knowledge_src:     createIndexIfNotExists(nodeEquality("Knowledge", "sourceType"))

    // Range indexes (ordered queries)
    range_memory_created: createIndexIfNotExists(nodeRange("Memory", "createdAt"))
    range_event_emitted:  createIndexIfNotExists(nodeRange("Event", "emittedAt"))
    range_session_created:createIndexIfNotExists(nodeRange("Session", "createdAt"))
    range_workflow_created:createIndexIfNotExists(nodeRange("WorkflowRun", "createdAt"))
  }
```

Total indexes per schema deployment: **30**.

---

## 4. Project Isolation Model (Multi-Tenancy)

### Design

Every Eulinx **workspace** maps to a HelixDB **row-level tenant** identified by the `workspaceId` property present on every node.

```
+------------------------------------------------------+
|                   HelixDB Server                      |
|                                                       |
|  +--------------------------------------------------+|
|  | Shared infrastructure (compute, cache, storage)   ||
|  |                                                   ||
|  |  Tenant: workspace_abc                            ||
|  |  +---+ +-----+ +----+ +------+ +--------+       ||
|  |  |Mem| |Event| |Sess| |Workfl| |Knowledge|       ||
|  |  +---+ +-----+ +----+ +------+ +--------+       ||
|  |                                                   ||
|  |  Tenant: workspace_xyz                            ||
|  |  +---+ +-----+ +----+ +------+ +--------+       ||
|  |  |Mem| |Event| |Sess| |Workfl| |Knowledge|       ||
|  |  +---+ +-----+ +----+ +------+ +--------+       ||
|  +--------------------------------------------------+|
+------------------------------------------------------+
```

### How Isolation Works

1. **Every write** attaches `workspaceId` to the node:
   ```
   addN("Memory", { workspaceId: "abc_123", content: "...", embedding: [...], ... })
   ```

2. **Every read** filters by `workspaceId` using the equality index:
   ```
   nWithLabelWhere("Memory", eq("workspaceId", "abc_123"))
     .where(eq("kind", "stm"))
     .limit(10)
   ```

3. **Vector and text search** use tenant-partitioned indexes:
   ```
   vectorSearchNodes("Memory", "embedding", queryVec, 10, "abc_123")
   textSearchNodes("Memory", "content", "search query", 10, "abc_123")
   ```

4. **Traversals** remain scoped because every node carries `workspaceId`:
   ```
   // Session timeline — automatically scoped because Session has workspaceId
   n(sessionNodeId).out("HAS_EVENT").orderBy("sequence")
   ```

### Isolation Guarantees

| Property | Mechanism |
|---|---|
| Data isolation | Every query includes workspaceId filter; tenant-partitioned indexes prevent cross-tenant search leakage |
| Resource sharing | All tenants share compute, caches, and storage — no per-tenant provisioning |
| Scaling | Reader auto-scaling responds to aggregate load across all tenants |
| Search performance | Tenant-partitioned vector/text indexes keep per-tenant working sets small |
| No noisy neighbor protection | Tenants share cache — a high-volume tenant can affect others' latency. Mitigate with rate limiting at the proxy layer. |

### Adding a New Workspace

No provisioning needed — just write the first node with the new `workspaceId`. The equality index handles it automatically. Tenant-partitioned indexes create new partitions lazily on first write with that tenant value.

---

## 5. Feature-to-Feature Mapping

### 5.1 HelixDB Feature → Eulinx System

| HelixDB Feature | Eulinx Consumer | Queries Enabled |
|---|---|---|
| Node CRUD (`addN`, `drop`) | All memory/state/event writes | Every write path |
| Edge CRUD (`addE`, `dropEdge`) | Session→Event, Memory→Memory, Event→Event | Relationship modeling |
| Equality index | Every workspaceId filter, kind filter, sessionId filter | Fast tenant scoping |
| Range index (ASC/DESC) | Timeline queries, "newest first" ordering | Event timeline, session list |
| ANN vector index | Memory + Knowledge semantic search | "Find semantically similar content" |
| BM25 text index | Memory + Knowledge full-text search | "Find by keyword with relevance ranking" |
| Graph traversal (`out`, `in`, `repeat`) | Session timeline, causal tracing, memory graph | "Trace root cause", "Show session events" |
| `union` | Combined search across entity types | "Search everything" |
| `choose` | Conditional routing per entity | "If memory is secret, exclude from context" |
| `coalesce` | Fallback search strategies | "Try vector search, fall back to text" |
| `optional` | Optional related data | "Load session and its events if any" |
| `forEachParam` | Bulk operations | "Import 1000 memory records" |
| Row bindings + `projectBindings` | Complex report queries | "Memory with its source event and related knowledge" |
| ACID `writeBatch` | `saveAll()`, `persistRunState()` | Atomic state + events + context writes |
| Multi-tenancy | Workspace isolation | Guaranteed data separation |
| Parameters/bundles | Prepared queries | Reusable, type-safe query definitions |

### 5.2 Eulinx Store → HelixDB Mapping

| Eulinx Class | HelixDB Node Label | Key Properties | Adapter |
|---|---|---|---|
| `ShortTermMemoryStore` | `Memory` | `kind="stm"`, `content`, `expiryMode`, `ttlMs`, `embedding` | `HelixDBMemoryAdapter` |
| `LongTermMemoryStore` | `Memory` | `kind="ltm"`, `content`, `category`, `reviewStatus`, `embedding` | `HelixDBMemoryAdapter` |
| `EpisodicMemoryStore` | `Memory` | `kind="episodic"`, `eventType`, `eventTimestamp`, `participant`, `embedding` | `HelixDBMemoryAdapter` |
| `SemanticMemoryStore` | `Memory` | `kind="semantic"`, `factType`, `confidence`, `sourceIds`, `embedding` | `HelixDBMemoryAdapter` |
| `WorkingMemoryStore` | `Memory` | `kind="working"`, `slot`, `priority`, `embedding` | `HelixDBMemoryAdapter` |
| `VectorMemoryStore` | `Memory` + `Knowledge` | `embedding` (f32[]), `chunkText` | `HelixDBMemoryAdapter` |
| `MemorySearchEngine` | `Memory` nodes + vector/text indexes | content, embedding | `HelixDBMemoryAdapter.search()` |
| `KnowledgeBase` | `Knowledge` | `sourceType`, `chunkText`, `embedding` | `HelixDBKnowledgeAdapter` |
| `EventBus` log | `Event` | `type`, `payload`, `causationId`, `emittedAt` | `HelixDBEventAdapter` |
| `SessionManager` | `Session` | `state`, `kind`, `parentSessionId` | `HelixDBSessionAdapter` |
| `PersistenceService` | `WorkflowRun`, `NodeState`, `WorkerState`, `RunContext` | runId, status, state, config | `HelixDBStateStore` |
| `PersistenceAdapter` | `WorkflowRun`, `NodeState`, `RunContext` | snapshotId, nodeId, state | `HelixDBPersistenceAdapter` |
| Artifact tracking | `Artifact` | `kind`, `path`, `checksum`, `size` | `HelixDBStateStore` |
| Prompt templates | `Prompt` | `name`, `content`, `version` | `HelixDBStateStore` |
| Provider config | `ProviderState` | `providerId`, `model`, `baseUrl` | `HelixDBStateStore` |
| Snapshots | `Snapshot` | `kind`, `label`, `payload`, `parentSnapshotId` | `HelixDBStateStore` |

---

## 6. What Stays Unchanged

The following systems are **not** replaced or modified by the HelixDB integration:

| System | Reason |
|---|---|
| **React UI rendering** (React Flow, panels, components) | Visualization layer; consumes data from adapters |
| **Event bus pub/sub** (`EventBus`, `EventPublisher`) | Bus handles dispatch and listener registration; HelixDB is persistence only |
| **Workflow engine** (`WorkflowEngine`, `GraphMirror`) | Execution logic (topological sort, dependency resolution, scheduling) stays in TypeScript. GraphMirror needs sub-millisecond state transitions |
| **Memory policy / eviction logic** (`MemoryPolicy`, `pruneRecords`) | TypeScript-layer rules for capacity enforcement, sensitivity redaction, retention |
| **Chunking pipeline** (`chunker.ts`) | Text splitting occurs in TypeScript before storage |
| **Session state machine** (`SessionManager` transitions) | `created->initializing->...->completed` logic unchanged |
| **Embedding computation** (`EmbeddingService.embed()`) | Client-side; HelixDB stores the resulting vector, doesn't compute it |
| **Tauri native bridge** (FS, PTY, window, dialog) | Stays in Rust (Tauri commands) |
| **Ingest adapters** (`ingest/markdown.ts`, `ingest/url.ts`, etc.) | Text extraction happens in TypeScript; HelixDB stores the result |
| **CLI** (except new `helixdb export/import` commands) | Existing CLI commands unchanged |
| **Existing tests** | All 1696 existing tests remain; new tests added for HelixDB paths |

---

## 7. Implementation Phases

### Phase 0 — Foundation

**Goal:** HelixDB server accessible, SDK installed, client wrapper operational.

**Duration:** 1–2 days

**Files to create (5):**

| File | Purpose |
|---|---|
| `src/integrations/helixdb/helixdb-client.ts` | Shared HTTP client wrapping POST /v1/query, health check, retry logic |
| `src/integrations/helixdb/helixdb-config.ts` | Config schema: `{ enabled: boolean, host: string, port: number, timeout: number }` |
| `src/integrations/helixdb/helixdb-types.ts` | Mapping types: label strings, property name constants, edge label constants |
| `src/integrations/helixdb/helixdb-migration.ts` | Schema migration: idempotent index creation batch |
| `src/integrations/helixdb/index.ts` | Barrel export for all helixdb modules |

**Files to modify (3):**

| File | Change |
|---|---|
| `package.json` | Add `@helix-db/helix-db` dependency |
| `src/core/config.ts` | Add `helixdb: { enabled: false, host: "127.0.0.1", port: 9743, timeout: 30000 }` |
| `src/core/config.test.ts` | Add test for default helixdb config values |

**Verification criteria:**
- `new HelixDBClient({ host: "127.0.0.1", port: 9743 })` connects successfully
- `client.health()` returns true when HelixDB server is running
- `client.migrate(schema)` creates all 30 indexes idempotently
- Running migration twice produces no errors
- All existing tests pass (`pnpm test`)
- TypeScript compiles clean (`pnpm typecheck`)

**Config flag behavior:**
- `helixdb.enabled: false` (default) — all systems use current in-memory implementations
- `helixdb.enabled: true` — adapters redirect to HelixDB

---

### Phase 1 — Memory Layer

**Goal:** All six memory stores backed by HelixDB `Memory` nodes with vector + text search.

**Duration:** 3–4 days

**Files to create (2):**

| File | Purpose |
|---|---|
| `src/integrations/helixdb/adapters/helixdb-memory-adapter.ts` | Unified adapter replacing STM, LTM, Episodic, Semantic, Working, and Vector stores |
| `src/integrations/helixdb/adapters/helixdb-embedding-adapter.ts` | Wires a real embedding provider (OpenAI, Ollama, etc.) to the `EmbeddingService` |

**Files to modify (3):**

| File | Change |
|---|---|
| `src/memory/memory-manager.ts` | Accept optional `HelixDBMemoryAdapter` in constructor; instantiate it when config flag is set |
| `src/memory/index.ts` | Export `HelixDBMemoryAdapter` type |
| `src/core/config.ts` | Add `memory.backend: "memory" | "helixdb"` option |

**Adapter design:**

The `HelixDBMemoryAdapter` exposes the same method signatures as the current individual stores but delegates to HelixDB:

```
write(kind, params)  => addN("Memory", { kind, ...params, embedding })
read(id)             => nWhere(eq("id", id)).valueMap([...])
delete(id)           => nWhere(eq("id", id)).drop()
count(workspaceId)   => nWithLabelWhere("Memory", eq("workspaceId", ws)).count()
search(query)        => hybrid vectorSearchNodes + textSearchNodes
```

**Memory search flow (hybrid):**

```
search({ text, workspaceId, kinds, sessionId, maxResults })
  => 1. Compute embedding for query text
  => 2. HelixDB readBatch:
       varAs("vector_hits",
         vectorSearchNodes("Memory", "embedding", queryVec, k*2, workspaceId)
           .project(["id", "content", "kind", "sessionId", "$distance"])
       )
       varAs("text_hits",
         textSearchNodes("Memory", "content", query, k*2, workspaceId)
           .project(["id", "content", "kind", "sessionId", "$distance"])
       )
  => 3. Merge results, deduplicate, apply filters and sensitivity penalty
  => 4. Sort by blended score, apply maxResults
```

**Embedding provider wiring:**

The `HelixDBEmbeddingAdapter` connects to a configured AI provider (OpenAI, Ollama, LM Studio, Gemini) and replaces the local FNV-1a hash fallback. The resulting real embeddings are stored in the `embedding` property of `Memory` and `Knowledge` nodes.

**Verification criteria:**
- Memory written with HelixDB persists across app restart
- `searchMemory()` returns ANN + BM25 results (not brute-force)
- Embedding provider calls are logged and measured
- Policy enforcement (capacity, sensitivity, TTL) still works at TypeScript layer
- All existing memory tests pass when running against HelixDB backend
- Fallback to local hash when no provider is configured

---

### Phase 2 — Knowledge Base

**Goal:** `KnowledgeBase` stores indexed chunks as `Knowledge` nodes with tenant-partitioned vector and text indexes.

**Duration:** 1–2 days

**Files to create (1):**

| File | Purpose |
|---|---|
| `src/integrations/helixdb/adapters/helixdb-knowledge-adapter.ts` | Backs `KnowledgeBase` with `Knowledge` nodes |

**Files to modify (1):**

| File | Change |
|---|---|
| `src/memory/knowledge-base.ts` | Accept optional `HelixDBKnowledgeAdapter` in constructor |

**Data flow for ingest:**

```
ingest(kind, source, workspaceId, options)
  => 1. Chunk text (existing chunker.ts)
  => 2. For each chunk:
       a. Compute embedding via EmbeddingService
       b. addN("Knowledge", {
            id, workspaceId, sourceType, sourcePath: source,
            title, chunkText, tags, metadata, createdAt, embedding
          })
  => 3. Return list of created node IDs
```

**Data flow for search:**

```
search(query, workspaceId, maxResults)
  => 1. Compute query embedding
  => 2. HelixDB readBatch:
       varAs("semantic",
         vectorSearchNodes("Knowledge", "embedding", queryVec, maxResults, workspaceId)
           .project(["id", "title", "chunkText", "$distance"])
       )
       varAs("text",
         textSearchNodes("Knowledge", "chunkText", query, maxResults, workspaceId)
           .project(["id", "title", "chunkText", "$distance"])
       )
  => 3. Merge, interleave, return
```

**Verification criteria:**
- All 5 ingest formats (markdown, text, URL, repo, PDF) produce searchable Knowledge nodes
- Knowledge persists across restart
- Hybrid search returns results from both vector and BM25 paths
- `REFERENCES` edges link Memory nodes to Knowledge nodes when applicable

---

### Phase 3 — Event Log

**Goal:** Every event persisted as a HelixDB `Event` node with causal edges for root cause tracing.

**Duration:** 2–3 days

**Files to create (1):**

| File | Purpose |
|---|---|
| `src/integrations/helixdb/adapters/helixdb-event-adapter.ts` | Writes/reads events as `Event` nodes with `CAUSED_BY` edges |

**Files to modify (2):**

| File | Change |
|---|---|
| `src/event-bus/event-history.ts` | Add HelixDB write/read paths alongside existing SQLite DDL |
| `src/event-bus/event-bus.ts` | Inject `HelixDBEventAdapter` as event log implementation when config flag is set |

**Event write flow:**

```
write(event: EulinxEventUnion)
  => 1. Convert to PersistedEventEnvelope
  => 2. HelixDB writeBatch:
       varAs("newEvent",
         addN("Event", {
           id: event.eventId,
           workspaceId: event.workspaceId,
           sequence: event.sequence,
           type: event.type,
           payload: JSON.stringify(event.payload),
           service: event.source.service,
           sessionId: event.sessionId,
           executionId: event.executionId,
           correlationId: event.correlationId,
           causationId: event.causationId,
           emittedAt: event.emittedAt
         })
       )
       // If causationId exists, link to parent event
       varAsIf("causalEdge", VarNotEmpty("parentEvent"),
         n(parentEventNode)
           .addE("CAUSED_BY", NodeRef.var("newEvent"), {})
       )
       // If correlationId matches other events, link them
       ...
```

**Query patterns enabled:**

| Query | HelixDB Traversal |
|---|---|
| Event timeline for a session | `n(Session).out("HAS_EVENT").orderBy("sequence")` |
| Causal trace (root cause analysis) | `n(Event).repeat(in("CAUSED_BY")).emitAll()` |
| Events for an execution | `nWithLabelWhere("Event", eq("executionId", execId))` |
| Events by type + time range | `nWithLabelWhere("Event", eq("type", type)).where(range("emittedAt", from, to))` |
| Correlation group | `nWithLabelWhere("Event", eq("correlationId", corrId)).orderBy("sequence")` |

**Verification criteria:**
- Events persisted and queryable after restart
- `query(EventRangeQuery)` returns correct results with sequence ordering
- Causal trace walks `CAUSED_BY` chain from child to root
- Correlation group returns all events sharing a correlationId
- Retention/prune logic still works at TypeScript layer

---

### Phase 4 — State Persistence

**Goal:** All entity states (sessions, workflow runs, node states, worker states, artifacts, prompts, provider configs, snapshots) stored as HelixDB nodes.

**Duration:** 2–3 days

**Files to create (2):**

| File | Purpose |
|---|---|
| `src/integrations/helixdb/adapters/helixdb-state-store.ts` | Implements `StateStore` interface using HelixDB nodes |
| `src/integrations/helixdb/adapters/helixdb-persistence-adapter.ts` | Implements `PersistenceAdapter` interface for workflow engine |

**Files to modify (2):**

| File | Change |
|---|---|
| `src/state/persistence.ts` | Register `HelixDBStateStore` as production store when config flag is set |
| `src/workflow/adapters/persistence-adapter.ts` | Register `HelixDBPersistenceAdapter` when config flag is set |

**State label mapping:**

```
EntityKind           => HelixDB Label
runtime_state        => Session
worker_state         => WorkerState
session_state        => Session
workflow_run         => WorkflowRun
node_step            => NodeState
run_context          => RunContext
artifact_state       => Artifact
task_state           => WorkerState  (reuses WorkerState with status field)

Additional (not in original EntityKind):
prompt               => Prompt
snapshot             => Snapshot
provider_state       => ProviderState
```

**StateStore methods mapped to HelixDB:**

```
load<T>(id)            => nWhere(eq("id", id)).valueMap([...])
save<T>(entity)        => g().addN(label(entity.kind), {...entity})
saveAll<T>(entities)   => writeBatch { for each: addN(...) }  (ACID)
delete(id)             => nWhere(eq("id", id)).drop()
queryByWorkspace(ws)   => nWithLabelWhere(label, eq("workspaceId", ws))
```

**persistRunState flow:**

```
persistRunState(run, steps, context)
  => 1. Validate all entities
  => 2. HelixDB writeBatch (single ACID transaction):
       addN("WorkflowRun", { ...run })
       for each step: addN("NodeState", { ...step })
       addN("RunContext", { ...context })
       // Link run to its nodes
       n(runNode).addE("HAS_NODE", step1Node)
       n(runNode).addE("HAS_NODE", step2Node)
       ...
  => 3. Log success
```

**Verification criteria:**
- State persists across restart for all entity kinds
- `persistRunState()` atomically writes run + steps + context
- `loadWorkflowRunsByWorkspace()` returns persisted runs
- Session state machine transitions are persisted
- All existing state tests pass against HelixDB backend

---

### Phase 5 — Session Management

**Goal:** Session state and history persisted in HelixDB with branching support.

**Duration:** 1–2 days

**Files to modify (1):**

| File | Change |
|---|---|
| `src/session/session-manager.ts` | Inject HelixDB for session persistence; store `BRANCHED_FROM` edge on branch |

**Session persistence flow:**

```
createSession(request)
  => 1. Create SessionState (existing logic)
  => 2. addN("Session", {
       id: sessionId,
       workspaceId,
       runtimeId: request.runtimeId,
       kind: request.kind,
       state: "created",
       parentSessionId: request.parentSessionId,
       branchPoint: request.branchFromEventSeq,
       createdAt: now,
       updatedAt: now
     })
  => 3. If parentSessionId exists:
       n(parentSession).addE("BRANCHED_FROM", sessionNode, { atEventSeq })
  => 4. Load initial state from HelixDB on recovery
```

**Session history flow:**

```
getHistory(sessionId)
  => n(sessionNode)
       .out("HAS_EVENT")
       .orderBy("sequence")
       .valueMap(["eventSeq", "eventType", "actor", "timestamp", "detail", "metadata"])
```

**Verification criteria:**
- Session state survives restart
- Branched sessions show `BRANCHED_FROM` parent relationship
- `getHistory()` returns ordered events for a session
- Session recovery loads state from HelixDB

---

### Phase 6 — Visualizations

**Goal:** Eight rich in-app visualizations that leverage HelixDB's graph, vector, and text capabilities.

**Duration:** 4–5 days

**Files to create (8):**

All under `src/ui/workspace/panels/`:

| File | Purpose |
|---|---|
| `memory-graph.tsx` | Interactive force-directed graph of Memory nodes with `RELATES_TO` edges |
| `knowledge-graph.tsx` | Knowledge nodes grouped by source type with `REFERENCES` edges to Memory |
| `causal-trace.tsx` | Root cause analysis tree walking `CAUSED_BY` edges |
| `session-timeline.tsx` | Chronological event timeline with branch points |
| `workspace-dashboard.tsx` | Metric cards, sparklines, recent activity feed |
| `vector-explorer.tsx` | 2D UMAP/t-SNE projection of embeddings with search |
| `unified-search.tsx` | Command-palette search across all entity types with semantic ranking |
| `query-playground.tsx` | Developer tool for writing and executing HelixQL queries |

**Files to modify (1):**

| File | Change |
|---|---|
| `src/ui/workspace/workspace-app.tsx` | Register new panel components in the workspace layout |

#### 6a. Memory Graph

**Purpose:** Interactive visualization of the memory graph — memories as nodes, their semantic or explicit relationships as edges.

**Data source (HelixDB query):**
```
readBatch()
  .varAs("memories",
    nWithLabelWhere("Memory", eq("workspaceId", wsId))
      .project(["id", "content", "kind", "sessionId", "createdAt", "tokenEstimate"])
  )
  .varAs("edges",
    nWithLabelWhere("Memory", eq("workspaceId", wsId))
      .outE("RELATES_TO")
      .project(["$from", "$to", "strength", "relation"])
  )
  .returning(["memories", "edges"])
```

**Visual encoding:**
- Node color → `kind` (STM=#3b82f6 blue, LTM=#22c55e green, episodic=#f59e0b amber, semantic=#a855f7 purple, working=#ec4899 pink)
- Node size → `tokenEstimate` (log scale, 20–80px)
- Node label → truncated `content` (first 40 chars)
- Edge color → `relation` type
- Edge width → `strength` (0.5–4px)
- Layout → Force-directed (D3 force simulation or React Flow layout)
- Physics → Link distance 150, charge -300, center gravity 0.1

**Interaction:**
- Click node → side panel shows full memory content with metadata
- Hover edge → tooltip with relation type and strength
- Right-click → context menu: delete, promote to LTM, add tag
- Search bar → real-time vector search highlights matching nodes
- Filter bar → by kind, sessionId, sensitivity, date range
- Zoom/pan → standard canvas controls

**UI location:** Right sidebar, tab labeled "Memory Graph"

**Rendering library:** React Flow (already used for workflow node graph) or D3 force layout

#### 6b. Knowledge Graph

**Purpose:** Show ingested knowledge chunks as nodes grouped by source, with edges to memories that reference them.

**Data source (HelixDB query):**
```
readBatch()
  .varAs("knowledge",
    nWithLabelWhere("Knowledge", eq("workspaceId", wsId))
      .project(["id", "title", "sourceType", "sourcePath", "createdAt", "chunkText"])
  )
  .varAs("references",
    nWithLabelWhere("Memory", eq("workspaceId", wsId))
      .outE("REFERENCES")
      .project(["$from", "$to"])
  )
  .returning(["knowledge", "references"])
```

**Visual encoding:**
- Node color → `sourceType` (markdown=#3b82f6, url=#22c55e, repo=#f59e0b, pdf=#ef4444)
- Node clustering → by `sourcePath` (all chunks from same file/URL group together)
- Edge → `REFERENCES` from Memory to Knowledge (thinner, gray)
- Layout → Cluster layout with hierarchical grouping

**UI location:** Right sidebar, tab labeled "Knowledge Graph"

#### 6c. Causal Trace

**Purpose:** Root cause analysis — from a failure event, walk back through the causal chain and display as a tree.

**Data source (HelixDB query):**
```
// From a failure event, walk back to root cause
nWhere(eq("eventId", failureEventId))
  .repeat(in("CAUSED_BY"))
  .emitAll()
  .project(["eventId", "type", "payload", "emittedAt"])
```

**Visual encoding:**
- Tree layout (root cause at top, leaf event at bottom, or left-to-right)
- Node color → severity derived from `type` (error=#ef4444, warning=#f59e0b, info=#3b82f6)
- Node label → event type + timestamp
- Edge → vertical connector line with arrow pointing from effect to cause (downward)
- Animation → expand/collapse branches, highlight path to selected node

**Interaction:**
- Click event node → show full event details in side panel
- Search within trace by event type or keyword in payload
- Export trace as JSON or screenshot

**UI location:** Context menu on any event → "Trace Cause" opens this panel

#### 6d. Session Timeline

**Purpose:** Chronological Gantt-chart-style view of a session's events with branching.

**Data source (HelixDB queries):**
```
// Session events
n(sessionId).out("HAS_EVENT").orderBy("sequence")
  .project(["eventId", "type", "emittedAt", "payload"])

// Branch tree
n(sessionId).out("BRANCHED_FROM")
  .repeat(out("BRANCHED_FROM")).emitAll()
  .project(["sessionId", "state", "createdAt"])
```

**Visual encoding:**
- Horizontal timeline (left = oldest, right = newest)
- Events as colored bars or dots along the timeline
- Color by event family (runtime=blue, worker=green, execution=amber, memory=purple, tool=orange)
- Branch points shown as fork icons with a new timeline track branching off
- Replay mode: step through events one-by-one with animation

**Interaction:**
- Hover event → tooltip with type and summary
- Click event → show full details
- Click branch → navigate to branched session
- Filter by event type, worker, time range
- Play/pause/step for replay mode

**UI location:** Bottom panel, tab labeled "Timeline"

#### 6e. Workspace Dashboard

**Purpose:** At-a-glance summary of workspace activity and health.

**Data source (HelixDB queries):**
```
readBatch()
  .varAs("memoryCount", nWithLabelWhere("Memory", eq("workspaceId", wsId)).count())
  .varAs("eventCount", nWithLabelWhere("Event", eq("workspaceId", wsId)).count())
  .varAs("sessionCount", nWithLabelWhere("Session", eq("workspaceId", wsId)).count())
  .varAs("knowledgeCount", nWithLabelWhere("Knowledge", eq("workspaceId", wsId)).count())
  .varAs("recentEvents",
    nWithLabelWhere("Event", eq("workspaceId", wsId))
      .orderByDesc("emittedAt").limit(10)
      .project(["type", "emittedAt", "service"])
  )
  .returning(["memoryCount", "eventCount", "sessionCount", "knowledgeCount", "recentEvents"])
```

**Visual encoding:**
- Metric cards (4 across): Memories, Events, Sessions, Knowledge chunks
  - Each card: large number, label, trend arrow (up/down/flat), mini sparkline (last 24h)
- Recent activity feed (10 most recent events) below the cards
- Health indicator: green dot "HelixDB Connected" / red dot "Disconnected"
- Storage estimate: "~X MB stored across Y nodes"

**UI location:** Welcome/home tab in workspace, or left sidebar dashboard

#### 6f. Vector Explorer

**Purpose:** 2D projection of embedding vectors to visualize semantic clustering.

**Data source (HelixDB query):**
```
nWithLabelWhere("Memory", eq("workspaceId", wsId))
  .where(eq("kind", "ltm"))  // or all kinds, filtered client-side
  .project(["id", "content", "kind", "sessionId", "embedding"])
```

**Client-side pipeline:**
1. Fetch embeddings from HelixDB (up to ~5000 points)
2. Compute UMAP projection (2D) using a JS library (e.g., `umap-js`)
3. Render as WebGL scatter plot (deck.gl or three.js)

**Visual encoding:**
- Each point = one Memory or Knowledge node
- Color by `kind` (same scheme as Memory Graph)
- Size by `tokenEstimate` or uniform
- Background shows density clusters (heatmap overlay)

**Interaction:**
- Pan/zoom with smooth WebGL rendering
- Click point → show memory content in side panel
- Lasso select → select cluster → bulk actions (delete, tag, promote)
- Search: type query → compute embedding → highlight nearest neighbors with glow/pulse
- Filter sidebar: by kind, sessionId, sensitivity, date range

**UI location:** Right sidebar, tab labeled "Vector Explorer"

#### 6g. Unified Search

**Purpose:** One search bar that searches across all entity types with semantic ranking.

**Data source (HelixDB query):**
```
// Compute query vector first, then:
readBatch()
  .varAs("memories",
    vectorSearchNodes("Memory", "embedding", queryVec, 5, wsId)
      .project(["$id", "content", "kind", "sessionId", "$distance"]))
  .varAs("knowledge",
    vectorSearchNodes("Knowledge", "embedding", queryVec, 5, wsId)
      .project(["$id", "title", "chunkText", "$distance"]))
  .varAs("events",
    textSearchNodes("Event", "payload", queryText, 5, wsId)
      .project(["eventId", "type", "emittedAt", "$distance"]))
  .returning(["memories", "knowledge", "events"])
```

**Visual encoding:**
- Command-palette interface (Cmd+K to open)
- Results grouped by category with section headers
- Each result: type icon + label/truncated content + score badge + timestamp
- Keyboard navigation: up/down to select, Enter to open, Esc to close

**Interaction:**
- Live search with debounce (300ms)
- Results update as user types
- Click result → navigate to the entity in its native viewer (or show in side panel)
- Recent searches dropdown
- Filter chips: Memory, Knowledge, Events, Sessions toggles

**UI location:** Top bar search input (Cmd+K)

#### 6h. Query Playground

**Purpose:** Developer tool for writing and executing raw HelixDB queries.

**Data source:** User-written HelixQL queries, sent via `HelixDBClient.query()`

**Visual encoding:**
- Monaco editor (or CodeMirror) for query input with syntax highlighting
- Results displayed as JSON tree viewer or table
- Query history sidebar
- Template library: "All memories", "Event timeline", "Causal trace", "Workspace stats", "Session events"
- Export results as JSON button

**UI location:** Developer tools menu → "HelixDB Query Playground"

---

### Phase 7 — Workflow Graphs

**Goal:** Store workflow dependency graphs as HelixDB edges for analysis queries.

**Duration:** 1–2 days

**Files to modify (1):**

| File | Change |
|---|---|
| `src/workflow/workflow-engine.ts` | When saving a workflow snapshot, also store `DEPENDS_ON` edges in HelixDB |

**Workflow graph storage:**

```
When a GraphSnapshot is persisted:
  => For each EdgeDefinition in the snapshot:
       addE("DEPENDS_ON", fromNode, toNode, {
         edgeKind: edge.kind,
         cardinality: edge.cardinality,
         guard: edge.guard
       })
```

**Queries enabled:**

| Query | HelixDB Traversal |
|---|---|
| "Find all workflows that use tool X" | `nWithLabelWhere("NodeState", eq("config.kind", "tool")).in("HAS_NODE").in("HAS_NODE")` |
| "Trace dependency path from A to B" | `n(nodeA).repeat(out("DEPENDS_ON")).until(eq("$id", nodeB)).emitAll()` |
| "What is affected if I remove node C?" | `n(nodeC).repeat(in("DEPENDS_ON")).emitAll().dedup()` |
| "Show the critical path (longest chain)" | `n(rootNode).repeat(out("DEPENDS_ON")).emitAll().project(...)` |

---

### Phase 8 — Export & Backup

**Goal:** Export and import workspace data for backup, migration, or offline analysis.

**Duration:** 1 day

**Files to create (1):**

| File | Purpose |
|---|---|
| `src/cli/commands/helixdb.ts` | `helixdb export <workspaceId> [outputPath]` and `helixdb import <workspaceId> [inputPath]` |

**Files to modify (1):**

| File | Change |
|---|---|
| `src/cli/index.ts` | Register `helixdb` command |

**Export format (JSON):**
```
{
  "version": 1,
  "exportedAt": "2026-07-20T...",
  "workspaceId": "abc_123",
  "nodeCount": 1523,
  "edgeCount": 489,
  "nodes": [
    { "label": "Memory", "properties": { "id": "...", "kind": "ltm", ... } },
    ...
  ],
  "edges": [
    { "label": "RELATES_TO", "from": "mem_1", "to": "mem_2", "properties": {} },
    ...
  ]
}
```

**CLI usage:**
```
pnpm helixdb export abc_123 ./backups/abc_123.json
pnpm helixdb import xyz_789 ./backups/abc_123.json
```

---

## 8. Complete File Change List

### New Files (19)

| # | Path | Phase | Purpose |
|---|---|---|---|
| 1 | `src/integrations/helixdb/index.ts` | 0 | Barrel export |
| 2 | `src/integrations/helixdb/helixdb-client.ts` | 0 | Shared HTTP client |
| 3 | `src/integrations/helixdb/helixdb-config.ts` | 0 | Config schema |
| 4 | `src/integrations/helixdb/helixdb-types.ts` | 0 | Label/property/edge type constants |
| 5 | `src/integrations/helixdb/helixdb-migration.ts` | 0 | Schema migration (30 indexes) |
| 6 | `src/integrations/helixdb/adapters/helixdb-memory-adapter.ts` | 1 | Memory stores backend |
| 7 | `src/integrations/helixdb/adapters/helixdb-embedding-adapter.ts` | 1 | Real embedding provider wiring |
| 8 | `src/integrations/helixdb/adapters/helixdb-knowledge-adapter.ts` | 2 | KnowledgeBase backend |
| 9 | `src/integrations/helixdb/adapters/helixdb-event-adapter.ts` | 3 | Event log backend |
| 10 | `src/integrations/helixdb/adapters/helixdb-state-store.ts` | 4 | StateStore implementation |
| 11 | `src/integrations/helixdb/adapters/helixdb-persistence-adapter.ts` | 4 | Workflow persistence adapter |
| 12 | `src/ui/workspace/panels/memory-graph.tsx` | 6 | Memory graph visualization |
| 13 | `src/ui/workspace/panels/knowledge-graph.tsx` | 6 | Knowledge graph visualization |
| 14 | `src/ui/workspace/panels/causal-trace.tsx` | 6 | Root cause analysis |
| 15 | `src/ui/workspace/panels/session-timeline.tsx` | 6 | Session event timeline |
| 16 | `src/ui/workspace/panels/workspace-dashboard.tsx` | 6 | Workspace stats dashboard |
| 17 | `src/ui/workspace/panels/vector-explorer.tsx` | 6 | 2D embedding projection |
| 18 | `src/ui/workspace/panels/unified-search.tsx` | 6 | Global hybrid search |
| 19 | `src/ui/workspace/panels/query-playground.tsx` | 6 | HelixQL query editor |

### Modified Files (13)

| # | Path | Phase | Change |
|---|---|---|---|
| 1 | `package.json` | 0 | Add `@helix-db/helix-db` dependency |
| 2 | `src/core/config.ts` | 0 | Add `helixdb` config section |
| 3 | `src/core/config.test.ts` | 0 | Test new config defaults |
| 4 | `src/memory/memory-manager.ts` | 1 | Accept optional HelixDB backend |
| 5 | `src/memory/knowledge-base.ts` | 2 | Accept optional HelixDB backend |
| 6 | `src/memory/index.ts` | 1 | Export new adapter types |
| 7 | `src/event-bus/event-history.ts` | 3 | Add HelixDB write/read paths |
| 8 | `src/event-bus/event-bus.ts` | 3 | Inject event log adapter |
| 9 | `src/state/persistence.ts` | 4 | Register HelixDBStateStore |
| 10 | `src/session/session-manager.ts` | 5 | HelixDB session persistence |
| 11 | `src/workflow/adapters/persistence-adapter.ts` | 4 | HelixDB persistence adapter |
| 12 | `src/ui/workspace/workspace-app.tsx` | 6 | Register new panels |
| 13 | `src/cli/index.ts` | 8 | Register `helixdb` command |

---

## 9. New Capabilities Matrix

### Before vs After

| Capability | Before (In-Memory) | After (HelixDB) | User Impact |
|---|---|---|---|
| **Memory persistence** | Lost on page refresh | Survives app restart | Agents remember conversations across sessions |
| **Semantic search** | FNV-1a hash bag-of-words (256-dim, low quality) | Real transformer embeddings (OpenAI/Ollama, 768–1536-dim) | "Find the discussion about deployment issues" returns accurate results |
| **Full-text search** | Simple `content.includes(query)` | BM25 ranking with relevance scores | Best results ranked first |
| **Search performance** | O(n) brute-force scan of all records | O(log n) ANN index + O(log n) inverted index | Scales to 100K+ memories without slowdown |
| **Graph query** | Not possible | `out()`, `in()`, `repeat()` traversals | "Show me everything connected to this failure event" |
| **Causal tracing** | Not possible | Walk `CAUSED_BY` chain with `repeat(in(...))` | "How did this error happen?" → interactive visual trace |
| **Memory relationships** | Not modeled | `RELATES_TO` edges with `strength` and `relation` properties | Memories form a connected knowledge graph |
| **Workspace isolation** | Manual `.filter(r => r.workspaceId === id)` | Built-in HelixDB tenant partitions | Zero-effort, guaranteed data separation |
| **ACID transactional writes** | Not available | Single `writeBatch` for all mutations | Session state + events + memories updated atomically |
| **Session branching** | Not persisted | `BRANCHED_FROM` edges form a session tree | Session hierarchy visible and navigable in UI |
| **Vector visualization** | Not possible (no persisted embeddings) | Export embeddings → UMAP projection → WebGL scatter plot | Visual semantic clustering of agent knowledge |
| **Unified search** | Not possible (separate in-memory stores) | Single `readBatch` across Memory, Knowledge, Event nodes | Search everything in one go from a command palette |
| **Export / backup** | Not possible (all ephemeral) | Full JSON export of workspace graph | Backup, migrate, or analyze workspace data offline |
| **Event auditing** | In-memory only, lost on restart | Durable `Event` nodes with causal edges | Full audit trail that survives crashes |
| **Workflow analysis** | Not possible | `DEPENDS_ON` edges between workflow runs | "What workflows use this tool?" / "What's affected if I change this node?" |

### Query Pattern Examples

| User Need | HelixDB Query (Pseudocode) |
|---|---|
| "Find all LTM memories about deployment" | `nWithLabelWhere("Memory", eq("kind", "ltm"), eq("workspaceId", ws)).textSearchNodes("Memory", "content", "deployment", 10, ws)` |
| "What caused this error?" | `nWhere(eq("id", errorEventId)).repeat(in("CAUSED_BY")).emitAll()` |
| "Show me session ABC's timeline" | `n(sessionId).out("HAS_EVENT").orderBy("sequence")` |
| "Find knowledge chunks from my repo" | `nWithLabelWhere("Knowledge", eq("sourceType", "repo"), eq("workspaceId", ws))` |
| "What memories does this event reference?" | `n(eventId).in("DERIVED_FROM")` |
| "Show the last 10 events across all sessions" | `nWithLabelWhere("Event", eq("workspaceId", ws)).orderByDesc("emittedAt").limit(10)` |
| "Find all sessions in 'running' state" | `nWithLabelWhere("Session", eq("state", "running"), eq("workspaceId", ws))` |
| "Trace the critical path in workflow run X" | `n(runId).out("HAS_NODE").repeat(out("DEPENDS_ON")).emitAll()` |
| "Search everything about 'API design'" | `readBatch { vectorSearch(Memory), vectorSearch(Knowledge), textSearch(Event) }` |
| "What workflows depend on workflow Y?" | `n(workflowYId).in("DEPENDS_ON")` |

---

## 10. Architecture Decision Records

### ADR-1: One `Memory` Label with `kind` Discriminator

**Decision:** Use one `Memory` node label with a `kind` property (`stm`, `ltm`, `episodic`, `semantic`, `working`) instead of separate labels per memory type.

**Rationale:** All memory types share ~80% of the same schema (id, workspaceId, content, embedding, tags, timestamps). A single label simplifies:
- One vector index for all memories (vs. one per type)
- One text index for all memories
- Cross-kind queries ("find all memories about X regardless of type")
- Uniform policy enforcement

The `kind` equality index makes filtering by type O(1).

### ADR-2: Embedding Stored as `float[]` Property

**Decision:** Store the embedding vector as a native `f32[]` property on `Memory` and `Knowledge` nodes.

**Rationale:** HelixDB natively supports `float[]` as a property type and `nodeVector` indexes on `float[]` properties. This co-locates the vector data with the graph data, avoiding a separate vector database (Pinecone, Chroma, pgvector) and the operational complexity of keeping two stores in sync.

### ADR-3: Workflow Runtime Stays In-Memory

**Decision:** The workflow engine's `GraphMirror` (DAG for execution ordering) remains in TypeScript. HelixDB stores workflow *snapshots* for analysis only.

**Rationale:** The workflow engine needs sub-millisecond state transitions (pending→ready→running→succeeded). Each state change in a large workflow may touch dozens of nodes per tick. Round-tripping through HTTP to HelixDB for every state transition would add unacceptable latency (2–10ms per call). The HelixDB graph is for *analysis* ("what depends on what?") and *persistence* ("recover this run's graph after restart"), not for runtime execution.

### ADR-4: Causal Edges Are Child→Parent

**Decision:** `CAUSED_BY` edges point FROM the child (effect) event TO the parent (cause) event.

**Rationale:** The most common causal query pattern is "walk back from this failure to find the root cause." This translates to `repeat(in("CAUSED_BY"))` — clean and intuitive. The reverse direction ("what happened after this event?") is less common and can be served by `out("CAUSED_BY")` or `out("HAS_EVENT")` from the session.

### ADR-5: Row-Level Tenant Isolation

**Decision:** Each Eulinx `workspaceId` maps to a HelixDB row-level tenant, identified by the `workspaceId` property on every node.

**Rationale:** Row-level isolation is:
- **Simplest to implement** — just add `eq("workspaceId", wsId)` to every query
- **Most resource-efficient** — all tenants share the same server infrastructure
- **Zero-provisioning** — adding a new workspace is just writing a node with a new workspaceId
- **Supported by HelixDB's tenant-partitioned indexes** — search indexes are automatically partitioned per tenant, keeping working sets isolated

If a workspace later needs stricter isolation (regulatory compliance, dedicated resources), HelixDB supports namespace-level and infrastructure-level partitioning without schema changes.

### ADR-6: Config-Flag Gating

**Decision:** All HelixDB integration is gated behind `config.helixdb.enabled: boolean` (default `false`).

**Rationale:** This allows:
- Gradual rollout per workspace or per deployment
- Zero-risk fallback to in-memory mode if HelixDB is unavailable
- Separate testing: run existing tests against in-memory, new tests against HelixDB
- No breaking changes for existing users

### ADR-7: TypeScript SDK Over Rust SDK

**Decision:** Use the TypeScript SDK (`@helix-db/helix-db`) for all HelixDB communication, not the Rust SDK.

**Rationale:** All business logic that communicates with HelixDB lives in TypeScript (MemoryManager, KnowledgeBase, EventBus, PersistenceService, SessionManager). Using the TypeScript SDK keeps the integration path consistent with the rest of the codebase. The Rust layer (Tauri commands) handles only native OS capabilities and doesn't need direct HelixDB access.

### ADR-8: Visualizations Use Existing Rendering Libraries

**Decision:** Use React Flow (already in the project) for graph visualizations, and a lightweight charting library for dashboards.

**Rationale:** Adding a new rendering framework (D3, Three.js) would increase bundle size and learning curve. React Flow already handles node-edge graph rendering for the workflow node graph — it can render Memory and Knowledge graphs with the same component infrastructure. For the Vector Explorer (WebGL scatter plot), a focused library like deck.gl or regl-scatterplot is acceptable since no existing library covers that use case.

---

## Appendix: Quick Reference

### Label Constants

```
LABEL_MEMORY      = "Memory"
LABEL_KNOWLEDGE   = "Knowledge"
LABEL_EVENT       = "Event"
LABEL_SESSION     = "Session"
LABEL_WORKFLOW_RUN  = "WorkflowRun"
LABEL_NODE_STATE     = "NodeState"
LABEL_WORKER_STATE   = "WorkerState"
LABEL_RUN_CONTEXT    = "RunContext"
LABEL_ARTIFACT       = "Artifact"
LABEL_PROMPT         = "Prompt"
LABEL_SNAPSHOT       = "Snapshot"
LABEL_PROVIDER_STATE = "ProviderState"
```

### Edge Constants

```
EDGE_HAS_EVENT      = "HAS_EVENT"
EDGE_CAUSED_BY      = "CAUSED_BY"
EDGE_CORRELATED_WITH = "CORRELATED_WITH"
EDGE_HAS_MEMORY     = "HAS_MEMORY"
EDGE_HAS_WORKER     = "HAS_WORKER"
EDGE_HAS_NODE       = "HAS_NODE"
EDGE_HAS_ARTIFACT   = "HAS_ARTIFACT"
EDGE_HAS_SNAPSHOT   = "HAS_SNAPSHOT"
EDGE_RELATES_TO     = "RELATES_TO"
EDGE_REFERENCES     = "REFERENCES"
EDGE_DERIVED_FROM   = "DERIVED_FROM"
EDGE_BRANCHED_FROM  = "BRANCHED_FROM"
EDGE_DEPENDS_ON     = "DEPENDS_ON"
```

### Index Summary (30 total)

| Count | Type | Target |
|---|---|---|
| 10 | Equality (workspaceId) | All labels |
| 2 | Vector (embedding, tenant partitioned) | Memory, Knowledge |
| 2 | Text (content/chunkText, tenant partitioned) | Memory, Knowledge |
| 10 | Equality (query fields) | kind, sessionId, workerId, executionId, correlationId, type, state, workflowId, status, runId, sourceType |
| 6 | Range (timestamps) | Memory.createdAt, Event.emittedAt, Session.createdAt, WorkflowRun.createdAt, Memory.createdAt (Knowledge equivalent), Knowledge.createdAt |

### Config Defaults

```typescript
config = {
  helixdb: {
    enabled: false,
    host: "127.0.0.1",
    port: 9743,
    timeout: 30000,
    retryAttempts: 3,
  },
  memory: {
    backend: "memory",  // "memory" | "helixdb"
    ...
  },
  persistence: {
    backend: "memory",  // "memory" | "helixdb"
    ...
  }
}
```

---

*End of document.*
