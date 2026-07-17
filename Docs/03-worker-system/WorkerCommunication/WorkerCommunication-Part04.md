---
title: WorkerCommunication Specification - Part 04
status: draft
version: 1.0
tags:
  - worker-system
  - worker-communication
  - reliability
related:
  - "[[WorkerCommunication-Part03]]"
  - "[[WorkerCommunication-Part05]]"
---

# WorkerCommunication Specification (Part 04)

## Document Index

```text
WorkerCommunication-Part01 - Purpose, philosophy, envelope overview, invariants
WorkerCommunication-Part02 - The message envelope and every message kind in full
WorkerCommunication-Part03 - Channels, mediated routing, and the no-peer-to-peer rule
WorkerCommunication-Part04 - Correlation IDs, request and response, timeouts, retries
WorkerCommunication-Part05 - Ordering, delivery guarantees, backpressure, EventBus split
WorkerCommunication-Part06 - Implementation checklist, worked examples, future expansion
WorkerCommunication-Diagrams - All communication flows rendered four ways
```

# Request and Response Pairs

Four message kinds expect a response. Every other kind is fire and forget.

```text
request          response         responder      timeout   on timeout
---------------  ---------------  -------------  --------  --------------------
task_assignment  result           the child      deadline  cancel the child
question         answer           the parent     per-msg   synthesize default
result           ack              the parent     30000 ms  retry then orphan check
artifact_ready   ack              the parent     30000 ms  retry then orphan check
cancel           ack              the child      grace     escalate to terminate
```

An `ack` is not a message kind in the `MessageKind` union. It is a transport-level acknowledgement carried by `MessageRouter.ack`. Do not model it as a message; that creates an infinite regress where the ack needs an ack.

# Correlation Model

```ts
type PendingRequest = {
  requestMessageId: string;
  requestKind: MessageKind;
  expectedResponseKind: MessageKind;
  fromNodeId: HierarchyNodeId;
  toNodeId: HierarchyNodeId;
  channelId: ChannelId;
  sentAt: string;
  timeoutAt: string;
  attempt: number;
  maxAttempts: number;
  onTimeout: TimeoutAction;
  resolver: string | null;
};

type TimeoutAction =
  | { kind: "retry"; backoffMs: number[] }
  | { kind: "synthesize_default"; value: string }
  | { kind: "cancel_recipient"; reason: CascadeReason }
  | { kind: "fail_sender"; errorCode: string }
  | { kind: "escalate_to_terminate" };
```

```text
X1  A response MUST set correlationId to the request's messageId.
X2  A response MUST travel the opposite direction from its request.
X3  A response whose correlationId matches no pending request MUST be dropped
    with CommError::UnknownCorrelation and MUST emit an event. It MUST NOT be
    delivered "just in case".
X4  A response whose kind does not match expectedResponseKind MUST be rejected
    with CommError::WrongResponseKind.
X5  A response arriving after its pending request has timed out MUST be
    dropped. The timeout already ran its action; applying both is a double
    resolution and produces contradictory state.
X6  A pending request MUST be removed from the map when it resolves or times
    out. A leaked pending request is a leaked timer and a leaked resolver.
X7  correlationId MUST NOT be reused across requests. It is the request's
    messageId and messageIds are never reused.
```

Rule X5 has a subtle consequence. A `question` that times out at 60000 ms gets a synthesized default answer, and the Worker proceeds on an assumption. If the real answer arrives at 61000 ms, it is dropped. The Worker MUST record the assumption in `unresolvedAssumptions` on its result so the parent can see the fork. Do not try to "fix up" the Worker mid-flight with a late answer; its reasoning already branched.

# Timeout Table

Every timeout in the system is here. There are no others and none are computed at runtime by a model.

```ts
const TIMEOUTS_MS = {
  taskAssignmentAck: 15000,
  resultAck: 30000,
  artifactReadyAck: 30000,
  cancelAck: 5000,
  questionDefault: 60000,
  heartbeatInterval: 10000,
  heartbeatMissThreshold: 3,
  heartbeatSilenceLimit: 30000,
  channelDrainLimit: 30000,
  transportReconnect: 5000,
};
```

