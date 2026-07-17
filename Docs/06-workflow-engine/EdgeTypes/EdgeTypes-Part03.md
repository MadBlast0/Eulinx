---
title: EdgeTypes Specification - Part 03
status: draft
version: 1.0
tags:
  - workflow-engine
  - edge-types
  - architecture
related:
  - "[[EdgeTypes-Part02]]"
  - "[[EdgeTypes-Part04]]"
  - "[[LoopNodes-Part01]]"
  - "[[MemoryArchitecture-Part01]]"
---

# EdgeTypes Specification (Part 03)

Part 02 defined control, data, conditional, and error edges. This part defines the remaining four: loop-back, artifact, memory, and event. Same six sections per kind.

These four are the kinds that touch state outside the graph. That is what makes them the dangerous ones and why each has a hard rule about what it MUST NOT do.

# Loop-Back Edge

## Type

```ts
type LoopBackPayload = {
  kind: "loop_back";
  loopNodeId: string;
  carriesState: boolean;
  declaredType?: PortTypeRef;
  accumulator?: AccumulatorSpec;
  maxIterations: number;
  terminationGuard: EdgeGuard;
  onMaxIterations: "fail" | "break_with_last" | "break_with_accumulator";
  iterationBudget: IterationBudget;
};

type AccumulatorSpec = {
  strategy: "replace" | "append" | "numeric_add" | "object_merge";
  initialValue: JsonValue;
  maxAccumulatedBytes: number;
};

type IterationBudget = {
  maxWallClockMs: number;
  maxTotalTokens?: number;
  maxTotalCostUsd?: number;
  maxSpawnedWorkers?: number;
};
```

## Semantics

A loop-back edge points from a node **backwards** to an ancestor node. It is the only kind exempt from the acyclicity invariant in Part 01, and that exemption is the entire reason it is a distinct kind rather than a data edge that happens to point upstream.

The invariant is precise and MUST be checked exactly this way:

```text
Remove every Edge whose kind is loop_back.
The remaining graph MUST be a DAG.
If a cycle remains: IllegalCycle. Reject the graph at build time.
```

This is what buys Eulinx static analysis in the presence of loops. Every cycle is explicitly declared, has a named `loopNodeId` owning it, has a `maxIterations`, and has a `terminationGuard`. There are no accidental cycles, because an accidental cycle is made of non-loop_back edges and gets rejected.

`loopNodeId` MUST be the `targetNodeId` of this edge, and that node MUST be a LoopNode per [[LoopNodes-Part01]]. A loop-back edge into a non-LoopNode is `LoopBackToNonLoopNode`. The reason is ownership: the iteration counter lives on the LoopNode, and something has to own it.

`terminationGuard` is **mandatory**, not optional, and this is the only place in this specification where a guard is required. `maxIterations` is a backstop, not a termination condition. A loop whose only stopping rule is "1000 iterations" burns 1000 iterations of budget every time it runs. The `terminationGuard` is the real condition; `maxIterations` catches the case where the condition never becomes true.

`maxIterations` MUST be >= 1 and MUST be <= 10000. Zero is `InvalidMaxIterations`. Absent is `InvalidMaxIterations`. There is no unbounded loop in Eulinx and there will not be one.

`accumulator` defines how iteration state folds:

```text
replace       Each iteration's value replaces the last. State is the final value.
append        Each iteration's value appends to an array. Element type = declaredType.
numeric_add   Each iteration's number adds to a running sum. declaredType MUST be Number.
object_merge  Each iteration's object shallow-merges. Later keys win.
```

`maxAccumulatedBytes` caps the folded state, default 4194304 (4 MiB). Exceeding it raises `AccumulatorOverflow` and applies `onMaxIterations` handling. An `append` accumulator over 500 iterations of AI output is exactly how a workflow silently eats a gigabyte, so the cap is not optional.

`iterationBudget` is checked **cumulatively across all iterations**, not per iteration. A loop that spawns one Worker per iteration with `maxSpawnedWorkers: 20` stops at 20 total, not 20 each. Per-iteration budgets are the classic way an "obviously bounded" loop exhausts an account.

## When the Engine Traverses It

