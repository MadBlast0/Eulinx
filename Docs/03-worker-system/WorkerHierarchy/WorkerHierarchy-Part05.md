---
title: WorkerHierarchy Specification - Part 05
status: draft
version: 1.0
tags:
  - worker-system
  - worker-hierarchy
  - lifecycle
related:
  - "[[WorkerHierarchy-Part04]]"
  - "[[WorkerHierarchy-Part06]]"
  - "[[WorkerTermination-Part01]]"
---

# WorkerHierarchy Specification (Part 05)

## Document Index

```text
WorkerHierarchy-Part01 - Purpose, philosophy, object model, invariants
WorkerHierarchy-Part02 - Tree structure, node kinds, parent and child relationships
WorkerHierarchy-Part03 - Depth limits, fan-out limits, delegation rules
WorkerHierarchy-Part04 - Authority, permission inheritance, budget and cost inheritance
WorkerHierarchy-Part05 - Cascading control, result bubbling, orphans, cycle prevention
WorkerHierarchy-Part06 - Implementation checklist, worked examples, future expansion
WorkerHierarchy-Diagrams - All hierarchy flows rendered four ways
```

# Cascading Control Signals

Three signals travel down the tree. They differ in reversibility and in what they do to budget.

```text
pause      Reversible. Actor suspended. Budget frozen. Context preserved.
           Descendants pause. Node keeps its slot.

cancel     Irreversible. Actor asked to stop cooperatively with a grace period.
           Partial results may be salvaged. Budget refunded. Descendants cancel.

terminate  Irreversible. Actor killed. No grace period. No results salvaged.
           Budget refunded. Descendants terminate.
```

```ts
type CascadeSignal = {
  signalId: string;
  kind: "pause" | "resume" | "cancel" | "terminate";
  originNodeId: HierarchyNodeId;
  targetNodeId: HierarchyNodeId;
  reason: CascadeReason;
  gracePeriodMs: number;
  issuedAt: string;
};

type CascadeReason =
  | "UserRequested"
  | "ParentCancelled"
  | "ParentTerminated"
  | "BudgetExhausted"
  | "DeadlineExceeded"
  | "PermissionRevoked"
  | "SessionShutdown"
  | "OrphanReaped"
  | "SiblingFailurePolicy";
```

# Cascade Authority Rules

```text
C1  A node MAY signal any of its descendants. It MUST NOT signal an ancestor.
C2  A node MUST NOT signal a node outside its own subtree. A cascade whose
    targetNodeId does not have originNodeId in its path MUST be rejected with
    HierarchyError::CascadeOutOfSubtree.
C3  The user root MAY signal anything. This is the emergency stop.
C4  A cascade MUST reach every descendant, including descendants in state
    "pending" and "admitted" that have no live actor.
C5  A cascade MUST be idempotent. Re-delivering the same signalId to the same
    node MUST be a no-op.
C6  A cascade MUST NOT be blocked by a hung actor. The grace period is a
    ceiling, not a negotiation.
```

Rule C1 is the counterpart to the authority rule. Authority flows down, so control flows down. A Worker cannot cancel its Orchestrator any more than it can grant itself permissions.

# Cascade Algorithm

```text
1.  Receive CascadeSignal at originNodeId targeting targetNodeId.
2.  Load target. If missing, emit hierarchy.cascade_target_missing and return.
3.  Verify originNodeId appears in target.path, or origin is the user root.
    If not, reject with HierarchyError::CascadeOutOfSubtree.
4.  If target has already processed signalId, return. Idempotency, rule C5.
5.  Collect subtree = target plus all descendants via the prefix query
    WHERE path LIKE target.path || '%'.
6.  Sort subtree by depth DESCENDING. Deepest nodes are signalled first.
7.  For each node N in that order:
      a. If N.state is already terminal, skip it.
      b. Record N.state as N.previousState. Needed for resume.
      c. Apply the state transition:
           pause     -> "paused"
           resume    -> N.previousState, only if N.state == "paused"
           cancel    -> "cancelled"
           terminate -> "cancelled"
      d. If N has a live actor, deliver the signal to it:
           pause     -> suspend the process, stop the token stream
           resume    -> resume the process
           cancel    -> send a cancel message, start gracePeriodMs timer
           terminate -> kill the process immediately via ProcessLifecycle
      e. Release every lock N holds via LockManager.releaseAll(N.actorId).
      f. For cancel and terminate, run the budget refund from rule B3.
      g. Emit hierarchy.node_signalled with signalId, nodeId, kind, reason.
8.  For cancel only: wait up to gracePeriodMs for each node to acknowledge.
      a. Nodes that acknowledge in time may attach a partial NodeResult.
      b. Nodes that do not acknowledge are escalated to terminate.
         Emit hierarchy.cancel_escalated_to_terminate.
9.  Emit hierarchy.cascade_complete with signalId and the affected node count.
```

