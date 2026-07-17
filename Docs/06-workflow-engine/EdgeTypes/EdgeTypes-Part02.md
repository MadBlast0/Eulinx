---
title: EdgeTypes Specification - Part 02
status: draft
version: 1.0
tags:
  - workflow-engine
  - edge-types
  - architecture
related:
  - "[[EdgeTypes-Part01]]"
  - "[[EdgeTypes-Part03]]"
  - "[[NodeArchitecture-Part01]]"
---

# EdgeTypes Specification (Part 02)

Part 01 defined the base `Edge`. This part defines the first four of the eight kinds. Part 03 defines the remaining four.

Each kind is specified with the same six sections, in the same order, every time: the full payload type, semantics, when the engine traverses it, cardinality rules, failure modes, and a worked shape. Do not skim one because it "looks like the previous one". Control and data edges differ on when they traverse, which is the entire behaviour.

# The Payload Discriminant

```ts
type EdgePayload =
  | ControlPayload
  | DataPayload
  | ConditionalPayload
  | ErrorPayload
  | LoopBackPayload
  | ArtifactPayload
  | MemoryPayload
  | EventPayload;
```

The discriminant field is `payload.kind`, and it MUST equal `edge.kind`. A mismatch is `PayloadKindMismatch`, caught by the build-time validator in Part 05, and is a serialization bug rather than an authoring bug. Check it anyway. It costs one comparison and it catches a whole class of hand-edited-JSON corruption.

# Control Edge

## Type

```ts
type ControlPayload = {
  kind: "control";
  semantics: "sequence" | "join_barrier" | "fanout_trigger";
  waitForTerminal: boolean;
  propagateSkip: boolean;
  minSourceOutcome: NodeOutcome;
};

type NodeOutcome =
  | "succeeded"
  | "succeeded_with_warnings"
  | "failed"
  | "skipped"
  | "cancelled"
  | "timed_out";
```

## Semantics

A control edge carries **no value**. It carries permission to proceed. Its only statement is "the target may now be considered for eligibility, because the source reached an acceptable outcome".

`minSourceOutcome` is the acceptance bar, and it is ordered:

```text
succeeded                 rank 0   best
succeeded_with_warnings   rank 1
skipped                   rank 2
timed_out                 rank 3
failed                    rank 4
cancelled                 rank 5   worst
```

The control edge traverses when `rank(actualOutcome) <= rank(minSourceOutcome)`. Default `minSourceOutcome` is `succeeded`, meaning only a clean success propagates. Setting it to `succeeded_with_warnings` accepts both ranks 0 and 1. Setting it to `failed` accepts everything except `cancelled`, which is almost always a mistake and which the build-time validator flags as a warning, not an error.

`propagateSkip: true` means that if the source was skipped, the target is also marked `skipped` rather than merely not activated. This is how a skipped branch of a `ConditionNode` marks its entire downstream subtree skipped instead of leaving it hanging forever in `inactive`. Getting this wrong produces the hung-workflow failure mode described in Part 01.

The three `semantics` values:

```text
sequence         Plain "A then B". One source, one target. The common case.
join_barrier     Target waits for ALL incoming control edges. Pairs with mode: "all".
fanout_trigger   One source releases N targets simultaneously. Pairs with fan-out many.
```

`semantics` MUST NOT change traversal logic. It is a declaration of author intent that the build-time validator cross-checks against the actual graph shape. A `sequence` control edge into a port that has four incoming edges raises `ControlSemanticsShapeMismatch`. This is a lint that catches copy-paste graph errors before they become 3 a.m. debugging.

## When the Engine Traverses It

```text
1. Source node reaches a terminal NodeOutcome.
2. Edge state moves inactive -> pending.
3. Compute rank(actualOutcome).
4. If rank(actualOutcome) > rank(minSourceOutcome):
     If propagateSkip and actualOutcome is skipped: mark target skipped, state = traversed.
     Else: state = guard_blocked. Emit workflow.edge.blocked with reason outcome_below_bar.
     Stop.
5. If guard present, evaluate. False -> state = guard_blocked. Stop.
6. If waitForTerminal is true and source has non-terminal children still running:
     Remain pending. Re-check when the last child terminates.
7. state = traversed. Deliver the unit value to the target control port.
8. Emit workflow.edge.traversed.
9. Re-evaluate the target's ActivationPolicy.
```

