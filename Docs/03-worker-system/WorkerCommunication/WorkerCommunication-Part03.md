---
title: WorkerCommunication Specification - Part 03
status: draft
version: 1.0
tags:
  - worker-system
  - worker-communication
  - routing
related:
  - "[[WorkerCommunication-Part02]]"
  - "[[WorkerCommunication-Part04]]"
  - "[[WorkerHierarchy-Part02]]"
---

# WorkerCommunication Specification (Part 03)

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

# The Channel

A channel is the messaging object bound to exactly one parent-child edge in the hierarchy. If the edge exists, the channel exists. If the edge is terminal, the channel closes.

```ts
type ChannelId = string;

type Channel = {
  id: ChannelId;
  sessionId: string;
  workspaceId: string;
  parentNodeId: HierarchyNodeId;
  childNodeId: HierarchyNodeId;
  state: ChannelState;
  downQueue: MessageQueue;
  upQueue: MessageQueue;
  nextSequenceDown: number;
  nextSequenceUp: number;
  pendingRequests: Map<string, PendingRequest>;
  lastHeartbeatAt: string;
  openedAt: string;
  closedAt: string | null;
};

type ChannelState = "opening" | "open" | "draining" | "closed";

type MessageQueue = {
  items: MessageEnvelope[];
  highWaterMark: number;
  lowWaterMark: number;
  maxDepth: number;
  state: "flowing" | "backpressured" | "shedding";
};
```

There are exactly two queues per channel, one per direction. They are independent. A backed-up `upQueue` MUST NOT block the `downQueue`, because the message that unblocks a stuck Worker is usually a cancel travelling down.

# Channel Lifecycle

```text
opening   Node inserted, actor not yet live. Messages may be enqueued down
          but not delivered. Nothing may be sent up yet.

open      Actor live. Both directions flow.

draining  Cancel issued or actor finishing. New sends are rejected with
          CommError::ChannelDraining. Queued messages still deliver.
          The channel remains draining until both queues are empty or the
          grace period expires.

closed    Child node is terminal. All sends rejected. Queues discarded.
          Durable undelivered messages are marked abandoned, not retried.
```

```text
CH1  A channel MUST be created in the same transaction as its hierarchy node.
CH2  A channel MUST NOT outlive its child node.
CH3  A channel MUST NOT exist without both endpoints existing.
CH4  Closing a channel MUST NOT lose a persisted result. If the up queue holds
     an unacknowledged result at close time, persist it and let the parent
     read it from storage. Do not silently drop it.
CH5  A node MUST have exactly one channel to its parent and exactly one per
     child. A node with N children has N + 1 channels.
```

# Why Workers MUST NOT Talk Peer to Peer

This is a rule people push back on, so here is the full argument. It is not about performance.

## Authority

Every permission decision in Eulinx is a walk up the hierarchy path. That walk is meaningful only because the hierarchy is the complete authority graph. A direct Worker-to-Worker channel is an edge that is not in the hierarchy, which means it is an edge the permission walk cannot see.

Concretely: `wrk_schema` can write `src/api/db/*`. `wrk_ui` can write `src/ui/*`. If they can talk directly, `wrk_ui` can ask `wrk_schema` to write a file in `src/api/db/` on its behalf. Neither node violated its own permission set. The system was still escalated. The confused deputy problem is not hypothetical here; it is one message away.

## Accountability

The tree exists so that every action has exactly one accountable parent. A sibling-to-sibling message creates an action with no accountable party. When it goes wrong, the parent Orchestrator of `wrk_ui` reviews its child's work and sees a schema change it never planned, from a node it does not own, caused by a message it never saw.

## Cancellation

Cascade cancel works by walking the subtree. A peer edge is not in the subtree. Cancel `sub_api` and `wrk_schema` dies, but a peer request it sent to `wrk_ui` is still in flight and `wrk_ui` will happily act on instructions from a node that no longer exists.

## Determinism and Replay

Replay reconstructs a Session from the message log. A peer channel is either logged, in which case you have built a mediated channel with extra steps, or it is not, in which case replay is broken. There is no third option.

## Topology

N Workers with peer channels is an N-squared mesh with no ordering guarantee between edges. The tree is N-1 edges with FIFO per edge. The mesh has cycles, so it has deadlocks, and a deadlock between two AI agents each waiting on the other resolves only by timeout and burned budget.

```text
The rule is: no peer-to-peer, no exceptions, no "internal" fast path.
If two Workers need to coordinate, their shared parent coordinates them.
That is what the parent is for.
```

# How Siblings Actually Coordinate

They do not. Their parent does. Here is the mediated pattern for every case people reach for peer messaging to solve.

