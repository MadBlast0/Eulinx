---
title: MCPNodes Specification - Part 02
status: draft
version: 1.0
tags:
  - workflow-engine
  - mcp-nodes
  - architecture
related:
  - "[[MCPNodes-Part01]]"
  - "[[MCPNodes-Part03]]"
  - "[[MCPIntegration-Part01]]"
  - "[[ProcessLifecycle-Part01]]"
  - "[[PermissionManager-Part01]]"
---

# MCPNodes Specification (Part 02)

Server discovery, the connection lifecycle, and the two transports.

# 01 The Server Record

A `serverId` in `MCPNodeConfig` resolves to exactly one `MCPServerRecord`. The record is owned by the plugin system and stored in SQLite; MCPNodes reads it and never writes it. Registration, install, and the user-facing server manager are [[MCPIntegration-Part01]].

```ts
type MCPServerRecord = {
  serverId: string;
  displayName: string;
  transport: MCPStdioTransportConfig | MCPHttpTransportConfig;

  declaredProtocolVersion: string;
  negotiatedProtocolVersion?: string;

  sandbox: MCPSandboxConfig;
  auth?: MCPAuthBinding;

  connectTimeoutMs: number;
  handshakeTimeoutMs: number;
  idleDisconnectMs: number;
  maxConcurrentCalls: number;

  enabled: boolean;
  installedAt: string;
  lastConnectedAt?: string;
  lastError?: MCPErrorRecord;
};
```

Rules:

- MCPNodes MUST NOT connect to a record with `enabled: false`. Fail with `server_disabled`.
- MCPNodes MUST NOT connect to a `serverId` with no record. Fail with `server_not_found`.
- `connectTimeoutMs`, `handshakeTimeoutMs`, and `maxConcurrentCalls` MUST all be present and greater than zero. A record failing this fails with `server_record_invalid`. There is no default that means "unbounded".

# 02 Discovery

Discovery is the act of turning the set of installed servers into a set of usable tool contracts. It runs at three moments and no others.

```text
1. Workflow validation   - before a workflow is allowed to run at all
2. Node authoring        - when a user drags an MCP node onto the graph
3. Explicit refresh      - when a user clicks refresh in the server manager
```

Discovery MUST NOT run implicitly at invocation time. An MCP Node that reaches `verifying` and discovers that it has never listed this server's tools is a bug in workflow validation, and it fails with `schema_not_imported`.

Numbered discovery algorithm:

```text
 1. Read all MCPServerRecord rows where enabled = true.
 2. For each record, in serverId lexical order:
 3.   Check PermissionManager for key "mcp.server.connect" scoped to the workspace.
 4.   If denied, record permission_denied for this server and continue to the next.
 5.   Open the transport per section 04 (stdio) or section 05 (HTTP).
 6.   If the transport fails to open, record the error and continue. Do not abort discovery.
 7.   Perform the handshake per section 03.
 8.   If the handshake fails, disconnect, record the error, continue.
 9.   Send "tools/list". Await response within handshakeTimeoutMs.
10.   For each returned tool, run the Part 03 import algorithm.
11.   Store the resulting MCPToolContract rows keyed by (serverId, toolName).
12.   Emit mcp.server.discovered with the tool count. Never with the tool schemas.
13.   If idleDisconnectMs is 0, disconnect now. Otherwise leave the connection warm.
14. Return the aggregate DiscoveryReport.
```

```ts
type DiscoveryReport = {
  scannedServers: number;
  connectedServers: number;
  importedTools: number;
  unmappableTools: { serverId: string; toolName: string; error: MCPErrorKind }[];
  failedServers: { serverId: string; error: MCPErrorKind; message: string }[];
  at: string;
};
```

Discovery MUST be fault-isolating. One server that hangs its handshake MUST NOT prevent the other twelve from being discovered. Step 6 and step 8 both say `continue` for exactly this reason. An implementer who writes discovery as a single `for` loop with a `?` propagation operator has made one broken server break the whole app.

# 03 The Connection Lifecycle

The connection is a state machine independent of any node. Many nodes share one connection.

```text
disconnected  no transport, no process
opening       transport being established
handshaking   initialize request sent, awaiting result
ready         handshake complete, calls permitted
draining      no new calls accepted, in-flight calls finishing
closing       transport being torn down
faulted       terminal error, requires explicit reset
```

Transitions:

```text
disconnected -> opening       connect requested
opening      -> handshaking   transport open
opening      -> faulted       spawn_failure, connect_timeout, tls_error, dns_failure
handshaking  -> ready         handshake_ok
handshaking  -> faulted       handshake_timeout, protocol_version_mismatch,
                              malformed_response
ready        -> draining      idle timer fired, or shutdown requested
ready        -> faulted       transport_closed_mid_call, process_exited
draining     -> closing       in-flight count reached zero
draining     -> closing       drain deadline exceeded (in-flight calls are failed)
closing      -> disconnected  teardown complete
faulted      -> disconnected  explicit reset only
```

Rules:

- A call MUST only be sent in state `ready`.
- `faulted` MUST NOT auto-transition to `opening`. A faulted server is reset by the retry policy in Part 04, which constructs a fresh connection object. This prevents a crash-looping server from being respawned in a tight loop forever.
- Reaching `ready` MUST NOT grant any permission. Connection state and permission state are orthogonal. A warm connection re-checks the PermissionManager on every single call.
- `maxConcurrentCalls` is enforced at `ready`. Exceeding it queues the caller; the queue is FIFO and bounded at 64. A full queue fails the node with `server_saturated`.

## The Handshake

```text
1. Send "initialize" with:
     protocolVersion:  Eulinx's supported version string
     capabilities:     { tools: {} }   (Eulinx consumes tools only at this layer)
     clientInfo:       { name: "Eulinx", version: <app version> }
2. Arm a timer for handshakeTimeoutMs.
3. If the timer fires before a response, kill the transport.
     stdio: SIGKILL the process group via ProcessLifecycle.
     HTTP:  abort the request.
   Fail with handshake_timeout. State -> faulted.
4. On response, read result.protocolVersion.
5. If the server's protocolVersion is not in Eulinx's supported set,
     disconnect and fail with protocol_version_mismatch. Do NOT proceed.
6. If result.capabilities.tools is absent, disconnect and fail with
     server_has_no_tools. An MCP server with no tools capability is useless to an MCP Node.
7. Store negotiatedProtocolVersion on the record.
8. Send "notifications/initialized".
9. State -> ready.
```

Step 5 is a MUST NOT-proceed, not a warning. A version mismatch means the wire format may differ in ways that make a `tools/call` mean something other than what Eulinx intended. Fail closed.

# 04 The stdio Transport

The server is a child process. Eulinx writes JSON-RPC to its stdin and reads from its stdout. Its stderr is captured as diagnostic text and is NEVER parsed as protocol.

```ts
type MCPStdioTransportConfig = {
  kind: "stdio";
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string | MCPSecretRef>;
  inheritParentEnv: false;
  encoding: "utf8";
  maxLineBytes: number;
  stderrCaptureBytes: number;
  killGracePeriodMs: number;
};

type MCPSecretRef = {
  kind: "secretRef";
  ref: string;
};

type MCPSandboxConfig = {
  enabled: true;
  rootPath: string;
  allowedReadPaths: string[];
  allowedWritePaths: string[];
  networkPolicy: "deny" | "allowlist";
  networkAllowlist: string[];
  maxMemoryBytes: number;
  maxCpuPercent: number;
  maxChildProcesses: number;
};
```

Rules for stdio:

- `inheritParentEnv` is typed as the literal `false`. A child MUST NOT inherit Eulinx's environment. Eulinx's environment contains the user's shell exports, cloud credentials, and provider API keys. Handing that wholesale to a downloaded binary is the single worst thing this specification could permit.
- `env` values that are `MCPSecretRef` are resolved at spawn time inside the runtime and written directly into the child's environment block. The resolved value MUST NOT be logged, and the `env` map as persisted MUST contain only the ref.
- `sandbox.enabled` is typed as the literal `true`. There is no unsandboxed stdio server.
- The process MUST be spawned in its own process group so that kill reaches its children. A server that spawns a subprocess and exits leaves an orphan otherwise. See [[ProcessLifecycle-Part01]].
- Kill is two-phase: SIGTERM, wait `killGracePeriodMs`, then SIGKILL the group. On Windows, `TerminateProcess` on the job object.
- A stdout line longer than `maxLineBytes` fails with `response_too_large` and faults the connection. A malicious server can otherwise stream until Eulinx's heap is gone.
- stderr is read continuously into a ring buffer of `stderrCaptureBytes`. It MUST be read continuously even when Eulinx does not care about it, because a full stderr pipe blocks the child forever and looks exactly like a hang.

## stdio Failure Modes

```text
spawn_failure          command not found, not executable, cwd missing,
                       sandbox root unavailable. Detected at spawn. Fast, deterministic.
process_exited         child died. Exit code and stderr tail are available.
                       This is the stdio-specific fault: a crashed server is UNAMBIGUOUS.
stdout_closed          pipe closed with process still alive. Server is hung or broke its
                       own plumbing. Treated as transport_closed_mid_call.
stdout_garbage         non-JSON on stdout. Almost always a server printing a banner or a
                       debug line. Fail with malformed_response. Do NOT try to skip
                       non-JSON lines and resynchronize; that turns a broken server into a
                       silently-wrong server.
child_hang             process alive, no output, timer fires. Requires the two-phase kill.
resource_exceeded      sandbox cgroup or job object limit hit.
```

The defining property of stdio is that **failure is local and observable**. Eulinx owns the process. If it dies, Eulinx knows immediately and gets an exit code and stderr. If it hangs, Eulinx can kill it with certainty. There is no ambiguity about whether the call was received.

# 05 The HTTP Transport

The server is a remote endpoint speaking JSON-RPC over HTTP POST, with optional Server-Sent Events for server-initiated messages.