Step 6's depth-descending order is mandatory and is the step implementers get wrong. If you signal the parent first, the parent may reach a terminal state while its children are still running, which violates invariant H11. Children die first, always.

Step 7e matters as much. A cancelled Worker that holds a file lock and is never asked to release it deadlocks every sibling waiting on that file. Lock release is part of the cascade, not part of the actor's cleanup, because a killed actor does not get to run cleanup.

# Default Grace Periods

```ts
const CASCADE_GRACE_MS = {
  UserRequested: 5000,
  ParentCancelled: 3000,
  ParentTerminated: 0,
  BudgetExhausted: 2000,
  DeadlineExceeded: 2000,
  PermissionRevoked: 0,
  SessionShutdown: 10000,
  OrphanReaped: 0,
  SiblingFailurePolicy: 3000,
};
```

`PermissionRevoked` is zero deliberately. If a Worker's authority was revoked, it MUST NOT get three more seconds to act with authority it no longer has.

# Result Bubbling

A result travels up exactly one edge at a time. There is no skip-level reporting.

```text
R1  A node MUST report its NodeResult to its parent and to no one else.
R2  A node MUST NOT report to its grandparent, even if the parent is slow.
R3  A node MUST NOT transition to "completed" until every child is terminal.
    This is invariant H12.
R4  A parent MUST acknowledge a child's result before the child's node row is
    marked terminal. An unacknowledged result MUST be retried.
R5  A parent MUST aggregate child results into its own result. It MUST NOT
    forward a child's result unchanged as its own.
R6  A parent MUST NOT report "success" if any child reported "failure", unless
    the parent's plan explicitly marked that child optional. Optionality MUST
    be declared at delegation time, not decided after the failure.
```

Rule R6's timing clause is the interesting one. A model that sees a child fail is very willing to decide, after the fact, that the child was not important. The runtime prevents this by requiring `optional: true` on the DelegationRequest, recorded before the outcome was known.

```ts
type ResultBubbleMessage = {
  fromNodeId: HierarchyNodeId;
  toNodeId: HierarchyNodeId;
  result: NodeResult;
  budgetFinal: BudgetAllocation;
  childResults: NodeResultSummary[];
  attempt: number;
};

type NodeResultSummary = {
  nodeId: HierarchyNodeId;
  objective: string;
  outcome: "success" | "partial" | "failure" | "cancelled";
  wasOptional: boolean;
  artifactIds: string[];
};
```

# Result Bubbling Algorithm

```text
1.  Child actor finishes. Child node transitions to "completing".
2.  Verify all of the child's own children are terminal. If not, wait. A node
    in "completing" with live descendants is a bug; assert it loudly.
3.  Build NodeResult with outcome, summary, and artifactIds.
4.  Build ResultBubbleMessage with attempt = 1.
5.  Route the message to the parent through the runtime, per
    WorkerCommunication-Part03. Do not call the parent directly.
6.  Start an acknowledgement timer of 30000 ms.
7.  If the parent acknowledges:
      a. Run the budget refund from rule B3.
      b. Transition the child node to "completed".
      c. Emit hierarchy.result_accepted.
      d. Re-run fan-out admission for the parent so a queued sibling can start.
8.  If the timer expires:
      a. Increment attempt. If attempt <= 3, resend from step 5 with backoff
         of 1000 ms, 4000 ms, 16000 ms.
      b. If attempt > 3, check whether the parent still exists and is running.
         If not, the child is an orphan. Go to the orphan procedure below.
      c. If the parent exists and is running but will not acknowledge, mark the
         child "failed" with reason ParentUnresponsive and emit
         hierarchy.parent_unresponsive.
9.  The parent, on receiving the result, MUST persist it to the child's
    result_json column before acknowledging. Acknowledge-then-persist loses
    results on crash.
```

