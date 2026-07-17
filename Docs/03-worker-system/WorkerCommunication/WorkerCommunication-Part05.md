---
title: WorkerCommunication Specification - Part 05
status: draft
version: 1.0
tags:
  - worker-system
  - worker-communication
  - backpressure
related:
  - "[[WorkerCommunication-Part01]]"
  - "[[EventBus-Part01]]"
---

# WorkerCommunication Specification (Part 05)

## Document Index

Part 01 - Purpose, Principles, and Communication Boundaries
Part 02 - Message Envelope, Channels, and Routing
Part 03 - Parent, Child, Sibling, and Runtime Communication
Part 04 - Requests, Responses, Acknowledgements, and Correlation
Part 05 - Backpressure, Rate Limits, and Noise Control
Part 06 - Security, Permissions, Redaction, and Audit
Part 07 - UI, Events, Replay, and Observability
Part 08 - Implementation Checklist, Examples, and Future Expansion

# Purpose

This part defines how Eulinx prevents Worker communication from becoming noisy, expensive, or overwhelming.

When many Workers run together, uncontrolled messages can create:

- context flooding
- UI spam
- event overload
- repeated approval requests
- unnecessary model calls
- slow runtime behavior

# Backpressure Principle

Workers may produce messages faster than the user or Runtime can consume them.

Eulinx must apply backpressure.

Backpressure does not mean hiding information. It means shaping communication into useful forms.

# Message Priority

Worker messages SHOULD have priority:

```text
critical
high
normal
low
debug
```

Critical examples:

- policy violation
- destructive action request
- Worker blocked
- secret exposure warning

Low examples:

- routine progress update
- repeated log line
- debug detail

# Rate Limits

Eulinx SHOULD rate-limit:

- Worker status updates
- sibling communication requests
- approval requests
- repeated failures
- terminal summaries
- UI notifications

# Message Coalescing

Repeated messages SHOULD be coalesced.

Example:

```text
Instead of:
Worker 5 is still running.
Worker 5 is still running.
Worker 5 is still running.

Show:
Worker 5 is still running. Last update 3m ago.
```

# Summarization

Low-priority chatty streams should be summarized before display or forwarding.

Examples:

- terminal output tail
- repeated test failures
- repeated dependency install logs
- repeated permission denials

# Queues

WorkerCommunication may maintain:

```text
inbound_queue
outbound_queue
priority_queue
approval_queue
runtime_event_queue
ui_notification_queue
```

# AI Notes

Do not let Workers ping each other constantly.

Communication should be useful, routed, and summarized.

# Related Documents

- [[WorkerCommunication-Part06]]
- [[EventBus-Part01]]
- [[ContextSharing-Part01]]

