---
title: LoopNodes Specification - Part 03
status: draft
version: 1.0
tags:
  - workflow-engine
  - loop-nodes
  - architecture
related:
  - "[[LoopNodes-Part02]]"
  - "[[LoopNodes-Part04]]"
  - "[[NodeArchitecture-Part01]]"
  - "[[DynamicGraphs-Part01]]"
---

# LoopNodes Specification (Part 03)

# Scope Of This Part

The loop body subgraph, the iteration context bound into it, and the iteration state carried across iterations.

Three things are easy to confuse and MUST be kept distinct:

```text
BODY SUBGRAPH     the shape of the work. Immutable. Same for every iteration.
ITERATION CONTEXT what THIS iteration is told. Fresh and immutable per iteration.
ITERATION STATE   what the LOOP remembers across iterations. Mutable, loop-owned.
```

The body reads the iteration context. The body MUST NOT read or write iteration state. Only the loop engine touches iteration state. Every bug where iteration 7 corrupts iteration 8 comes from violating that sentence.

# The Body Subgraph

## Definition

```ts
type LoopBodySubgraph = {
  subgraphId: string;
  parentLoopNodeId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  entryNodeId: string;
  exitNodeId: string;
  declaredInputs: BodyInputDecl[];
  declaredOutput: LoopBodyOutputSpec;
};

type BodyInputDecl = {
  name: string;
  type: ValueType;
  required: boolean;
  source: "iteration_context" | "loop_scope";
};
```

A body subgraph is a normal Eulinx workflow subgraph. Its nodes are normal nodes implementing the contract in [[NodeArchitecture-Part01]]. There is no special "loop body node type".

## Structural rules, all enforced at graph-build time

1. The body MUST be acyclic. The LoopNode supplies the only cycle. A cycle inside the body is error `body_subgraph_cyclic`.
2. The body MUST have exactly one `entryNodeId` with no inbound edges from within the body. Error: `body_entry_ambiguous`.
3. The body MUST have exactly one `exitNodeId` with no outbound edges within the body. Error: `body_exit_ambiguous`. Multiple terminal branches converge on a join node; that join is the exit.
4. Every node in the body MUST be reachable from `entryNodeId`. Unreachable body nodes are error `body_node_unreachable`, not dead-code warnings, because an unreachable node in a loop is usually a mis-wired condition branch.
5. The body MUST NOT contain a merge node. Error: `merge_inside_loop_body`. Merging is post-loop, on the accepted result, via [[MergeFlow-Part01]].
6. The body MAY contain another LoopNode. Nesting is legal and Part 05 defines how nested budgets compose.
7. The body MUST NOT contain an edge to any node outside the body subgraph, and no node outside may edge into a body node. The body is entered only through the LoopNode. Error: `body_boundary_violation`.

Rule 7 is the one that makes loops analyzable. If an outside node could jump into the middle of a body, iteration count, budget accounting, and Replay all become undefined.

## The body is immutable during the loop

The body subgraph is a value. The loop engine holds a frozen reference for the whole run.

Eulinx supports dynamic graphs; see [[DynamicGraphs-Part01]]. A Worker inside a body may legitimately propose graph changes. Those proposals MUST NOT take effect on the loop currently executing that body.

```text
A graph mutation proposed during iteration N
MUST NOT be visible to iteration N+1 of the same loop.
It applies after the loop is terminal, or it does not apply.
```

Reason: if the body can rewrite itself mid-loop, then iteration count, cost projections, and the guards' meaning all change under the guards. A loop that can grow its own body is an unbounded loop with extra steps. The engine MUST queue such proposals into `LoopState.pendingGraphMutations` and hand them to the graph mutation path only after the loop reaches a terminal status.

## Body output extraction

```ts
type LoopBodyOutputSpec = {
  valuePath: string;
  expectedType: ValueType;
  requiredOnSuccess: boolean;
};
```

After the exit node completes, the engine extracts the body's output:

1. Resolve `valuePath` against the exit node's output object.
2. If undefined and `requiredOnSuccess` is true, the iteration is a failure with `IterationError.kind = "body_output_missing"`.
3. If undefined and `requiredOnSuccess` is false, the output is `null` and the iteration is a success.
4. If defined but the runtime type does not match `expectedType`, the iteration is a failure with `body_output_type_mismatch`. There is no coercion.
5. Deep-freeze the extracted value before storing it in the `IterationRecord`.

# The Iteration Context

## Definition