```text
1.  Source node reaches terminal outcome succeeded or succeeded_with_warnings.
    Any other outcome: state = cancelled. Loop exits via the source's error edges.
2.  Read the LoopNode's current iteration counter i (0-based) from the run record.
3.  Check iterationBudget cumulatively:
      wallClockMs since loop entry     > maxWallClockMs      -> LoopBudgetExhausted
      cumulative tokens                > maxTotalTokens      -> LoopBudgetExhausted
      cumulative costUsd               > maxTotalCostUsd     -> LoopBudgetExhausted
      cumulative spawned Workers       > maxSpawnedWorkers   -> LoopBudgetExhausted
    On LoopBudgetExhausted: apply onMaxIterations handling. Emit workflow.loop.budget_exhausted.
4.  If i + 1 >= maxIterations: apply onMaxIterations handling. Go to step 9.
5.  state = pending.
6.  Evaluate terminationGuard.
      Guard TRUE means "terminate". This polarity is fixed. Do not invert it.
      TRUE  -> state = guard_blocked. Loop exits normally. Emit workflow.loop.completed.
               The LoopNode's exit port activates. Stop.
      ERROR -> apply guard.onError. Default fail_node. A loop with an erroring
               termination guard MUST NOT keep looping. Never treat error as "continue".
      FALSE -> continue to step 7.
7.  If carriesState: fold this iteration's value into the accumulator per strategy.
      If serialized accumulator > maxAccumulatedBytes: AccumulatorOverflow.
      Apply onMaxIterations handling. Go to step 9.
8.  Increment the LoopNode's counter to i + 1. This write MUST be atomic with the
      traversal record insert, in one SQLite transaction. A crash between the two
      produces a loop that either repeats or skips an iteration on recovery.
9.  Deliver the accumulator (or unit if carriesState is false) to the LoopNode's
      loop input port. state = traversed.
10. Emit workflow.edge.traversed with iteration = i + 1 in the record.
11. Reset every node in the loop body subtree to inactive so it may run again.
      This reset MUST be computed as the set of nodes reachable from loopNodeId
      without traversing this loop_back edge. Nodes outside that set MUST NOT reset.
12. Activate the LoopNode.
```

Step 6's polarity is stated twice because it is inverted by half the people who implement it. `terminationGuard` TRUE means STOP. The name says so. The bug where it means "continue" produces an infinite loop that terminates only at `maxIterations`, looks like it works in tests with small `maxIterations`, and burns real money in production.

Step 11's reset scope is the other classic bug. Resetting the whole graph re-runs nodes that already committed side effects. Resetting nothing means iteration 2 sees iteration 1's stale outputs. The set is exactly the loop body: nodes reachable from `loopNodeId` without crossing this loop-back edge.

`onMaxIterations` handling, exactly:

```text
fail                    Fail the LoopNode with LoopIterationLimitExceeded.
                        Its error edges apply. Default. Safest.
break_with_last         Exit the loop. Deliver the last iteration's value to the exit port.
break_with_accumulator  Exit the loop. Deliver the folded accumulator to the exit port.
                        Requires carriesState true, else BreakWithoutAccumulator.
```

## Cardinality

```text
Loop-back edges into one LoopNode's loop input port:  exactly 1
  Zero -> LoopNodeWithoutBackEdge. Build-time. Reject.
  Two  -> MultipleLoopBackEdges. Build-time. Reject.
Loop-back edges out of one source port:  exactly 1
Nested loops:  allowed. Each has its own LoopNode, counter, and back edge.
  Nesting depth MUST be <= 4. Deeper -> LoopNestingTooDeep.
Loop-back edge crossing two loop bodies without full containment:
  FORBIDDEN -> CrossingLoopBodies. Loop bodies MUST nest, never overlap.
```

`CrossingLoopBodies` is the graph equivalent of `goto` into the middle of a loop. Loop bodies form a properly nested tree or the graph is rejected. Without this, "reset the loop body subtree" in step 11 has no well-defined answer.

## Failure Modes