```text
Case: wrk_a produced something wrk_b needs.

  WRONG: wrk_a sends the data to wrk_b.
  RIGHT: wrk_a registers an Artifact and sends artifact_ready up.
         The parent decides wrk_b needs it.
         The parent includes the artifactId in wrk_b's task_assignment
         or sends an answer carrying the reference.
         wrk_b fetches it from the ArtifactManager.

Case: wrk_a needs to know something only wrk_b knows.

  WRONG: wrk_a asks wrk_b.
  RIGHT: wrk_a sends question up, blocking, with a default.
         The parent answers from its plan, from wrk_b's already-bubbled
         result, or by asking the user.
         If the parent does not know yet, it holds the question until
         wrk_b's result arrives. The parent is allowed to be slow.

Case: wrk_a and wrk_b both need to edit the same file.

  WRONG: they negotiate.
  RIGHT: they do not. The LockManager serializes them, and the parent
         should not have planned overlapping scopes in the first place.
         Overlapping write scopes among siblings is a planning bug and
         SHOULD be caught at delegation time.

Case: wrk_a discovers wrk_b's work is now wrong.

  WRONG: wrk_a tells wrk_b to redo it.
  RIGHT: wrk_a reports the finding in its result or as an error.
         The parent replans. Only the parent may cancel or re-delegate
         wrk_b, because only the parent holds the plan.
```

The cost of mediation is one extra hop and some latency. The benefit is that every one of the above is auditable, cancellable, and replayable. That trade is always worth taking.

# The Router

```ts
interface MessageRouter {
  send<K extends MessageKind>(
    senderIdentity: TransportIdentity,
    kind: K,
    payload: MessagePayloadFor<K>,
    recipientHint?: HierarchyNodeId
  ): Promise<SendReceipt>;

  receive(nodeId: HierarchyNodeId, maxItems: number): Promise<MessageEnvelope[]>;
  ack(nodeId: HierarchyNodeId, messageId: string): Promise<void>;
  nack(nodeId: HierarchyNodeId, messageId: string, reason: string): Promise<void>;
  channelHealth(channelId: ChannelId): Promise<ChannelHealth>;
}
```

`recipientHint` is used only by `task_assignment` and `cancel` and is validated as a child or descendant. Every other kind ignores it. The parameter MUST NOT be a free-form node id that the router trusts.

Note there is no `sendTo(nodeId, ...)`. That function MUST NOT exist. If it exists, someone will call it.

# Routing Algorithm

```text
1.  Resolve senderNode from senderIdentity. This identity comes from the
    transport, the process handle or IPC channel, and is not forgeable by
    the actor's output. If unresolvable, reject CommError::UnknownSender.
2.  Run send-time validation from WorkerCommunication-Part02.
3.  Resolve the channel:
      a. For direction "up", channel = channelFor(sender.parentId, sender.id).
      b. For direction "down", channel = channelFor(sender.id, recipientHint).
      c. If no channel exists, reject with CommError::NoChannel.
4.  If channel.state is "closed", reject with CommError::ChannelClosed.
5.  If channel.state is "draining" and kind != "cancel", reject with
    CommError::ChannelDraining.
6.  Check the recipient's ancestor chain. If any ancestor of toNodeId is
    paused, cancelled, or failed, drop the message, emit
    message.dropped_ancestor_not_running, and return a receipt with
    outcome "dropped". Invariant M10.
7.  Assign sequence atomically from the channel counter for this direction.
8.  If durable, persist to worker_messages, commit.
9.  Apply the backpressure policy from Part 05 to the target queue.
10. If kind == "cancel", insert at the queue HEAD. Otherwise append at the
    tail within the message's priority class.
11. Emit message.sent.
12. Return SendReceipt { messageId, sequence, outcome: "queued" }.

Delivery, running independently per channel:

13. Pop the head of the queue.
14. If expiresAt is set and now > expiresAt, drop it, emit
    message.expired, and go to 13.
15. If the recipient node is terminal, drop it, emit
    message.dropped_recipient_terminal, and go to 13.
16. Deliver to the recipient's transport.
17. Mark delivered_at. Emit message.delivered.
18. If the kind expects an ack, start the timer from Part 04.
19. Go to 13.
```

Step 1 is the security boundary of this entire document. The sender identity comes from the transport, not from the message. A Worker's model output cannot claim to be another node because the model never gets to write `fromNodeId`. If you take `fromNodeId` from the payload, every rule in this spec becomes advisory.

# Transport Identity

```ts
type TransportIdentity = {
  nodeId: HierarchyNodeId;
  actorId: string;
  processHandle: string;
  channelToken: string;
  establishedAt: string;
};
```

`channelToken` is a runtime-generated secret handed to the actor process at spawn time and never exposed to the model's context. It binds a live transport to a node id.

```text
T1  channelToken MUST be generated by the runtime with a CSPRNG.
T2  channelToken MUST NOT appear in any prompt, context package, transcript,
    memory record, or log line.
T3  channelToken MUST be rotated if the actor process restarts.
T4  A message arriving with an unknown or expired token MUST be rejected with
    CommError::InvalidTransportIdentity and MUST emit a security event.
T5  The runtime MUST NOT accept a nodeId from message content under any
    circumstance.
```

Rule T2 is easy to violate accidentally. If the token is in an environment variable and the Worker can run `bash`, and its transcript includes command output, the token can end up in its own context and from there into a summary. Keep it out of the actor's reachable surface entirely; hold it on the runtime side of the IPC boundary.

# Related Documents

- [[WorkerCommunication-Part02]]
- [[WorkerCommunication-Part04]]
- [[WorkerCommunication-Diagrams]]
- [[WorkerHierarchy-Part02]]
- [[LockManager-Part01]]
- [[ArtifactManager-Part01]]