```ts
type MCPHttpTransportConfig = {
  kind: "http";
  endpointUrl: string;
  requireTls: true;
  headers: Record<string, string | MCPSecretRef>;
  auth?: MCPAuthBinding;

  connectTimeoutMs: number;
  requestTimeoutMs: number;
  maxResponseBytes: number;

  useSse: boolean;
  sseReconnectMs: number;
  sseMaxReconnects: number;

  followRedirects: false;
  proxyUrl?: string;
  tlsPinnedSha256?: string[];
};
```

Rules for HTTP:

- `requireTls` is typed as the literal `true`. `http://` endpoints are rejected at record validation with `insecure_endpoint`. The single exception a user may configure is `http://127.0.0.1` and `http://localhost`, which MUST be checked by parsed host, never by string prefix, because `http://localhost.evil.com` starts with `http://localhost`.
- `followRedirects` is typed as the literal `false`. A redirect can move a request carrying a bearer token to a host the user never approved. A 3xx response fails with `unexpected_redirect`.
- `headers` values that are `MCPSecretRef` resolve at request time, inside the runtime. The persisted header map holds only refs.
- A response body exceeding `maxResponseBytes` is aborted mid-stream and fails with `response_too_large`. The check MUST be on bytes read, not on `Content-Length`, because `Content-Length` is attacker-supplied.
- If `tlsPinnedSha256` is non-empty, the leaf certificate's SHA-256 MUST match one entry or the connection fails with `tls_pin_mismatch`.

## HTTP Failure Modes

```text
dns_failure            endpoint host does not resolve.
connect_timeout        TCP or TLS handshake did not complete in connectTimeoutMs.
tls_error              certificate invalid, expired, or untrusted.
tls_pin_mismatch       pinning configured and the leaf did not match.
insecure_endpoint      non-TLS endpoint that is not a parsed-host loopback.
unexpected_redirect    3xx received.
http_status_error      4xx or 5xx. 401/403 map to auth_expired. 429 maps to rate_limited.
                       Other 4xx map to protocol_error. 5xx map to server_error.
request_timeout        no response within requestTimeoutMs.
transport_closed_mid_call  connection reset after the request was sent.
sse_disconnected       event stream dropped. Reconnect up to sseMaxReconnects, then fault.
```

The defining property of HTTP is that **failure is remote and ambiguous**. This is the crucial difference from stdio and it drives the whole retry policy in Part 04:

```text
stdio timeout:  Eulinx kills the process. The call is definitively over.
                Nothing further will happen. Retry is safe if the tool is idempotent,
                and the only risk is the work the tool already did before the kill.

HTTP timeout:   Eulinx gave up waiting. The server MAY still be executing the call.
                It may complete. It may complete twice if Eulinx retries.
                Eulinx CANNOT know. There is no kill.

Therefore: an HTTP invocation that times out MUST NOT be retried unless
invocation.idempotent is true. A stdio invocation that times out MUST NOT be
retried unless invocation.idempotent is true either, but for the weaker reason
that partial side effects may already exist on disk.
```

Comparison table an implementer should keep in view:

```text
                        stdio                      HTTP
process ownership       Eulinx owns it                Eulinx owns nothing
kill available          yes, SIGKILL group         no, only local abort
crash detection         exit code, immediate       none, only silence
diagnostic channel      stderr ring buffer         HTTP status + body
call-received ambiguity none                       total
sandbox applies         yes, mandatory             not applicable (remote)
network policy applies  yes, via sandbox           endpoint allowlist only
secret exposure surface child env block            request headers
timeout meaning         "it is dead"               "we stopped listening"
```

# 06 Connection Reuse

A connection MAY be shared by every MCP Node bound to the same `serverId` within a workspace.

```text
1. Node reaches connecting. Look up the connection pool by serverId.
2. If a connection exists in state ready, use it. Go to step 7.
3. If a connection exists in state faulted, do NOT use it and do NOT reset it here.
   Fail the node with server_faulted. The retry policy in Part 04 owns resets.
4. If a connection exists in state opening or handshaking, await it up to
   connectTimeoutMs, then fail with connect_timeout.
5. If no connection exists, create one and run sections 03 to 05.
6. On failure, fault it and fail the node.
7. Increment the connection's in-flight count. If it would exceed maxConcurrentCalls,
   enqueue FIFO, bounded at 64; on a full queue fail with server_saturated.
8. Reset the idle timer to idleDisconnectMs.
```

Reuse rules:

- A pooled connection MUST be keyed by `(workspaceId, serverId)`, never by `serverId` alone. Two workspaces MUST NOT share a server process, because the sandbox root differs and cross-workspace data would flow through one process.
- Reuse MUST NOT carry permission decisions. Every node gates independently.
- Reuse MUST NOT carry resolved secrets. Secrets resolve per call, per Part 04.
- An idle connection MUST be dropped after `idleDisconnectMs`. An MCP server left running forever is a background process on the user's machine that the user did not knowingly consent to.

# Related Documents

- [[MCPNodes-Part01]]
- [[MCPNodes-Part03]]
- [[MCPNodes-Part04]]
- [[MCPNodes-Diagrams]]
- [[MCPIntegration-Part01]]
- [[ProcessLifecycle-Part01]]
- [[PermissionManager-Part01]]
- [[WorkerSandbox-Part01]]
- [[EventBus-Part01]]
