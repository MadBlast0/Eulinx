---
title: WorkerCommunication Specification - Part 07
status: draft
version: 1.0
tags:
  - worker-system
  - worker-communication
  - ui
  - replay
related:
  - "[[WorkerCommunication-Part06]]"
  - "[[Workflow-Part11]]"
---

# WorkerCommunication Specification (Part 07)

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

Worker communication should be visible enough to understand but not so noisy that the graph becomes unusable.

# UI Surfaces

Eulinx SHOULD show Worker communication in:

- Worker detail panel
- parent Orchestrator view
- Workflow edge activity
- timeline
- replay mode
- notification center

# Message Display Levels

```text
full
summary
badge
hidden_debug
```

# Events

Recommended events:

```text
worker.message.sent
worker.message.received
worker.message.routed
worker.message.blocked
worker.message.redacted
worker.message.summarized
worker.communication.backpressure_applied
```

# Replay

Replay should show:

- major Worker messages
- spawn requests
- handoffs
- blocked messages
- approval messages
- artifact routing

Replay does not need every low-level log message by default.

# Observability

Metrics:

- messages per Worker
- blocked messages
- redacted messages
- average response latency
- repeated requests
- noisy Worker score

# AI Notes

The UI should show communication as structured operational activity, not as a chaotic group chat.

# Related Documents

- [[WorkerCommunication-Part08]]
- [[Workflow-Part11]]
- [[WorkerMonitoring-Part01]]