```text
LoopBackToNonLoopNode        Target is not a LoopNode. Build-time. Reject.
LoopNodeWithoutBackEdge      LoopNode with no incoming loop_back. Build-time. Reject.
MultipleLoopBackEdges        Two back edges into one LoopNode. Build-time. Reject.
MissingTerminationGuard      terminationGuard absent. Build-time. Reject.
InvalidMaxIterations         Absent, < 1, or > 10000. Build-time. Reject.
IllegalCycle                 Cycle survives loop_back removal. Build-time. Reject.
CrossingLoopBodies           Loop bodies overlap without nesting. Build-time. Reject.
LoopNestingTooDeep           Depth > 4. Build-time. Reject.
BreakWithoutAccumulator      break_with_accumulator, carriesState false. Build-time. Reject.
LoopIterationLimitExceeded   Hit maxIterations. Run-time. Per onMaxIterations.
LoopBudgetExhausted          Cumulative budget blown. Run-time. Per onMaxIterations.
AccumulatorOverflow          Folded state over cap. Run-time. Per onMaxIterations.
GuardEvaluationTimeout       terminationGuard exceeded timeoutMs. Run-time. Per onError.
```

# Artifact Edge

## Type

```ts
type ArtifactPayload = {
  kind: "artifact";
  artifactKinds: ArtifactKindRef[];
  passBy: "reference";
  requireVerified: boolean;
  minVerificationLevel: VerificationLevel;
  onUnverified: "block" | "traverse_marked" | "fail_target";
  includeContent: false;
  lockPolicy: ArtifactLockPolicy;
};

type VerificationLevel =
  | "unverified"
  | "syntactic"
  | "deterministic_checks_passed"
  | "tests_passed"
  | "human_approved";

type ArtifactLockPolicy = {
  acquireReadLock: boolean;
  lockTimeoutMs: number;
  onLockTimeout: "block" | "fail_target";
};

type ArtifactHandle = {
  artifactId: string;
  artifactKind: ArtifactKindRef;
  version: number;
  contentHash: string;
  producedByWorkerId: string;
  verificationLevel: VerificationLevel;
  verifiedAt?: string;
  sizeBytes: number;
};
```

## Semantics

An artifact edge carries an `ArtifactHandle`, never artifact content. `passBy` is the literal type `"reference"` and `includeContent` is the literal type `false`. These are not defaults. They are not configurable. The type system forbids the other option, on purpose.

This is the cardinal rule of Eulinx expressed in a type:

```text
AI output MUST NOT directly mutate trusted state.
Worker -> Artifact -> Verify -> Merge.
```

An Artifact is the quarantine container for AI output. If an artifact edge inlined the content into the graph's value space, the content would be an ordinary value that any node could read, transform, and write onward, and the quarantine would be gone. Passing a handle means the content stays in the ArtifactManager, access goes through the ArtifactManager, and every read is mediated and logged.

`requireVerified` and `minVerificationLevel` gate traversal on the verification ladder. The levels are ordered:

```text
unverified                   rank 0   the Worker said so and nothing checked it
syntactic                    rank 1   it parses
deterministic_checks_passed  rank 2   linters, type checks, schema validation passed
tests_passed                 rank 3   the project's test suite passed against it
human_approved               rank 4   a person looked at it and said yes
```

An artifact edge traverses only when `rank(handle.verificationLevel) >= rank(minVerificationLevel)`. An artifact edge into a MergeNode MUST declare `minVerificationLevel` of at least `deterministic_checks_passed`, or the build-time validator raises `UnverifiedMergeInput`. This is the single check that prevents unreviewed AI output reaching the real project, and it is a build-time rejection rather than a run-time one because a graph that can even express that merge should not exist.

Restating the rule from the vault map inline rather than pointing elsewhere: **AI verdicts are advisory, deterministic verification is authoritative**. A `verificationLevel` of `deterministic_checks_passed` MUST have been set by a deterministic checker. A VerifierNode running an AI judge MUST NOT raise the level above `syntactic` on its own. Its opinion travels as a separate data edge carrying an advisory score. If an AI judge could stamp `tests_passed`, the ladder would be theatre.

`onUnverified`:

```text
block           state = guard_blocked. Target may activate via other edges. Default.
traverse_marked Traverse, but set handle.verificationLevel to the true (lower) value
                and deliver it anyway. The target MUST branch on it. Only legal when
                the target port type is ArtifactHandle with unverified in its range.
fail_target     Fail the target node with ArtifactNotVerified.
```