Step 6 is the difference between "the node's own function returned" and "everything the node started has finished". A BuilderNode that spawned three Workers is not done when its function returns. `waitForTerminal: true` is the default for any node kind that can spawn Workers.

## Cardinality

```text
Fan-out from one output control port:  0..N   unrestricted
Fan-in to one input control port:      0..N   allowed, governed by ActivationPolicy
Self-edge (source == target):          FORBIDDEN -> SelfControlEdge
```

A control port with zero incoming control edges and zero incoming data edges is an entry node. A graph MUST have at least one entry node or it raises `NoEntryNode`.

## Failure Modes

```text
SourceOutcomeBelowBar        Not an error. state = guard_blocked. Target may activate via siblings.
DanglingControlTarget        targetNodeId absent. Build-time. Graph rejected.
SelfControlEdge              source == target. Build-time. Graph rejected.
ControlSemanticsShapeMismatch  Declared semantics contradicts graph shape. Build-time warning.
ControlEdgeCarriesValue      payload has a value field. Build-time. Graph rejected.
HungTargetNode               All incoming control edges terminal, none traversed, mode "all".
                             Run-time. Target marked skipped. Emit workflow.node.skipped.
```

`HungTargetNode` is the one to internalize. Under `mode: "all"` with every incoming edge blocked, the target is not eligible and never will be. The engine MUST detect this the moment the last incoming edge reaches a terminal state, and MUST mark the target `skipped` rather than leaving it `inactive`. A workflow that waits forever is worse than a workflow that fails.

# Data Edge

## Type

```ts
type DataPayload = {
  kind: "data";
  declaredType: PortTypeRef;
  transform?: TransformSpec;
  nullable: boolean;
  defaultValue?: JsonValue;
  copyMode: "by_value" | "by_reference";
  maxBytes: number;
  redact: RedactionSpec | null;
};

type RedactionSpec = {
  paths: string[];
  replacement: "[REDACTED]";
  applyTo: "event_log_only" | "event_log_and_value";
};
```

## Semantics

A data edge carries exactly one value from a source output port to a target input port. It is the only mechanism by which a produced value reaches a consumer.

`copyMode` is load-bearing and is not a performance knob:

```text
by_value       The value is deep-cloned at traversal. Target mutation cannot affect source.
               MANDATORY default. MANDATORY for every untrusted Edge, no exception.
by_reference   The target receives a handle to the same value. Permitted ONLY when the
               source port declares immutable: true and edge.origin.trusted is true.
```

`by_reference` on an untrusted edge is `IllegalReferenceCopyMode`, rejected at build time. The reason is direct: a by-reference value shared between a trusted node and an AI-authored node is a channel for AI output to mutate trusted state without going through Artifact -> Verify -> Merge. That is the cardinal rule of Eulinx, and this field is where a careless optimization breaks it.

`maxBytes` caps the serialized value size. Default is 1048576 (1 MiB). Exceeding it raises `DataEdgePayloadTooLarge` at run time and fails the target node. Large values do not travel on data edges. They become Artifacts and travel on artifact edges. See Part 03.

`nullable` and `defaultValue` interact precisely:

```text
nullable: true,  defaultValue absent   -> null is a legal delivered value.
nullable: true,  defaultValue present  -> null is replaced by defaultValue at traversal.
nullable: false, defaultValue present  -> null is replaced by defaultValue at traversal.
nullable: false, defaultValue absent   -> null raises NullOnNonNullableEdge. Target fails.
```

`redact` scrubs listed JSON paths before the value is written to the EventBus traversal record. With `applyTo: "event_log_and_value"` it also scrubs the value delivered to the target. This exists so a data edge carrying a credential can still emit a traversal event without writing the credential into the replay log. Everything important emits an event; nothing important leaks into it.

## When the Engine Traverses It