A `task_assignment` has two clocks and implementers conflate them. `taskAssignmentAck` at 15000 ms is "did the Worker receive the assignment". The `deadlineAt` on the payload, often minutes, is "did the Worker finish the work". Missing the first means the transport is broken. Missing the second means the work is too slow. The actions are completely different.

# Retry Policy

```ts
const RETRY_POLICY: Record<MessageKind, RetrySpec> = {
  task_assignment: { maxAttempts: 3, backoffMs: [1000, 4000, 16000] },
  result:          { maxAttempts: 4, backoffMs: [1000, 4000, 16000] },
  artifact_ready:  { maxAttempts: 4, backoffMs: [1000, 4000, 16000] },
  answer:          { maxAttempts: 3, backoffMs: [1000, 4000, 16000] },
  cancel:          { maxAttempts: 3, backoffMs: [500, 1000, 2000] },
  error:           { maxAttempts: 2, backoffMs: [1000, 4000] },
  question:        { maxAttempts: 1, backoffMs: [] },
  status:          { maxAttempts: 1, backoffMs: [] },
  heartbeat:       { maxAttempts: 1, backoffMs: [] },
};

type RetrySpec = { maxAttempts: number; backoffMs: number[] };
```

```text
Y1  Only durable, at-least-once kinds are retried. status and heartbeat are
    never retried; a stale status is worse than a missing one.
Y2  question has maxAttempts 1 because the question is durable and the parent
    will see it when it drains its queue. Resending it would produce two
    questions and possibly two contradictory answers.
Y3  A retry MUST reuse the original messageId and increment attempt. It MUST
    NOT mint a new messageId. A new id breaks correlation and the receiver
    cannot deduplicate.
Y4  Backoff MUST be exactly the listed values. Do not add jitter. Eulinx replay
    requires deterministic timing, and there are at most a handful of channels
    per parent, so there is no thundering herd to smooth.
Y5  A retried message MUST be idempotent on the receiving side. See below.
Y6  When maxAttempts is exhausted, apply the kind's TimeoutAction. Do not
    retry forever and do not silently give up.
```

Rule Y4 will feel wrong to anyone who has built a distributed system. It is correct here. Eulinx is a single-machine desktop app with a handful of local channels, not a fleet. Jitter buys nothing and costs replay determinism, which is a stated requirement.

# Receiver-Side Idempotency

At-least-once delivery means duplicates. The receiver MUST handle them.

```text
1.  On receiving an envelope, check whether messageId exists in the node's
    seen-set for this channel.
2.  If it exists and was already processed:
      a. Re-send the acknowledgement. The original ack was probably lost;
         that is why the sender retried.
      b. DO NOT process the payload again.
      c. Emit message.duplicate_suppressed.
      d. Return.
3.  If it is new, process it, record messageId in the seen-set, then ack.
4.  The seen-set MUST be persisted for durable kinds. An in-memory set loses
    its contents on restart and the first post-restart retry gets processed
    twice.
5.  The seen-set MAY be pruned when the channel closes. It MUST NOT be pruned
    while the channel is open.
```

Step 2a is the step people miss. A duplicate is evidence the ack was lost, not evidence the sender is confused. Silently ignoring the duplicate means the sender keeps retrying until it exhausts `maxAttempts` and then wrongly concludes the recipient is dead.

Step 3's order matters: process, then record, then ack. If you ack first and crash before processing, the message is gone. If you record first and crash before processing, the retry is suppressed and the message is gone. Process, record, and ack MUST be one transaction for durable kinds.

# Timeout Algorithm