`lockPolicy.acquireReadLock: true` takes a LockManager read lock on the Artifact for the duration of the target node's execution. This prevents a concurrent ArtifactVersioning write from changing the content under a node that already read the handle. Any node that reads content and then acts on it MUST set this true. `onLockTimeout: "block"` re-queues the traversal; `"fail_target"` fails immediately.

## When the Engine Traverses It

```text
1.  Source node reaches terminal outcome succeeded or succeeded_with_warnings.
    Otherwise: state = cancelled.
2.  Read the ArtifactHandle from the source result at sourcePortId.
    Not an ArtifactHandle -> ArtifactEdgeCarriesRawValue. Fail source. Stop.
3.  state = pending.
4.  Ask the ArtifactManager for the CURRENT record for handle.artifactId.
    Absent -> ArtifactNotFound. Fail target. Stop.
5.  Compare handle.contentHash to the current record's contentHash.
    Mismatch -> ArtifactMutatedInFlight. Fail target. Stop. Never traverse a stale handle.
6.  If handle.artifactKind is not in artifactKinds: ArtifactKindMismatch. Fail target. Stop.
7.  If requireVerified and rank(current.verificationLevel) < rank(minVerificationLevel):
      apply onUnverified. Emit workflow.edge.blocked with reason under_verified.
8.  If guard present, evaluate. False -> state = guard_blocked. Stop.
9.  If lockPolicy.acquireReadLock: request a LockManager read lock, lockTimeoutMs.
      Timeout -> apply onLockTimeout.
10. Deliver a FRESH handle built from the current record, not the source's copy.
      The source's handle was a claim. The ArtifactManager's record is the truth.
11. state = traversed. Emit workflow.edge.traversed with artifactId, version,
      contentHash, and verificationLevel in the record.
12. Re-evaluate the target's ActivationPolicy.
```

Steps 4, 5, and 10 together are the anti-TOCTOU rule. The source node's handle is a claim made at some point in the past. Between then and now, ArtifactVersioning may have produced a new version. Re-reading the record, comparing the hash, and delivering a fresh handle is what makes an artifact edge safe in a graph with concurrent branches.

## Cardinality

```text
Fan-out from one artifact output port:  0..N   same handle to every target
Fan-in to a fanIn "one" port:           exactly 1
Fan-in to a fanIn "many" port:          0..N   collected as ArtifactHandle[], ordering asc
Artifact edges into one MergeNode:      1..N, each >= deterministic_checks_passed
Self-edge:                               FORBIDDEN -> SelfArtifactEdge
```

## Failure Modes

```text
ArtifactNotFound            No record for artifactId. Run-time. Fail target.
ArtifactMutatedInFlight     contentHash changed since production. Run-time. Fail target.
ArtifactKindMismatch        Kind not in artifactKinds. Run-time. Fail target.
ArtifactNotVerified         Below minVerificationLevel. Run-time. Per onUnverified.
ArtifactLockTimeout         Read lock not granted in time. Run-time. Per onLockTimeout.
ArtifactEdgeCarriesRawValue Source produced content, not a handle. Run-time. Fail source.
UnverifiedMergeInput        Merge input below deterministic_checks_passed. Build-time. Reject.
ArtifactContentInlined      includeContent is not false. Build-time. Reject. Type error too.
```

# Memory Edge

## Type

```ts
type MemoryPayload = {
  kind: "memory";
  direction: "read" | "write";
  scope: MemoryScope;
  query?: MemoryQuery;
  writeSpec?: MemoryWriteSpec;
  declaredType: PortTypeRef;
  onMiss: "empty" | "default" | "fail_target";
  defaultValue?: JsonValue;
  maxResultBytes: number;
};

type MemoryScope =
  | { level: "workspace"; workspaceId: string }
  | { level: "session"; sessionId: string }
  | { level: "worker"; workerId: string }
  | { level: "workflow_run"; runId: string };

type MemoryQuery = {
  mode: "key" | "semantic" | "tag";
  key?: string;
  semanticText?: string;
  tags?: string[];
  limit: number;
  minRelevance?: number;
};

type MemoryWriteSpec = {
  key: string;
  ttlMs?: number;
  tags: string[];
  overwrite: boolean;
  requiresPermission: true;
};
```