```text
1.  Source node reaches terminal outcome succeeded or succeeded_with_warnings.
    Any other outcome: state = cancelled. A data edge NEVER carries a failed node's output.
2.  Read the value at sourcePortId from the node result record.
3.  If value is undefined: raise MissingSourcePortValue. Fail source node. Stop.
4.  state = pending.
5.  If guard present, evaluate. False -> state = guard_blocked. Stop.
6.  If value is null: apply the nullable/defaultValue table above.
7.  If transform present: apply per Part 05. Transform error -> state = type_rejected.
8.  Serialize. If byteLength > maxBytes: raise DataEdgePayloadTooLarge. Fail target. Stop.
9.  Run-time type check the value against the TARGET port's declared type (Part 04 step 7).
    Fail -> state = type_rejected. Emit workflow.edge.rejected. Fail target node.
10. If copyMode is by_value: deep clone.
11. Deliver to the target input port slot.
12. Apply redact to the event copy.
13. state = traversed. Emit workflow.edge.traversed with the redacted value digest.
14. Re-evaluate the target's ActivationPolicy.
```

Step 1 is the rule implementers break. A data edge from a failed node MUST NOT traverse. If you want a failed node's diagnostic to reach a handler, that is an error edge, and it is a different kind with different semantics. See below.

Step 9 checks against the target type, not the source type. The source type was already proven compatible at build time. What the run-time check catches is the source node producing a value that does not actually match its own declared output type, which happens constantly when the source is an AI node.

## Cardinality

```text
Fan-out from one output data port:   0..N   the same value goes to every target
Fan-in to a port with fanIn "one":   exactly 1   two edges -> DuplicateInputBinding
Fan-in to a port with fanIn "many":  0..N   collected into an array, ordering asc
Fan-in to a port with fanIn "merge": 0..N   shallow-merged object, ordering asc, last wins
Self-edge:                            FORBIDDEN -> SelfDataEdge
```

For `fanIn: "many"` the delivered value is an array whose element type MUST be the port's element type. For `fanIn: "merge"` every incoming edge MUST deliver an object type, or the build-time validator raises `MergeFanInNonObject`.

## Failure Modes

```text
MissingSourcePortValue      Source declared the port, produced no value. Run-time. Fail source.
NullOnNonNullableEdge       null with nullable false and no default. Run-time. Fail target.
DataEdgePayloadTooLarge     Serialized size over maxBytes. Run-time. Fail target.
EdgeTypeMismatchAtRuntime   Value failed target type check. Run-time. Fail target.
DuplicateInputBinding       Two edges into a fanIn "one" port. Build-time. Reject graph.
IllegalReferenceCopyMode    by_reference on untrusted or mutable port. Build-time. Reject.
MergeFanInNonObject         Non-object into a merge port. Build-time. Reject.
TransformFailed             Transform threw or produced wrong type. Run-time. Fail target.
```

# Conditional Edge

## Type

```ts
type ConditionalPayload = {
  kind: "conditional";
  branchKey: string;
  branchSet: string[];
  isDefault: boolean;
  carriesValue: boolean;
  declaredType?: PortTypeRef;
  exclusivity: "exclusive" | "inclusive";
};
```

## Semantics

A conditional edge is an outgoing edge from a decision port whose traversal depends on a discrete branch selection made by the source node itself, not by a guard on the edge.

The distinction from a guarded data edge is sharp and matters:

```text
Guarded data edge:  the EDGE decides, by evaluating a predicate over the value.
Conditional edge:   the NODE decides, by naming a branchKey in its result.
```

A `ConditionNode` (see [[ConditionNodes-Part01]]) returns `{ branch: "approved" }`. Every outgoing conditional edge whose `branchKey` equals `"approved"` traverses. Every other one is cancelled. The node made the choice. The edge only obeys it.

`branchSet` is the complete set of legal branch keys for this decision port. Every conditional edge leaving one port MUST declare an identical `branchSet`, or the build-time validator raises `InconsistentBranchSet`. The validator additionally proves **exhaustiveness**: for every key in `branchSet` there MUST exist at least one outgoing conditional edge with that `branchKey`, or there MUST exist exactly one edge with `isDefault: true`. Otherwise `NonExhaustiveBranchCoverage`. A decision with an unhandled branch is a workflow that stops with no explanation, and the validator refuses to ship one.

`exclusivity`:

```text
exclusive   At most one branchKey may be selected. Multi-select -> ExclusiveBranchViolation.
inclusive   The node may select several keys. All matching edges traverse.
```

All conditional edges from one port MUST agree on `exclusivity`, or `MixedBranchExclusivity`.

`carriesValue: true` makes the conditional edge also deliver a value, exactly like a data edge, and `declaredType` becomes mandatory. `carriesValue: false` makes it behave like a control edge. `carriesValue: true` with `declaredType` absent is `ConditionalMissingDeclaredType`.