```text
Runs on a single timer wheel, ticking every 250 ms.

1.  Collect all PendingRequest entries where now >= timeoutAt.
2.  Sort by timeoutAt ascending, then by requestMessageId ascending.
    Deterministic order, for replay.
3.  For each expired request P:
      a. Remove P from channel.pendingRequests immediately. Rule X6.
      b. Emit message.timeout with requestMessageId and requestKind.
      c. If P.attempt < P.maxAttempts and P.onTimeout.kind == "retry":
           - increment P.attempt
           - re-enqueue the SAME messageId with the new attempt number
           - set timeoutAt = now + backoffMs[P.attempt - 1]
           - re-insert P into pendingRequests
           - emit message.retried
           - continue to the next request
      d. Otherwise apply P.onTimeout:
           - "synthesize_default": build an AnswerPayload with
             answeredBy "default_on_timeout", confidence "assumed", and
             value P.onTimeout.value. Deliver it to the asker. Emit
             message.default_answered.
           - "cancel_recipient": issue a CascadeSignal to toNodeId with the
             given reason. Emit message.timeout_cancelled_recipient.
           - "fail_sender": transition fromNodeId to "failed" with the given
             errorCode. Emit message.timeout_failed_sender.
           - "escalate_to_terminate": kill the recipient process via
             ProcessLifecycle. Emit
             hierarchy.cancel_escalated_to_terminate.
           - "retry" with attempts exhausted: run the orphan check from
             WorkerHierarchy-Part05. If the recipient is gone, the sender is
             an orphan. If the recipient lives but will not ack, fail the
             sender with ParentUnresponsive.
```

Step 3a's ordering prevents the double-resolution bug in rule X5. Remove the pending request before you act on the timeout, so a response racing in at that exact moment finds no pending entry and is dropped by rule X3.

# Timeout Actions Per Kind

```ts
const TIMEOUT_ACTIONS: Record<string, TimeoutAction> = {
  task_assignment: { kind: "cancel_recipient", reason: "DeadlineExceeded" },
  result:          { kind: "retry", backoffMs: [1000, 4000, 16000] },
  artifact_ready:  { kind: "retry", backoffMs: [1000, 4000, 16000] },
  cancel:          { kind: "escalate_to_terminate" },
  question:        { kind: "synthesize_default", value: "" },
};
```

For `question`, the `value` is filled from the payload's `defaultIfTimeout`, which Part 02 rule guarantees is non-null for blocking questions. This is why that validation exists at send time: the timeout handler must never be in a position where it has no default to synthesize.

# Reconnection

An actor process can restart. Its channel must recover without losing durable messages.

```text
1.  The actor process dies. ProcessLifecycle detects it.
2.  The channel enters "opening". Delivery pauses. Sends still enqueue.
3.  The runtime respawns the actor with a NEW channelToken. Rule T3.
4.  The actor announces its last received sequence per direction.
5.  The runtime compares it to channel.nextSequenceDown - 1.
      a. If they match, resume normally.
      b. If the actor is behind, replay durable messages from worker_messages
         WHERE channel_id = ? AND direction = 'down'
           AND sequence > actorLastSeen ORDER BY sequence ASC.
         Non-durable messages in that gap are lost. That is acceptable; only
         status and heartbeat are non-durable.
      c. If the actor claims a sequence AHEAD of the runtime's counter, the
         channel is corrupt. Close it, fail the node with
         CommError::SequenceCorruption, and emit a security event. Do not
         attempt repair.
6.  Pending requests that the dead actor owed responses to are re-evaluated.
    Their timers kept running through the outage; they are not extended for
    the restart. A Worker that restarts near its deadline may be cancelled
    immediately, and that is correct.
7.  Emit channel.reconnected with the replayed message count.
```

Step 6 is deliberate. Extending a deadline because the process crashed rewards flakiness with more budget. The deadline is a wall-clock promise to the parent, and the parent's own deadline did not move.

# Related Documents

- [[WorkerCommunication-Part03]]
- [[WorkerCommunication-Part05]]
- [[WorkerCommunication-Diagrams]]
- [[WorkerHierarchy-Part05]]
- [[ProcessLifecycle-Part01]]