## Semantics

A memory edge reads from or writes to the MemoryManager as a side effect of traversal. It is the only kind whose traversal touches state outside the graph run, and that makes it the kind with the strictest rules.

The hard rule, stated plainly: **a memory edge with `direction: "write"` and an untrusted `origin` MUST be denied by the PermissionManager unless an explicit grant exists for that `edgeId`.** `writeSpec.requiresPermission` is the literal type `true` and cannot be set false. An AI-authored graph that can write to workspace memory can persist instructions that influence every future Worker in that workspace. That is a prompt-injection channel with a persistence layer attached, and it is closed by construction.

`scope` narrows by trust. The build-time validator enforces this table and there are no exceptions:

```text
scope.level     read by untrusted    write by untrusted
workflow_run    allowed              allowed
worker          allowed              allowed if workerId == the authoring Worker
session         allowed              DENIED -> IllegalMemoryWriteScope
workspace       allowed              DENIED -> IllegalMemoryWriteScope
```

A Worker may scribble in its own memory and its own run's memory. It may not write to the session or the workspace. Those writes come from trusted nodes only, which is the same shape as Worker -> Artifact -> Verify -> Merge applied to memory instead of code.

`maxResultBytes` caps a read, default 262144 (256 KiB). Semantic reads with a generous `limit` are how a context window gets silently filled with 400 KiB of retrieved memory. Exceeding the cap raises `MemoryResultTooLarge` and fails the target rather than truncating, because a silently truncated memory read produces a Worker that reasons over half its context and never knows.

`onMiss`:

```text
empty       Deliver [] for semantic/tag reads, or null for key reads. Requires nullable target.
default     Deliver defaultValue. Requires defaultValue present, else MissingMissDefault.
fail_target Fail the target with MemoryMiss. Default.
```

## When the Engine Traverses It

```text
1.  Source node reaches terminal outcome succeeded or succeeded_with_warnings.
    Otherwise: state = cancelled. A failed node's memory write MUST NOT happen.
2.  state = pending.
3.  If guard present, evaluate. False -> state = guard_blocked. Stop.
4.  Resolve scope against the run record. Unresolvable -> MemoryScopeUnresolvable. Fail target.
5.  If direction is write:
      5a. Check the trust table above. Violation -> IllegalMemoryWriteScope. Fail target.
      5b. Ask the PermissionManager: may edge.origin.authorId write to this scope?
          The PermissionManager fails closed. No grant means denied, not "probably fine".
          Denied -> MemoryWriteDenied. Fail target. Emit permission.denied. Stop.
      5c. If writeSpec.overwrite is false and the key exists:
          MemoryKeyExists. Fail target. Stop.
      5d. Read the value from the source port. Type check against declaredType.
      5e. Write via the MemoryManager with key, ttlMs, tags.
      5f. Deliver a MemoryWriteReceipt to the target port.
6.  If direction is read:
      6a. Execute query per mode: key, semantic, or tag. Apply limit and minRelevance.
      6b. If zero results: apply onMiss. Stop or continue accordingly.
      6c. Serialize. Over maxResultBytes -> MemoryResultTooLarge. Fail target. Do not truncate.
      6d. Type check the result against the TARGET port type.
      6e. Deliver.
7.  state = traversed. Emit workflow.edge.traversed with direction, scope, key or query
      digest, and result count. Never the result content.
8.  Re-evaluate the target's ActivationPolicy.
```

Step 5b is where the PermissionManager fails closed. There is no fallback branch, no "if the PermissionManager is unavailable, allow". Unavailable means denied.

Step 7 logs a query digest, never content. Memory contents may include anything the user ever told a Worker. The event log is broadly readable by the UI, metrics, and Replay. Content does not go in it.

A memory edge is **not** replayable by re-execution, because memory changes between runs. Replay MUST read the traversal record's stored result digest and the MemoryManager's versioned snapshot for that run, per [[Replay-Part01]]. This is why step 7's record is mandatory rather than nice to have.

## Cardinality