## When the Engine Traverses It

```text
1.  Source node reaches terminal outcome succeeded or succeeded_with_warnings.
    Otherwise: all outgoing conditional edges -> cancelled.
2.  Read selectedBranches: string[] from the source result at sourcePortId.
3.  If selectedBranches is empty:
      If an isDefault edge exists: selectedBranches = [that edge's branchKey].
      Else: raise NoBranchSelected. Fail source node. Stop.
4.  For each key in selectedBranches: if key not in branchSet: raise UnknownBranchKey.
      Fail source node. Stop. Do not guess. Do not fall through to default.
5.  If exclusivity is exclusive and selectedBranches.length > 1:
      raise ExclusiveBranchViolation. Fail source node. Stop.
6.  Collect outgoing conditional edges. Sort ordering asc, then edgeId asc.
7.  For each edge:
      If edge.branchKey in selectedBranches: state = pending. Continue to 8.
      Else: state = cancelled. If payload.propagate rules apply, mark target skipped.
8.  If guard present, evaluate. False -> state = guard_blocked.
9.  If carriesValue: run steps 6..12 of the data edge traversal algorithm.
10. state = traversed. Emit workflow.edge.traversed with branchKey in the record.
11. Every cancelled sibling's target: if it has no other live incoming edge,
      mark it skipped and propagate skip downstream. This prevents HungTargetNode.
```

Step 4 forbids guessing. An AI-authored ConditionNode returning `"aproved"` for a `branchSet` of `["approved", "rejected"]` MUST fail loudly. Silently taking the default here means a typo in a model's output silently routes work down the wrong branch, and nothing in the system will ever tell you.

Step 11 is mandatory and is the most-skipped step in this document. Cancelling an edge without pruning its downstream subtree leaves nodes waiting on a value that will never arrive.

## Cardinality

```text
Fan-out from one decision port:  >= 1, and MUST cover branchSet or have a default
Fan-in to a target port:         governed by the target port's own fanIn rule
isDefault edges per port:        0 or 1. Two -> MultipleDefaultBranches
Self-edge:                        FORBIDDEN -> SelfConditionalEdge
```

## Failure Modes

```text
NoBranchSelected             Empty selection, no default. Run-time. Fail source.
UnknownBranchKey             Key not in branchSet. Run-time. Fail source. Never guess.
ExclusiveBranchViolation     Multi-select on exclusive. Run-time. Fail source.
NonExhaustiveBranchCoverage  branchSet key with no edge and no default. Build-time. Reject.
InconsistentBranchSet        Siblings disagree on branchSet. Build-time. Reject.
MixedBranchExclusivity       Siblings disagree on exclusivity. Build-time. Reject.
MultipleDefaultBranches      Two isDefault edges from one port. Build-time. Reject.
ConditionalMissingDeclaredType  carriesValue true, no declaredType. Build-time. Reject.
```

# Error Edge

## Type

```ts
type ErrorPayload = {
  kind: "error";
  catches: ErrorClass[];
  declaredType: PortTypeRef;
  includeStackTrace: boolean;
  includePartialOutput: boolean;
  markHandled: boolean;
  retryHint?: RetryHint;
};

type ErrorClass =
  | "node_internal_error"
  | "node_timeout"
  | "worker_failed"
  | "verification_failed"
  | "permission_denied"
  | "tool_error"
  | "budget_exhausted"
  | "edge_type_mismatch"
  | "any";

type RetryHint = {
  maxAttempts: number;
  backoffMs: number;
  backoffFactor: number;
  jitter: false;
};

type ErrorEnvelope = {
  errorClass: ErrorClass;
  errorCode: string;
  message: string;
  sourceNodeId: string;
  attempt: number;
  at: string;
  stackTrace?: string;
  partialOutput?: JsonValue;
  workerId?: string;
  artifactId?: string;
};
```

## Semantics

An error edge is the ONLY kind that traverses when its source node fails. It carries an `ErrorEnvelope`, never the node's normal output.

This kind exists because the alternative is worse. Without it, error handling has to be expressed as a data edge from a node that failed, which forces the data edge to sometimes carry output and sometimes carry a diagnostic, which destroys the type contract on the data edge. Splitting the failure path into its own kind keeps the success path's types honest.

