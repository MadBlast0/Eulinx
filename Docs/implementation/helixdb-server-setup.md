# HelixDB Server Setup

Comprehensive instructions for running HelixDB as a local sidecar, Docker container, or cloud instance, plus Tauri integration and Eulinx configuration.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Docker Setup](#3-docker-setup)
4. [Native Install](#4-native-install)
5. [Cloud](#5-cloud)
6. [Tauri Integration](#6-tauri-integration)
7. [Browser / Web Mode](#7-browser--web-mode)
8. [Configuration](#8-configuration)
9. [Schema Migration](#9-schema-migration)
10. [Troubleshooting](#10-troubleshooting)
11. [Data Model Quick Reference](#11-data-model-quick-reference)

---

## 1. Overview

HelixDB is an OLTP graph-vector database written in Rust (Apache 2.0, YC-backed). It combines labeled property graphs, approximate nearest-neighbor (ANN) vector indexes, and BM25 full-text search in a single engine, queryable over HTTP.

### Why Eulinx Needs It

Every memory, knowledge, event, session, and state system in Eulinx currently lives in in-memory `Map<string, ...>` objects. Data vanishes on page refresh or process restart. Vector search is O(n) brute-force cosine similarity in JavaScript. There is no full-text search, no graph traversal, no causal tracing, no ACID persistence.

HelixDB replaces all of this with:

| Capability | What It Means for Eulinx |
|---|---|
| Labeled property graph | 12 node types, 13 edge types model the full data model |
| ANN vector search | Semantic search over memories and knowledge at O(log n) |
| BM25 full-text search | Keyword search with relevance ranking |
| ACID transactions | Atomic batch writes for session + event + memory state |
| Multi-tenancy | Every workspace is an isolated tenant via `workspaceId` |
| Graph traversal | Causal tracing, session timelines, dependency analysis |

The integration is gated behind `config.helixdb.enabled` (default `false`). When disabled, all systems use current in-memory implementations — zero breaking changes.

---

## 2. Prerequisites

| Requirement | Version / Notes |
|---|---|
| HelixDB | v3.0.8+ |
| Default HTTP API port | `9743` |
| Docker (optional) | v20.10+ for container deployment |
| Node.js | v18+ (for the TypeScript SDK) |
| pnpm | v9+ (Eulinx package manager) |

### Verify Your HelixDB Version

```bash
helixdb --version
# Expected: helixdb 3.0.8 or later
```

---

## 3. Docker Setup

### Quick Start

```bash
docker run -d \
  --name helixdb \
  -p 9743:9743 \
  -v helixdb-data:/data \
  helixdb/helixdb:latest \
  --host 0.0.0.0 \
  --port 9743
```

### Volume Mounts

| Mount | Host Path | Container Path | Purpose |
|---|---|---|---|
| Data | Named volume `helixdb-data` | `/data` | Persistent graph data, indexes |
| Config (optional) | `./helixdb.conf` | `/etc/helixdb/config.toml` | Custom server configuration |
| Logs (optional) | `./logs` | `/var/log/helixdb` | Server log files |

### Docker Compose

```yaml
version: "3.8"

services:
  helixdb:
    image: helixdb/helixdb:latest
    container_name: helixdb
    ports:
      - "9743:9743"
    volumes:
      - helixdb-data:/data
    command: --host 0.0.0.0 --port 9743
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9743/v1/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 15s
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2"

volumes:
  helixdb-data:
    driver: local
```

### Useful Docker Commands

```bash
# Start the container
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f helixdb

# Restart after config change
docker compose restart helixdb

# Stop and remove
docker compose down

# Stop and remove data (destructive!)
docker compose down -v
```

### Health Check

```bash
curl http://127.0.0.1:9743/v1/health
# Expected: { "status": "ok" }
```

---

## 4. Native Install

### Download Pre-built Binary

Download the latest release from the [HelixDB GitHub releases](https://github.com/helixdb/helixdb/releases) page for your platform.

### Platform-Specific

#### macOS

```bash
# Apple Silicon (arm64)
curl -L https://github.com/helixdb/helixdb/releases/latest/download/helixdb-darwin-arm64 -o /usr/local/bin/helixdb
chmod +x /usr/local/bin/helixdb

# Intel (x64)
curl -L https://github.com/helixdb/helixdb/releases/latest/download/helixdb-darwin-x64 -o /usr/local/bin/helixdb
chmod +x /usr/local/bin/helixdb

# Start
helixdb --host 127.0.0.1 --port 9743
```

#### Linux

```bash
# x64
curl -L https://github.com/helixdb/helixdb/releases/latest/download/helixdb-linux-x64 -o /usr/local/bin/helixdb
chmod +x /usr/local/bin/helixdb

# ARM64
curl -L https://github.com/helixdb/helixdb/releases/latest/download/helixdb-linux-arm64 -o /usr/local/bin/helixdb
chmod +x /usr/local/bin/helixdb

# Start
helixdb --host 127.0.0.1 --port 9743
```

#### Windows

```powershell
# Download from releases page, extract, and add to PATH
# Or use PowerShell:
Invoke-WebRequest -Uri "https://github.com/helixdb/helixdb/releases/latest/download/helixdb-windows-x64.exe" -OutFile "helixdb.exe"

# Start
.\helixdb.exe --host 127.0.0.1 --port 9743
```

### Build from Source

```bash
git clone https://github.com/helixdb/helixdb.git
cd helixdb
cargo build --release

# Binary at: target/release/helixdb
./target/release/helixdb --host 127.0.0.1 --port 9743
```

### Run as Background Service (Linux)

Create a systemd unit file:

```ini
# /etc/systemd/system/helixdb.service
[Unit]
Description=HelixDB Graph-Vector Database
After=network.target

[Service]
Type=simple
User=helixdb
Group=helixdb
ExecStart=/usr/local/bin/helixdb --host 127.0.0.1 --port 9743
WorkingDirectory=/var/lib/helixdb
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/helixdb /var/log/helixdb

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable helixdb
sudo systemctl start helixdb

# Check status
sudo systemctl status helixdb

# View logs
sudo journalctl -u helixdb -f
```

### Run as Background Service (macOS with launchd)

```xml
<!-- ~/Library/LaunchAgents/com.helixdb.server.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.helixdb.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/helixdb</string>
        <string>--host</string>
        <string>127.0.0.1</string>
        <string>--port</string>
        <string>9743</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/helixdb.stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/helixdb.stderr.log</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.helixdb.server.plist
launchctl start com.helixdb.server
```

---

## 5. Cloud

### HelixDB Cloud (if available)

1. Sign up at the HelixDB Cloud dashboard
2. Create a new project/workspace
3. Note the connection URL, API key, and TLS certificate

### Configure Eulinx for Cloud

```typescript
// src/core/config.ts or via environment variables
helixdb: {
  enabled: true,
  host: "your-project.helixdb.cloud",
  port: 443,
  tls: true,
  apiKey: process.env.EULINX_HELIXDB_API_KEY,
  timeout: 30_000,
  retryAttempts: 3,
}
```

### Environment Variables for Cloud

```bash
export EULINX_HELIXDB_ENABLED=true
export EULINX_HELIXDB_HOST="your-project.helixdb.cloud"
export EULINX_HELIXDB_PORT=443
export EULINX_HELIXDB_API_KEY="hxdb_sk_your_api_key_here"
export EULINX_HELIXDB_TLS=true
```

### TLS Configuration

For self-managed instances with TLS:

```typescript
helixdb: {
  enabled: true,
  host: "helixdb.internal.company.com",
  port: 443,
  tls: true,
  tlsCertPath: "/path/to/ca-cert.pem",  // optional custom CA
  timeout: 30_000,
}
```

> **Note:** Cloud instances typically use HTTPS on port 443. The `HelixDBClient`
> constructs the URL as `http://{host}:{port}` by default. When `tls: true` is
> set, it upgrades to `https://{host}:{port}`.

---

## 6. Tauri Integration

Eulinx bundles HelixDB as a Tauri sidecar — a companion binary that starts automatically with the app.

### Sidecar Bundling

Place the HelixDB binary in the Tauri sidecar directory:

```
src-tauri/
  binaries/
    helixdb-x86_64-pc-windows-msvc.exe    (Windows)
    helixdb-x86_64-unknown-linux-gnu       (Linux)
    helixdb-aarch64-apple-darwin            (macOS ARM)
    helixdb-x86_64-apple-darwin             (macOS Intel)
```

Register the sidecar in `tauri.conf.json`:

```json
{
  "bundle": {
    "externalBin": [
      "binaries/helixdb"
    ]
  }
}
```

### Tauri Command for Sidecar Lifecycle

In `src-tauri/src/lib.rs`:

```rust
use tauri::api::process::{Command, CommandChild, Sidecar};
use std::sync::Mutex;

struct HelixDbState {
    child: Mutex<Option<CommandChild>>,
}

#[tauri::command]
fn start_helixdb(app: tauri::AppHandle) -> Result<String, String> {
    let sidecar = app.shell().sidecar("helixdb").map_err(|e| e.to_string())?;
    let (mut rx, child) = sidecar
        .args(["--host", "127.0.0.1", "--port", "9743"])
        .spawn()
        .map_err(|e| e.to_string())?;

    // Store child handle for graceful shutdown
    let state = app.state::<HelixDbState>();
    *state.child.lock().unwrap() = Some(child);

    Ok("HelixDB started".to_string())
}

#[tauri::command]
fn stop_helixdb(app: tauri::AppHandle) -> Result<String, String> {
    let state = app.state::<HelixDbState>();
    if let Some(child) = state.child.lock().unwrap().take() {
        child.kill().map_err(|e| e.to_string())?;
        Ok("HelixDB stopped".to_string())
    } else {
        Ok("HelixDB not running".to_string())
    }
}
```

### Auto-Start on App Launch

In the Tauri setup hook:

```rust
fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    // Start HelixDB sidecar if enabled in config
    let config = load_config(app.path_resolver())?;
    if config.helixdb.enabled {
        let handle = app.handle();
        tauri::async_runtime::spawn(async move {
            let sidecar = handle.shell().sidecar("helixdb").unwrap();
            let (rx, child) = sidecar
                .args(["--host", "127.0.0.1", "--port", "9743"])
                .spawn()
                .expect("Failed to start HelixDB sidecar");

            let state = handle.state::<HelixDbState>();
            *state.child.lock().unwrap() = Some(child);
        });
    }
    Ok(())
}
```

### Health Check (from TypeScript)

```typescript
import { invoke } from "@tauri-apps/api/tauri";

async function waitForHelixDB(maxRetries = 30, intervalMs = 1000): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch("http://127.0.0.1:9743/v1/health");
      if (response.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
```

### Graceful Shutdown

On app close, the sidecar is killed automatically by Tauri. For explicit cleanup:

```typescript
import { appWindow } from "@tauri-apps/api/window";

appWindow.onCloseRequested(async () => {
  await invoke("stop_helixdb");
});
```

---

## 7. Browser / Web Mode

When running Eulinx in a browser (not as a Tauri desktop app), HelixDB must be accessible externally — it cannot be a local sidecar.

### External Server Setup

1. Run HelixDB on a server accessible from the browser (cloud instance, VPS, or local network)
2. Configure Eulinx to point to the external server:

```typescript
helixdb: {
  enabled: true,
  host: "helixdb.your-server.com",
  port: 9743,
  timeout: 30_000,
}
```

### CORS Configuration

HelixDB must allow cross-origin requests from the Eulinx web app. Configure the server:

```bash
# HelixDB CORS flags (if supported)
helixdb \
  --host 0.0.0.0 \
  --port 9743 \
  --cors-origins "http://localhost:5173,https://eulinx.your-domain.com"
```

If HelixDB does not natively support CORS, use a reverse proxy:

```nginx
# nginx.conf
server {
    listen 9743;
    server_name helixdb.your-server.com;

    location / {
        # CORS headers
        add_header Access-Control-Allow-Origin "https://eulinx.your-domain.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

        if ($request_method = OPTIONS) {
            return 204;
        }

        proxy_pass http://127.0.0.1:9743;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Connection Verification

```typescript
// Test from browser console
fetch("http://helixdb.your-server.com:9743/v1/health")
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
```

### Limitations

- No sidecar auto-start in browser mode (server must be pre-running)
- No automatic health check polling (implement in the adapter layer)
- Latency is higher than localhost — increase `timeout` accordingly
- Consider enabling TLS for production deployments

---

## 8. Configuration

### Eulinx Config Options

The full configuration lives in `src/core/config.ts`:

```typescript
config = {
  helixdb: {
    enabled: false,        // Gate: false = in-memory, true = HelixDB
    host: "127.0.0.1",     // Server hostname
    port: 9743,            // Server port
    timeout: 30_000,       // Request timeout (ms)
    retryAttempts: 3,      // Retry count on transient failures
    tls: false,            // Use HTTPS
    tlsCertPath: undefined,// Custom CA cert path (optional)
    apiKey: undefined,     // API key for cloud instances
  },
  memory: {
    backend: "memory",     // "memory" | "helixdb"
  },
  persistence: {
    backend: "memory",     // "memory" | "helixdb"
  },
}
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `EULINX_HELIXDB_ENABLED` | `false` | Enable HelixDB backend |
| `EULINX_HELIXDB_HOST` | `127.0.0.1` | Server hostname |
| `EULINX_HELIXDB_PORT` | `9743` | Server port |
| `EULINX_HELIXDB_TIMEOUT` | `30000` | Request timeout (ms) |
| `EULINX_HELIXDB_API_KEY` | — | API key for cloud instances |
| `EULINX_HELIXDB_TLS` | `false` | Use HTTPS |
| `EULINX_MEMORY_BACKEND` | `memory` | Memory backend (`memory` or `helixdb`) |
| `EULINX_PERSISTENCE_BACKEND` | `memory` | Persistence backend (`memory` or `helixdb`) |

### Enable/Disable at Runtime

```typescript
// In src/core/config.ts
import { config } from "@/core/config";

// Enable HelixDB
config.helixdb.enabled = true;
config.memory.backend = "helixdb";
config.persistence.backend = "helixdb";

// Disable (fallback to in-memory)
config.helixdb.enabled = false;
config.memory.backend = "memory";
config.persistence.backend = "memory";
```

> **Note:** Changing `enabled` at runtime requires restarting the affected
> subsystems (MemoryManager, PersistenceService, EventBus) to swap adapters.

---

## 9. Schema Migration

Schema migration creates all 30 indexes required by Eulinx's data model. It is idempotent — safe to run multiple times.

### When Migration Runs

- **Automatically:** On app startup when `helixdb.enabled: true`
- **Manually:** Via the CLI or programmatic API

### Programmatic Migration

```typescript
import { HelixDBClient } from "@/integrations/helixdb";
import { migrateSchema } from "@/integrations/helixdb";

const client = new HelixDBClient({
  enabled: true,
  host: "127.0.0.1",
  port: 9743,
  timeout: 30_000,
});

await client.connect();
const result = await migrateSchema(client);

console.log(result);
// { ok: true, value: { success: true, indexesCreated: 30, errors: [] } }
```

### Running Again (Idempotency)

```typescript
// Running migration a second time produces no errors
const result2 = await migrateSchema(client);
// { ok: true, value: { success: true, indexesCreated: 0, errors: [] } }
```

### CLI Migration

```bash
pnpm helixdb migrate --host 127.0.0.1 --port 9743
```

### What Gets Created

The migration batch creates **30 indexes** in a single atomic write:

| Count | Type | Target |
|---|---|---|
| 2 | Vector (tenant-partitioned) | `Memory.embedding`, `Knowledge.embedding` |
| 2 | Text (tenant-partitioned) | `Memory.content`, `Knowledge.chunkText` |
| 10 | Equality (`workspaceId`) | All 10 node labels |
| 10 | Equality (query fields) | `kind`, `sessionId`, `workerId`, `executionId`, `correlationId`, `type`, `state`, `workflowId`, `status`, `runId`, `sourceType` |
| 6 | Range (timestamps) | `Memory.createdAt`, `Event.emittedAt`, `Session.createdAt`, `WorkflowRun.createdAt`, `Knowledge.createdAt` |

### Migration Script Structure

```
WriteBatch {
  // Tenant-partitioned vector indexes
  idx_vector_memory:    createIndexIfNotExists(nodeVector("Memory", "embedding", "workspaceId"))
  idx_vector_knowledge: createIndexIfNotExists(nodeVector("Knowledge", "embedding", "workspaceId"))

  // Tenant-partitioned text indexes
  idx_text_memory:      createIndexIfNotExists(nodeText("Memory", "content", "workspaceId"))
  idx_text_knowledge:   createIndexIfNotExists(nodeText("Knowledge", "chunkText", "workspaceId"))

  // Equality indexes on workspaceId (all labels)
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

  // Range indexes
  range_memory_created: createIndexIfNotExists(nodeRange("Memory", "createdAt"))
  range_event_emitted:  createIndexIfNotExists(nodeRange("Event", "emittedAt"))
  range_session_created:createIndexIfNotExists(nodeRange("Session", "createdAt"))
  range_workflow_created:createIndexIfNotExists(nodeRange("WorkflowRun", "createdAt"))
}
```

---

## 10. Troubleshooting

### Connection Refused

```bash
# 1. Verify HelixDB is running
curl http://127.0.0.1:9743/v1/health

# 2. Check if port is in use
netstat -tlnp | grep 9743   # Linux
lsof -i :9743               # macOS

# 3. Check firewall rules (Docker)
docker exec helixdb curl -f http://localhost:9743/v1/health

# 4. Verify Docker container is running
docker ps | grep helixdb
```

### Timeout Errors

- Increase `timeout` in config (default: 30s; for large migrations, try 60s)
- Check network latency: `ping 127.0.0.1` or `curl -w "%{time_total}" http://127.0.0.1:9743/v1/health`
- For Docker, ensure container is healthy: `docker inspect --format='{{.State.Health.Status}}' helixdb`
- Check server resource usage: `docker stats helixdb`

### Migration Errors

- **Wrong version:** HelixDB v3.0.8+ required. Check with `helixdb --version`
- **Index already exists with different config:** Drop the index first, then re-run migration
- **Disk space:** Vector indexes require significant space. Ensure at least 1GB free per 100K nodes
- **Server logs:** Check `docker compose logs helixdb` or `journalctl -u helixdb` for details

### Performance Tuning

```bash
# Increase file descriptor limit (Linux)
ulimit -n 65536

# Or in systemd unit:
# LimitNOFILE=65536

# Docker: increase shared memory
docker run --shm-size=2g ...

# For large datasets, increase memory limit
docker run -m 4g ...
```

```typescript
// In Eulinx config — increase timeout for large operations
helixdb: {
  timeout: 60_000,  // 60s for bulk operations
  retryAttempts: 5,
}
```

### Vector Search Returns No Results

- Verify embeddings are being stored: check that `embedding` property is not empty
- Confirm the vector index was created: migration must have run successfully
- Check tenant partition: `workspaceId` must match between write and query

### Slow Queries

- Check index coverage: most queries should hit an equality or range index
- Reduce result set size: use `.limit(10)` instead of fetching all results
- Use `readBatch` for multi-variable queries to reduce round trips
- Monitor with: `curl -w "\nTotal: %{time_total}s\n" http://127.0.0.1:9743/v1/query`

---

## 11. Data Model Quick Reference

### Node Labels (12)

| Label | Purpose | Key Properties |
|---|---|---|
| `Memory` | All memory types (STM, LTM, Episodic, Semantic, Working) | `kind`, `content`, `embedding`, `workspaceId` |
| `Knowledge` | Ingested knowledge chunks | `sourceType`, `chunkText`, `embedding`, `workspaceId` |
| `Event` | Persisted event log entries | `type`, `payload`, `emittedAt`, `workspaceId` |
| `Session` | Session metadata and state | `state`, `kind`, `parentSessionId`, `workspaceId` |
| `WorkflowRun` | Workflow execution runs | `status`, `workflowId`, `snapshotId`, `workspaceId` |
| `NodeState` | Per-node execution state within a run | `state`, `attempt`, `runId`, `workspaceId` |
| `WorkerState` | Worker instance state | `status`, `kind`, `model`, `workspaceId` |
| `RunContext` | Workflow run context data | `runId`, `context`, `workspaceId` |
| `Artifact` | File/data artifacts | `kind`, `path`, `checksum`, `workspaceId` |
| `Prompt` | Prompt templates | `name`, `content`, `version`, `workspaceId` |
| `Snapshot` | Graph/state snapshots | `kind`, `label`, `payload`, `workspaceId` |
| `ProviderState` | AI provider configuration | `providerId`, `model`, `baseUrl`, `workspaceId` |

### Edge Labels (13)

| Edge Label | From | To | Properties |
|---|---|---|---|
| `HAS_EVENT` | Session | Event | `sequence` |
| `CAUSED_BY` | Event (child) | Event (parent) | — |
| `CORRELATED_WITH` | Event | Event | `reason` |
| `HAS_MEMORY` | Session | Memory | — |
| `HAS_WORKER` | Session / WorkflowRun | WorkerState | — |
| `HAS_NODE` | WorkflowRun | NodeState | — |
| `HAS_ARTIFACT` | WorkflowRun / Session | Artifact | — |
| `HAS_SNAPSHOT` | Session / WorkflowRun | Snapshot | — |
| `RELATES_TO` | Memory | Memory | `strength`, `relation` |
| `REFERENCES` | Memory | Knowledge | — |
| `DERIVED_FROM` | Memory | Event | — |
| `BRANCHED_FROM` | Session (child) | Session (parent) | `atEventSeq` |
| `DEPENDS_ON` | WorkflowRun (dependent) | WorkflowRun (prerequisite) | — |

### WorkspaceId Tenancy

Every node carries a `workspaceId` property. Every query filters by it. This provides:

- **Data isolation:** Workspace A never sees Workspace B's data
- **Search isolation:** Tenant-partitioned vector and text indexes prevent cross-tenant search leakage
- **Zero provisioning:** Write a node with a new `workspaceId` to create a new tenant
- **Resource sharing:** All tenants share compute, caches, and storage

```typescript
// Every write includes workspaceId
addN("Memory", { workspaceId: "abc_123", content: "...", embedding: [...] })

// Every read filters by workspaceId
nWithLabelWhere("Memory", eq("workspaceId", "abc_123"))
  .where(eq("kind", "stm"))
  .limit(10)

// Vector search is tenant-partitioned
vectorSearchNodes("Memory", "embedding", queryVec, 10, "abc_123")
```

---

*See [helixdb-integration.md](./helixdb-integration.md) for the complete implementation plan, schema details, and phase breakdown.*