```ts
type IterationContext = {
  loopNodeId: string;
  executionId: string;

  iteration: number;
  isFirst: boolean;
  isLast: boolean | null;

  bindings: Readonly<Record<string, JsonValue>>;

  lastOutput: JsonValue | null;
  lastOutcome: "success" | "failed" | null;
  lastError: IterationError | null;

  accumulator: JsonValue;

  spend: Readonly<LoopSpend>;
  remaining: Readonly<LoopRemaining>;

  deadlineAt: string;
  cancellationToken: string;
};

type LoopRemaining = {
  iterations: number;
  wallClockMs: number;
  tokens: number;
  costUsd: number;
};
```

## Reserved keys

These names MUST NOT be used as `itemBinding`, `indexBinding`, or any accumulator `resultBinding`. Collision is build error `reserved_binding_name`.

```text
loopNodeId  executionId  iteration   isFirst     isLast
bindings    lastOutput   lastOutcome lastError   accumulator
spend       remaining    deadlineAt  cancellationToken
```

## Construction rules

The engine builds a fresh `IterationContext` before every iteration. It MUST NOT reuse the previous object with fields mutated. Every iteration gets a new frozen object.

1. `iteration` is `LoopState.iteration`, zero-indexed.
2. `isFirst` is `iteration === 0`.
3. `isLast` is computable only for `for_each` with a frozen collection: `iteration === frozenCollection.length - 1`. For all other kinds it is `null`, because nothing knows whether a `while` is on its last pass. Implementers MUST NOT guess it from `remaining.iterations === 1`; that conflates "the guard is about to trip" with "the work is about to finish", and body logic keyed on the wrong one produces subtly wrong output on the final pass.
4. `bindings` is the `ContinuationDecision.bindings` from Part 02, deep-frozen.
5. `lastOutput`, `lastOutcome`, `lastError` come from the last `IterationRecord`, or are `null` on the first iteration.
6. `accumulator` is the current fold value, deep-frozen. See Part 04.
7. `spend` and `remaining` are snapshots taken at the boundary. They do not update mid-iteration.
8. `deadlineAt` is `min(loop wall-clock deadline, workflow deadline, parent loop deadline)`.
9. `cancellationToken` is the workflow's token; body nodes MUST honor it.
10. The whole object is deep-frozen. In debug builds the engine MUST assert that a body node did not attempt to write to it.

## Visibility rules

A body node sees:

- its own upstream body-node outputs, per the normal node contract
- the `IterationContext` under the reserved namespace `$iter`
- the loop's read-only scope: workflow inputs and outputs of nodes upstream of the LoopNode

A body node MUST NOT see:

- `LoopState` itself
- `LoopState.iterations`, the full history. It sees only `lastOutput`.
- any other iteration's context, including in parallel mode
- the guards' configured values, only `remaining`

The distinction between `spend`/`remaining` (visible) and `guards` (hidden) matters. A Worker may reasonably be told "you have about 4000 tokens left, be brief". A Worker MUST NOT be told the guard structure, because prompt-injected output that reasons about how to avoid tripping a guard is exactly the adversarial behavior the guards exist to catch.

# Iteration State

## What the loop remembers

`LoopState` is defined in Part 01. This section defines who may write each field.

```text
field                  writer                       when
-----------------------+----------------------------+--------------------------------
status                 loop engine                  on transition
iteration              loop engine                  once per accepted iteration, +1
startedAt              loop engine                  once, on entry
lastIterationAt        loop engine                  after each iteration
spend                  loop engine                  folded from iteration spend
accumulatorValue       loop engine                  after each successful iteration
progressWindow         loop engine                  after each iteration
iterations             loop engine                  append-only
failedIterationCount   loop engine                  on failed iteration
stopReason             loop engine                  once, on terminal
```

Every writer is the loop engine. No body node, no Worker, no Verifier, and no ConditionNode writes any field of `LoopState`. The table has one column of the same value on purpose.

## The increment rule

`iteration` increments exactly once per iteration that actually ran, and it increments **after** the iteration completes and its record is appended, not before it starts.

```text
WRONG                              RIGHT
  state.iteration += 1               ctx = buildContext(state.iteration)
  ctx = buildContext(...)            record = runBody(ctx)
  runBody(ctx)                       state.iterations.push(record)
                                     state.iteration += 1
```

The wrong version makes `iteration` mean "iterations started", which drifts from `iterations.length` the moment one is cancelled mid-flight. Then `maxIterations` counts starts, not completions, and a loop that crashes at iteration 3 twenty times looks like forty iterations. The invariant `state.iteration === state.iterations.length` MUST hold at every boundary, and MUST be asserted.

For parallel mode this rule needs care; Part 04 defines it.

## Checkpointing

When `checkpointEveryIteration` is true, after appending each `IterationRecord` the engine MUST write `LoopState` to SQLite in a single transaction with the iteration's node-execution records.