`catches` is an ordered match list. The engine tests the actual `errorClass` against each entry in array order and traverses on the first match. `"any"` matches everything and MUST be last if present, or the build-time validator raises `UnreachableCatchClause`. Two sibling error edges whose `catches` lists overlap raise `OverlappingCatchClauses` unless their `ordering` values differ, in which case lower `ordering` wins and the other is cancelled.

`markHandled: true` means the source node's failure is considered handled: the workflow does not fail, and the run's final outcome is not marked failed on account of this node. `markHandled: false` means the error is observed and routed, but the workflow still fails at the end. Default is `false`. A handler that silently swallows failures by default is how a broken pipeline reports green.

`includePartialOutput: true` attaches whatever the node produced before failing. This value is **untrusted by construction** and MUST be typed as `Json` in the target port, never as a refined type. A partial output from a crashed AI node is not a validated value and MUST NOT be typed as though it were.

`retryHint` does not perform a retry. Edges never retry. It is data delivered to the handler node, which may itself decide to route back into a retry subgraph. Keeping retry policy out of the edge keeps the edge deterministic.

## When the Engine Traverses It

```text
1.  Source node reaches terminal outcome failed or timed_out.
    Outcome cancelled: all error edges -> cancelled. A cancel is not a failure.
    Outcome succeeded or succeeded_with_warnings: all error edges -> cancelled.
2.  Build the ErrorEnvelope from the node's failure record.
3.  Collect outgoing error edges. Sort ordering asc, then edgeId asc.
4.  For each edge, in that order:
      If envelope.errorClass is in edge.catches (or catches contains "any"):
        state = pending. Break the loop. Only the FIRST match traverses.
      Else: state = cancelled.
5.  If no edge matched: the error is unhandled. Fail the workflow run with
      UnhandledNodeError. Emit workflow.run.failed. Stop.
6.  If guard present, evaluate. False -> state = guard_blocked. The error is now
      unhandled. Go to step 5.
7.  Strip stackTrace if includeStackTrace is false.
8.  Strip partialOutput if includePartialOutput is false.
9.  Run-time type check the envelope against the target port's declared type.
10. Deliver. state = traversed. Emit workflow.edge.traversed with errorClass in the record.
11. If markHandled is true: mark the source node's failure handled in the run record.
12. Re-evaluate the target's ActivationPolicy.
```

Step 4 breaks on first match. Error edges are not broadcast. This mirrors `catch` clause semantics in every language an implementer has used, and diverging from it here would surprise everyone.

Step 6 is subtle and correct: a guard that blocks the only matching error edge leaves the error unhandled. It does not silently discard it. Falling through to step 5 is what makes a guarded error edge safe to write.

## Cardinality

```text
Fan-out from one node's error port:  0..N   first match wins, not broadcast
Fan-in to one handler input port:    0..N   many nodes may share one handler
Self-edge:                            FORBIDDEN -> SelfErrorEdge
Error edge into a node that also has data edges from the same source: allowed,
  but the two are mutually exclusive at run time by construction.
```

## Failure Modes

```text
UnhandledNodeError        No matching error edge. Run-time. Fail the workflow run.
UnreachableCatchClause    A clause after "any". Build-time. Reject graph.
OverlappingCatchClauses   Ambiguous siblings, equal ordering. Build-time. Reject graph.
ErrorEdgeFromSuccessPath  catches list is empty. Build-time. Reject graph.
PartialOutputOverTyped    includePartialOutput true, target port type is not Json.
                          Build-time. Reject graph.
ErrorHandlerFailed        The handler node itself failed. Its own error edges apply.
                          If it has none: UnhandledNodeError. No infinite regress.
```

`ErrorHandlerFailed` deserves a note. A handler that fails is just a node that failed. It gets no special treatment, its own error edges are consulted, and if it has none the run fails. There is no automatic outer handler and no recursion. This is deliberate: an implicit handler-of-handlers is unbounded and untestable.

# Related Documents

- [[EdgeTypes-Part01]]
- [[EdgeTypes-Part03]]
- [[EdgeTypes-Part04]]
- [[EdgeTypes-Part05]]
- [[EdgeTypes-Diagrams]]
- [[NodeArchitecture-Part01]]
- [[NodeTypes-Part01]]
- [[ConditionNodes-Part01]]
- [[BuilderNodes-Part01]]
- [[ExecutionFlow-Part01]]
- [[EventBus-Part01]]
