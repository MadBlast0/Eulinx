---
title: WorkerTermination Specification - Part 02
status: draft
version: 1.0
tags:
  - worker-system
  - worker-termination
  - cleanup
related:
  - "[[WorkerTermination-Part01]]"
  - "[[ProcessLifecycle-Part02]]"
---

# WorkerTermination Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Termination Types
Part 02 - Graceful Shutdown, Forced Kill, and Cleanup
Part 03 - Artifacts, Memory, Logs, and Handoff
Part 04 - Failures, Events, UI, and Implementation Checklist

# Graceful Shutdown

Graceful shutdown should be attempted when the Worker is not actively dangerous.

Steps:

```text
stop accepting new commands
notify Worker if possible
allow final summary
collect pending artifact paths
flush terminal output
close owned tool sessions
release locks
terminate process
update state
```

# Forced Kill

Forced kill is used when:

- Worker is stuck
- process ignores graceful stop
- Runtime is shutting down quickly
- user requests immediate stop

Forced kill should still try to preserve logs and runtime state.

# Emergency Kill

Emergency kill is used when:

- Worker attempts critical permission violation
- secret exfiltration is suspected
- runaway process threatens machine stability
- malicious command is detected

Emergency kill prioritizes safety over graceful completion.

# Cleanup Checklist

```text
[ ] Stop terminal input
[ ] Stop child processes
[ ] Flush terminal output
[ ] Save partial logs
[ ] Save partial artifacts
[ ] Release locks
[ ] Revoke grants
[ ] Cancel pending tool calls
[ ] Cancel pending approval requests
[ ] Update Worker state
[ ] Notify parent Orchestrator
```

# Timeout Policy

Graceful shutdown should have a timeout.

Example:

```text
graceful_timeout_ms = 10000
force_timeout_ms = 5000
```

# AI Notes

Graceful is preferred, but not at the cost of safety.

If a Worker is violating policy, the Runtime should stop it quickly and preserve evidence.

# Related Documents

- [[WorkerTermination-Part03]]
- [[ProcessLifecycle-Part02]]
- [[PermissionManager-Part01]]