```text
Read memory edges into one input port:   governed by the port's fanIn rule
Write memory edges out of one port:      0..N, but two writes to the same
  (scope, key) within one graphVersion -> ConflictingMemoryWrites. Build-time. Reject.
Self-edge:                                FORBIDDEN -> SelfMemoryEdge
```

`ConflictingMemoryWrites` is detected statically on `(scope.level, scope id, writeSpec.key)`. Two nodes writing the same key in one graph have a race whose winner depends on scheduling, and a deterministic runtime does not ship races.

## Failure Modes

```text
MemoryWriteDenied         PermissionManager denied. Run-time. Fail target. Fail closed.
IllegalMemoryWriteScope   Untrusted write to session or workspace. Build-time. Reject.
MemoryScopeUnresolvable   Scope id not in the run record. Run-time. Fail target.
MemoryMiss                Zero results. Run-time. Per onMiss.
MemoryKeyExists           overwrite false, key present. Run-time. Fail target.
MemoryResultTooLarge      Over maxResultBytes. Run-time. Fail target. Never truncate.
ConflictingMemoryWrites   Two writers, one key, one graphVersion. Build-time. Reject.
MissingMissDefault        onMiss default, defaultValue absent. Build-time. Reject.
MemoryWriteFromFailedNode Source failed. Not an error. state = cancelled. No write.
```

# Event Edge

## Type

```ts
type EventPayload = {
  kind: "event";
  eventTopic: string;
  mode: "emit" | "subscribe";
  filter?: EventFilter;
  declaredType: PortTypeRef;
  delivery: "at_least_once";
  subscribeTimeoutMs?: number;
  onTimeout?: "block" | "fail_target" | "traverse_empty";
  bufferPolicy: EventBufferPolicy;
};

type EventFilter = {
  sourceKinds?: ("worker" | "node" | "runtime" | "user")[];
  scopeRunId?: string;
  predicate?: GuardExpr;
};

type EventBufferPolicy = {
  maxBuffered: number;
  onOverflow: "drop_oldest" | "fail_target";
};
```

## Semantics

An event edge connects a node to the EventBus. It is the asynchronous kind, and it is the only kind whose traversal is not triggered by its source node reaching a terminal state.

`mode: "emit"` publishes the source port's value to `eventTopic`. Traversal completes as soon as the EventBus accepts the publish. It does not wait for any subscriber. Fire and forget.

`mode: "subscribe"` makes the TARGET node wait for a matching event. The source node's completion arms the subscription; the event's arrival traverses the edge. This inverts the normal trigger relationship, and it is why event edges are drawn `-.->` in every diagram in this vault.

`delivery` is the literal type `"at_least_once"`. Exactly-once is not offered because it cannot be provided across a process boundary without a distributed transaction, and pretending otherwise would make every subscriber's author assume a guarantee that does not exist. **Every subscribing node MUST be idempotent.** A subscriber that increments a counter is a bug. A subscriber that sets a value is fine.

`eventTopic` MUST match `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$` and MUST be declared in the ToolRegistry topic catalog. An undeclared topic is `UnknownEventTopic` at build time. Free-form topics mean typos become silent no-subscribers, and the graph looks fine while doing nothing.

Emitting to a reserved runtime topic is `ReservedTopicEmit`, rejected at build time. Reserved prefixes:

```text
worker.*      owned by the worker system
runtime.*     owned by RuntimeManager
workflow.*    owned by the workflow engine
permission.*  owned by PermissionManager
lock.*        owned by LockManager
artifact.*    owned by ArtifactManager
```

Nodes may subscribe to reserved topics. Nodes may never emit on them. A node that could emit `permission.granted` could forge a grant.

`bufferPolicy` handles events arriving faster than the target consumes. `drop_oldest` keeps the newest `maxBuffered` and emits `workflow.edge.events_dropped` with the drop count, which MUST NOT be silent. `fail_target` fails with `EventBufferOverflow`.

## When the Engine Traverses It

For `mode: "emit"`:

```text
1. Source node reaches terminal outcome succeeded or succeeded_with_warnings.
   Otherwise: state = cancelled. A failed node MUST NOT emit its event.
2. state = pending.
3. If guard present, evaluate. False -> state = guard_blocked. Stop.
4. Read the value at sourcePortId. Type check against declaredType.
5. Check topic: reserved prefix -> ReservedTopicEmit. Fail source. Stop.
6. Publish to the EventBus on eventTopic. Publish failure -> EventPublishFailed. Fail source.
7. state = traversed. Emit workflow.edge.traversed with the topic and a payload digest.
```

For `mode: "subscribe"`:

```text
1.  Source node reaches terminal outcome succeeded or succeeded_with_warnings.
    This ARMS the subscription. It does not traverse the edge.
2.  Register a subscription on eventTopic with the EventFilter.
3.  state = pending. Start subscribeTimeoutMs if present.
4.  On each incoming event:
      4a. Apply filter.sourceKinds. No match -> ignore, stay pending.
      4b. Apply filter.scopeRunId. No match -> ignore, stay pending.
      4c. Apply filter.predicate as a GuardExpr over the event body.
          No match -> ignore, stay pending.
      4d. Buffer it. Over maxBuffered -> apply bufferPolicy.onOverflow.
      4e. Type check the event body against the target port type.
          Fail -> state = type_rejected. Fail target. Stop.
      4f. Deliver. state = traversed. Emit workflow.edge.traversed.
      4g. Unsubscribe. One event per armed subscription per graph run.
5.  On timeout: apply onTimeout.
      block           state = guard_blocked. Target may activate via siblings.
      fail_target     Fail target with EventSubscribeTimeout.
      traverse_empty  Deliver null. Target port MUST be nullable, else TraverseEmptyNonNullable.
6.  On graph run end while still pending: unsubscribe. state = cancelled.
    A leaked subscription outlives its run and fires into a dead graph.
```

Step 4g is mandatory. A subscription that stays armed after delivering will deliver again, and the target will re-run, and the graph is no longer a DAG traversal but a reactive loop nobody declared.

Step 6 is the cleanup nobody writes until they have leaked a hundred subscriptions. Write it now.

An event edge is **not deterministic by nature**, which is why Replay does not re-subscribe. Replay reads the traversal record's stored event body and delivers it directly. This is the only way a reactive edge coexists with the determinism invariant, and it means the traversal record MUST store the full (redacted) event body rather than a digest for subscribe-mode edges.

## Cardinality

```text
Emit edges on one topic:              0..N   many nodes may emit the same topic
Subscribe edges on one topic:         0..N   many nodes may subscribe
Subscribe fan-in to one port:         governed by the port's fanIn rule
Self-edge (emit to own subscription): FORBIDDEN -> SelfEventEdge
A subscribe edge whose topic no node in the graph emits and which is not a
  reserved runtime topic: NoPossibleEmitter. Build-time WARNING, not an error.
  External processes may emit it.
```

## Failure Modes

```text
UnknownEventTopic          Topic not in the catalog. Build-time. Reject.
ReservedTopicEmit          Emit on a reserved prefix. Build-time. Reject.
EventPublishFailed         EventBus rejected the publish. Run-time. Fail source.
EventSubscribeTimeout      No matching event in time. Run-time. Per onTimeout.
EventBufferOverflow        Over maxBuffered, policy fail_target. Run-time. Fail target.
EventTypeRejected          Body failed the target type check. Run-time. Fail target.
TraverseEmptyNonNullable   traverse_empty into a non-nullable port. Build-time. Reject.
LeakedSubscription         Subscription outlived its run. Engine bug. Log at error.
NoPossibleEmitter          No in-graph emitter. Build-time WARNING only.
```

# Related Documents

- [[EdgeTypes-Part01]]
- [[EdgeTypes-Part02]]
- [[EdgeTypes-Part04]]
- [[EdgeTypes-Part05]]
- [[EdgeTypes-Diagrams]]
- [[LoopNodes-Part01]]
- [[VerifierNodes-Part01]]
- [[MCPNodes-Part01]]
- [[ExecutionFlow-Part01]]
- [[DynamicGraphs-Part01]]
- [[ArtifactManager-Part01]]
- [[MemoryArchitecture-Part01]]
- [[PermissionManager-Part01]]
- [[LockManager-Part01]]
- [[EventBus-Part01]]
- [[Replay-Part01]]