# Orphan Handling

A node is orphaned when its parent is gone but the node is not terminal. This happens on runtime crash, on a parent process dying without cascading, and on a botched shutdown.

```text
Orphan detection MUST run:
  - at RuntimeManager startup, before any node is admitted
  - every 30000 ms as a background sweep
  - whenever a result bubble fails with ParentNotFound
```

```text
Orphan detection algorithm:

1.  Query all nodes WHERE state NOT IN ('completed','cancelled','failed').
2.  For each node N with parentId != null:
      a. Load parent P = node with id N.parentId.
      b. If P does not exist, N is orphaned. Reason: ParentRowMissing.
      c. If P.state is terminal, N is orphaned. Reason: ParentTerminal.
      d. If P.kind != "user" and P has no live actor and P.state == "running",
         N is orphaned. Reason: ParentActorDead.
      e. Otherwise N is fine.
3.  For each orphaned node, transition it to "orphaned" and emit
    hierarchy.orphan_detected with nodeId and reason.
4.  Run the orphan resolution policy below.
```

```text
Orphan resolution policy. The runtime MUST apply exactly one:

O1  If the orphan's parent is terminal and the orphan produced Artifacts, the
    Artifacts MUST be preserved and quarantined by the ArtifactManager. They
    MUST NOT be merged, because no live parent can vouch for them.
O2  The orphan MUST be terminated with reason OrphanReaped and grace period 0.
O3  The orphan MUST NOT be reparented to its grandparent. Reparenting would
    hand the grandparent an objective it never planned and a budget it never
    reserved, which breaks invariant H5.
O4  The orphan's budget MUST be refunded to the nearest non-terminal ancestor.
    If no such ancestor exists, refund to the user root.
O5  The orphan's locks MUST be released.
O6  A summary of the orphan's partial work MUST be written to Session memory so
    the user can see what was lost. Emit hierarchy.orphan_reaped.
```

Rule O3 is a deliberate refusal of an obvious idea. Reparenting looks like grace and is actually corruption: the grandparent's plan does not have a slot for this node, its budget arithmetic does not account for it, and its result aggregation does not expect it. Kill the orphan and let a live Orchestrator replan.

# Cycle Prevention

The tree cannot have cycles if insertion is the only way to create edges and insertion always attaches a fresh id to an existing parent. That is the primary defense. The cycle check is the secondary defense against bugs, bad migrations, and hand-edited databases.

```text
Cycle check, run inside the insertion transaction at Part 02 step 13:

1.  Given parent P and a freshly generated childId C.
2.  Assert C does not already exist as a row. If it does, reject with
    CycleDetected. A reused id is the only way a fresh insert makes a cycle.
3.  Split P.path on "/" into the ancestor id list A.
4.  If C appears anywhere in A, reject with CycleDetected.
5.  If P.id appears more than once in A, the tree is already corrupt. Reject
    with CycleDetected and emit hierarchy.corruption_detected.
6.  Assert A.length == P.depth + 1. A path whose length disagrees with the
    stored depth means depth or path was written wrong somewhere. Reject.
7.  Otherwise the insert is acyclic. Proceed.
```

```text
Structural rules that make cycles impossible by construction:

Y1  Node ids MUST be generated by the runtime, never supplied by an actor.
Y2  Node ids MUST be UUIDv7 and MUST NOT be reused.
Y3  parent_id MUST be immutable after insert. There is no reparent operation
    and the HierarchyStore MUST NOT expose one.
Y4  path MUST be immutable after insert.
Y5  An actor MUST NOT be able to supply parentId. The runtime derives it from
    the authenticated delegator's own node.
```

Rule Y3 is why this section is short. No reparent operation means no cycles. If a future feature seems to need reparenting, it does not; it needs a new delegation from a live parent.

# Related Documents

- [[WorkerHierarchy-Part04]]
- [[WorkerHierarchy-Part06]]
- [[WorkerHierarchy-Diagrams]]
- [[WorkerCommunication-Part03]]
- [[LockManager-Part01]]
- [[ProcessLifecycle-Part01]]
