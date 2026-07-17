---
title: WorkerCommunication Specification - Part 08
status: draft
version: 1.0
tags:
  - worker-system
  - worker-communication
  - implementation
related:
  - "[[WorkerCommunication-Part01]]"
---

# WorkerCommunication Specification (Part 08)

## Document Index

Part 01 - Purpose, Principles, and Communication Boundaries
Part 02 - Message Envelope, Channels, and Routing
Part 03 - Parent, Child, Sibling, and Runtime Communication
Part 04 - Requests, Responses, Acknowledgements, and Correlation
Part 05 - Backpressure, Rate Limits, and Noise Control
Part 06 - Security, Permissions, Redaction, and Audit
Part 07 - UI, Events, Replay, and Observability
Part 08 - Implementation Checklist, Examples, and Future Expansion

# Public API

```ts
interface WorkerCommunicationApi {
  send(message: WorkerMessage): Promise<WorkerMessageResult>;
  route(messageId: string): Promise<void>;
  acknowledge(messageId: string): Promise<void>;
  summarize(channelId: string): Promise<WorkerMessageSummary>;
  list(filter: WorkerMessageFilter): Promise<WorkerMessage[]>;
}
```

# Suggested Tables

```text
worker_messages
worker_channels
worker_message_routes
worker_message_acks
worker_message_redactions
worker_message_summaries
```

# Implementation Checklist

```text
[ ] Define WorkerMessage envelope
[ ] Define channels
[ ] Define routing rules
[ ] Add parent/child communication
[ ] Add sibling request flow
[ ] Add acknowledgements
[ ] Add correlation ids
[ ] Add backpressure
[ ] Add redaction
[ ] Add audit records
[ ] Add UI communication timeline
[ ] Add replay integration
[ ] Add tests for blocked direct Worker messages
```

# Example: Child Reports Completion

```text
Child Worker creates artifact.
Child sends completed message to parent.
Runtime routes message.
Parent Orchestrator receives artifact reference.
Workflow updates edge status.
```

# Example: Sibling Communication Request

```text
Frontend Worker needs API contract from Backend Worker.
Frontend Worker requests context.
Runtime checks route.
Backend Worker artifact is shared.
No direct free-form chat is opened.
```

# Future Expansion

Future capabilities:

- communication graph
- semantic message clustering
- auto summaries per phase
- user-configured notification levels
- cross-session communication replay

# Final AI Notes

WorkerCommunication is not a chat room.

It is a controlled message routing system for supervised AI terminal processes.

# Related Documents

- [[WorkerCommunication-Part01]]
- [[ContextSharing-Part01]]
- [[EventBus-Part01]]