The checkpoint carries `iteration`, full `spend`, `accumulatorValue`, `progressWindow`, and `stopReason`. On restart, `LoopState` is rehydrated and the loop resumes at `iteration`, with spend intact.

```text
A resumed loop MUST NOT reset spend to zero.
A loop that spent 40 dollars before a crash has 40 dollars of budget gone.
Forgetting spend on restart turns maxCostUsd into maxCostUsd-per-crash.
```

If a crash-loop is possible, that is unbounded spend with a bounded-looking config. This is the restart-recovery rule from [[WorkerLifecycle-Part01]] applied to loop budgets.

Restart also MUST mark any iteration that was `running` at crash time as `outcome: "cancelled"` with `IterationError.kind = "process_crashed"`, and MUST apply `onIterationFailure` to it, exactly as if it had failed while the app was up. A half-run iteration is not resumed; its Artifacts are discarded and unverified. See Part 05.

# Nested Loops

A body may contain a LoopNode. When it does:

1. The inner loop's `deadlineAt` is `min(inner deadline, outer's current iteration deadline)`.
2. The inner loop's `maxCostUsd` is effectively `min(inner.maxCostUsd, outer.remaining.costUsd)`. The engine MUST clamp, not just check.
3. The inner loop's spend folds into the outer iteration's spend, which folds into the outer loop's spend. Spend is transitive.
4. The **iteration product** `outer.maxIterations * inner.maxIterations` is the worst-case body count. Graph-build validation MUST compute this product across the full nesting chain and reject the workflow if it exceeds `engineCeilings.maxTotalIterationProduct`. Error: `nested_loop_product_exceeds_ceiling`.
5. Nesting depth MUST NOT exceed `engineCeilings.maxLoopNestingDepth`. Error: `loop_nesting_too_deep`.

Rule 4 is why nesting is dangerous. Two loops each capped at a reasonable 50 iterations is 2500 body executions. Three is 125000. Each of those may spawn a Worker. The product, not the individual caps, is the real bound, and only build-time arithmetic catches it.

# Errors Named In This Part

```text
body_subgraph_cyclic              build  -> workflow does not build
body_entry_ambiguous              build  -> workflow does not build
body_exit_ambiguous               build  -> workflow does not build
body_node_unreachable             build  -> workflow does not build
merge_inside_loop_body            build  -> workflow does not build
body_boundary_violation           build  -> workflow does not build
reserved_binding_name             build  -> workflow does not build
nested_loop_product_exceeds_ceiling  build -> workflow does not build
loop_nesting_too_deep             build  -> workflow does not build
body_output_missing               run    -> iteration failed, apply policy
body_output_type_mismatch         run    -> iteration failed, apply policy
iteration_context_mutation        run    -> loop failed immediately, engine bug
process_crashed                   restart-> iteration cancelled, apply policy
```

`iteration_context_mutation` is a panic-class error. It means a body node wrote to a frozen context, which means the freeze was not applied, which means some other iteration's data may already be corrupt. The loop fails immediately and does not attempt to continue.

# Invariants

```text
state.iteration == state.iterations.length at every iteration boundary.
The body subgraph object is reference-identical across all iterations of one loop.
Each IterationContext is a distinct, deep-frozen object.
No body node holds a reference to LoopState.
Graph mutations proposed inside a body do not apply until the loop is terminal.
Inner loop spend is included in outer loop spend.
A resumed loop's spend is greater than or equal to its pre-crash spend.
```

# AI Notes

Do not pass `LoopState` into the body "for convenience". The body needs `lastOutput` and `remaining`. It does not need the history array, and giving it one lets a Worker's prompt template stuff forty prior attempts into context, which is a token-budget bomb that trips the token guard and looks like the loop's fault.

Do not compute `isLast` for a `while` loop. It is `null`. Bodies that need "final pass" behavior in a `while` are usually mis-designed; the final pass belongs after the loop.

Do not skip the deep freeze because it is slow. The freeze is the only thing preventing iteration 7's mutation of a shared item from silently changing iteration 8's input, and that class of bug is undebuggable in a parallel loop.

Do not reuse the context object across iterations with fields overwritten. A body node that captured a reference to the context in an async callback will read the next iteration's values.

# Related Documents

- [[LoopNodes-Part02]]
- [[LoopNodes-Part04]]
- [[LoopNodes-Part05]]
- [[NodeArchitecture-Part01]]
- [[DynamicGraphs-Part01]]
- [[MergeFlow-Part01]]
- [[WorkerLifecycle-Part01]]
- [[Replay-Part01]]