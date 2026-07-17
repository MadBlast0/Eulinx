---
title: LoopNodes Specification - Part 02
status: draft
version: 1.0
tags:
  - workflow-engine
  - loop-nodes
  - architecture
related:
  - "[[LoopNodes-Part01]]"
  - "[[LoopNodes-Part03]]"
  - "[[ConditionNodes-Part02]]"
  - "[[VerifierNodes-Part01]]"
---

# LoopNodes Specification (Part 02)

# Scope Of This Part

Part 01 defined `LoopKind` as a four-variant tagged union. This part defines each variant completely: what its continuation decision is, when that decision is evaluated, what it reads, what it MUST NOT read, which errors it can produce, and what `stopReason` it yields.

The four kinds are not four implementations. They are four **continuation decision functions** plugged into the one execution algorithm in Part 06. Everything else, guards, iteration context, accumulator, failure policy, is identical across all four. An implementer who writes four separate loop engines has misread this document.

```text
One loop engine.
Four continuation decision functions.
The engine calls the function; the function returns Continue or Stop.
The function CANNOT stop the loop by itself and CANNOT keep it running.
Guards outrank the function in both directions.
```

That last rule is the one implementers break. A continuation function returning `Continue` does not cause an iteration. It expresses an opinion. The guard block, which already ran, has the veto.

# The Continuation Decision Contract

```ts
type ContinuationDecision =
  | { decide: "continue"; bindings: Record<string, JsonValue> }
  | { decide: "stop"; stopReason: LoopStopReason }
  | { decide: "error"; error: ContinuationError };

type ContinuationError = {
  kind:
    | "collection_not_found"
    | "collection_not_array"
    | "condition_eval_failed"
    | "condition_not_boolean"
    | "verifier_node_missing"
    | "verifier_verdict_missing"
    | "success_expr_eval_failed"
    | "binding_name_collision";
  message: string;
  path: string | null;
};

type ContinuationFn = (
  cfg: LoopNodeConfig,
  state: LoopState,
  scope: ReadonlyScope
) => ContinuationDecision;
```

`ReadonlyScope` is a frozen view over workflow inputs, upstream node outputs, and the loop's own state. A continuation function MUST NOT write through it. The engine passes a deep-frozen object and MUST assert freezing in debug builds.

A `decide: "error"` result is never treated as `continue`. The engine maps it to `stopReason: { reason: "guard_evaluation_error", guard: "continuation", message }` and the loop ends with `status: "failed"`. This is the fail-closed rule from Part 01 applied at the decision layer.

# Kind 1: for_each

```ts
{ kind: "for_each"; collection: ValueRef; itemBinding: string; indexBinding: string }
```

A `for_each` loop runs its body once per element of a collection resolved **exactly once**, before the first iteration.

## Resolution rules

1. On loop entry, resolve `collection` through the `ValueRef` resolver in [[NodeArchitecture-Part01]].
2. If resolution yields `undefined`, return `error: collection_not_found`.
3. If the resolved value is not a JSON array, return `error: collection_not_array`. A string is not an array. An object is not an array. There is no coercion, no `Object.values`, no splitting on newlines.
4. Snapshot the array into `LoopState.frozenCollection`. This snapshot is the loop's collection for the rest of the run.
5. If the array is empty, stop immediately with `{ reason: "collection_exhausted", itemCount: 0 }` and `status: "completed"`. Zero iterations is a success, not an error.

The snapshot rule is mandatory and is the most commonly violated rule in this part. If the collection came from an upstream BuilderNode's Artifact and something re-resolves it mid-loop, the loop's length changes under it. Resolve once. Freeze. Iterate the frozen copy.

## Continuation decision

```text
if state.iteration >= frozenCollection.length:
    stop { reason: collection_exhausted, itemCount: frozenCollection.length }
else:
    continue with bindings {
      [cfg.itemBinding]:  frozenCollection[state.iteration],
      [cfg.indexBinding]: state.iteration
    }
```

## Binding rules

- `itemBinding` and `indexBinding` MUST be valid identifiers matching `^[a-z][a-zA-Z0-9_]*$`.
- They MUST NOT be equal to each other. Equal names produce `binding_name_collision` at graph-build time, not at run time.
- They MUST NOT shadow a reserved iteration-context key. The reserved list is in Part 03.
- The bound item is deep-frozen before the body sees it. A body node that mutates its item mutates nothing; the next iteration reads the original.

## Guard interaction

`maxIterations` and `frozenCollection.length` are independent. A 500-element collection under `maxIterations: 100` runs 100 iterations and stops with `guard_max_iterations`, not `collection_exhausted`. It processes 100 items and reports honestly that it did not finish.

This MUST NOT be silently tolerated. Graph-build validation SHOULD warn when a `for_each` collection has a statically knowable length above `maxIterations`. At run time, when the guard trips on a `for_each`, the engine MUST emit `loop.collection_truncated` with `processed` and `total`, because "we processed 100 of 500 files and called it done" is a data-loss bug wearing a success costume.

# Kind 2: while

```ts
{ kind: "while"; condition: ConditionExpr; evaluateBefore: true }
```

A `while` loop evaluates a condition expression before each iteration and continues while it is `true`.

`evaluateBefore` is typed as the literal `true`. Eulinx has no do-while. A do-while runs the body before any guard-adjacent decision has been made about whether the body should run at all, and Eulinx will not do that with a body that can spend money. If an author needs "run at least once", they set the condition so the first evaluation is true and let the normal path run.

## Condition rules

The condition is a `ConditionExpr` evaluated by the small sandboxed evaluator specified in [[ConditionNodes-Part02]]. It is not JavaScript, it is not `eval`, and the loop engine MUST NOT contain a second, more permissive evaluator "just for loops". There is exactly one evaluator in Eulinx.

The evaluator is given the `ReadonlyScope` plus the iteration context keys from Part 03, notably `iteration`, `lastOutput`, and `elapsedMs`.

## Continuation decision

```text
r = evaluate(cfg.loopKind.condition, scope)
if r.ok == false:
    error { kind: condition_eval_failed, message: r.error.message, path: r.error.path }
else if typeof r.value != "boolean":
    error { kind: condition_not_boolean, message: "while condition returned <type>", path: null }
else if r.value == true:
    continue with bindings {}
else:
    stop { reason: condition_false }
```

There is no truthiness. `0` is not false. `""` is not false. `null` is not false. A non-boolean is an error and the loop fails. This mirrors the type rules in [[ConditionNodes-Part04]] and exists because a condition that silently coerces is a condition that silently loops.

## The while-loop trap

A `while` condition that reads only workflow inputs and never reads anything the body writes is an infinite loop. It will run until `maxIterations` every single time.

Graph-build validation MUST reject a `while` whose condition references no path that any node inside the body subgraph can write. The error is `while_condition_body_independent` and it is a build error, not a warning. A statically infinite loop is not a runtime concern.

# Kind 3: retry_until_success

```ts
{ kind: "retry_until_success"; successExpr: ConditionExpr; backoff: BackoffPolicy }
```

A `retry_until_success` loop runs its body until `successExpr` evaluates true over the last iteration's output, sleeping between attempts according to `backoff`.

This kind exists for genuinely flaky external operations: an MCP server that is briefly unreachable, a provider returning 429, a test suite with a known-racy fixture. It does not exist for "the model got it wrong". Getting it wrong is not flakiness; that is `refine_until_verified`.

## Continuation decision

```text
if state.iteration == 0:
    continue with bindings { attempt: 1 }

r = evaluate(cfg.loopKind.successExpr, scope)   # scope.lastOutput = last iteration output
if r.ok == false:      error { kind: success_expr_eval_failed, ... }
if typeof r.value != "boolean": error { kind: condition_not_boolean, ... }
if r.value == true:    stop { reason: success_reached, atIteration: state.iteration }
else:                  continue with bindings { attempt: state.iteration + 1 }
```

## Backoff rules

```ts
type BackoffPolicy = { initialMs: number; multiplier: number; maxMs: number; jitter: boolean };
```

The sleep before iteration `n` (1-indexed, no sleep before iteration 1) is:

```text
base  = min(initialMs * (multiplier ^ (n - 2)), maxMs)
sleep = jitter ? random_uniform(base * 0.5, base * 1.5) : base
sleep = min(sleep, remaining_wall_clock_budget)
```

Validation rules, all enforced at graph-build time:

- `initialMs` MUST be >= 10 and <= 60000.
- `multiplier` MUST be >= 1.0 and <= 10.0.
- `maxMs` MUST be >= `initialMs` and <= 300000.
- `jitter` SHOULD be `true` whenever the body calls an external service, because synchronized retries across parallel workflows are how a rate limit becomes an outage.

**The sleep counts against the wall-clock guard.** This is not negotiable and it is the rule implementers miss. A backoff sleep is loop time. A loop with `maxWallClockMs: 60000` and a backoff that reaches 30 seconds gets two attempts, not ten. The engine MUST clamp each sleep to the remaining wall-clock budget and MUST re-check guards after the sleep, because the sleep is exactly when the wall-clock guard trips.

The sleep MUST be interruptible by cancellation. A cancelled workflow does not wait out a 300-second backoff.

# Kind 4: refine_until_verified

```ts
{ kind: "refine_until_verified"; verifierNodeId: string; acceptOn: VerdictAcceptRule }
```

A `refine_until_verified` loop runs a body that produces an Artifact and contains a VerifierNode, continuing until that Verifier passes.

This is the most valuable loop kind in Eulinx and the most dangerous. It is the Builder-Verifier refinement cycle described in [[RefinementLoop-Part01]], and it is the exact construct that burns two thousand dollars overnight when its guards are wrong.

## Structural requirements, all checked at graph-build time

1. `verifierNodeId` MUST name a node that exists inside this loop's body subgraph. A Verifier outside the body cannot have run when the decision is made. Error: `verifier_node_missing`.
2. That node MUST be `kind: "verifier"`. Error: `verifier_node_wrong_kind`.
3. The body MUST contain at least one BuilderNode that is an ancestor of the Verifier along the body's edges. A refine loop with nothing producing anything to verify is a build error: `refine_loop_has_no_builder`.
4. The Builder MUST NOT be the same Worker as the Verifier. A Worker MUST NOT verify its own output. This is cardinal rule 8 and the check is structural: the Builder's `workerId` binding and the Verifier's MUST differ. Error: `self_verification_forbidden`. See [[Verification-Part01]].
5. The body MUST NOT contain a merge node. Nothing merges inside a refinement loop; merge happens after the loop, on the accepted Artifact. Error: `merge_inside_refine_loop`.

## Continuation decision

```text
if state.iteration == 0:
    continue with bindings { attempt: 1, priorFeedback: null }

v = state.iterations[last].verdict     # captured from the Verifier node's output
if v == null:
    error { kind: verifier_verdict_missing, message: "verifier produced no verdict" }

if accepts(v, cfg.loopKind.acceptOn):
    stop { reason: verified, atIteration: state.iteration, verdictId: v.verdictId }
else:
    continue with bindings {
      attempt: state.iteration + 1,
      priorFeedback: v.feedback,
      priorArtifactId: state.iterations[last].artifactId
    }
```

## The accept rule

```ts
type VerdictAcceptRule = { requireDeterministicPass: true; minAdvisoryScore?: number };
```

`requireDeterministicPass` is the literal `true`. A refinement loop MUST NOT be allowed to exit on an AI judge's opinion alone. Cardinal rule 10: AI verdicts are advisory; deterministic verification is authoritative. Acceptance requires the Verifier's deterministic checks to pass. `minAdvisoryScore`, if set, is an **additional** gate that can only make acceptance harder. It can never substitute for the deterministic pass.

```text
accepts(v, rule) =
    v.deterministic.status == "pass"
    AND (rule.minAdvisoryScore == null OR v.advisory.score >= rule.minAdvisoryScore)
```

If the deterministic checks passed and the advisory score is below the floor, the loop continues refining. If the advisory score is 0.99 and the deterministic checks failed, the loop continues refining. There is no override.

## priorFeedback is the progress mechanism

Each subsequent iteration receives the previous verdict's `feedback` in its iteration context. This is the only reason a refinement loop can ever converge. A Builder that re-runs an identical prompt produces an identical failure.

Therefore: a `refine_until_verified` body whose BuilderNode's context spec does not reference `priorFeedback` is a build error, `refine_loop_ignores_feedback`. It is a loop that cannot learn, and it is guaranteed to burn its full budget producing the same rejected Artifact until `maxIterations` stops it.

## The no-progress guard is effectively mandatory here

For `refine_until_verified`, the no-progress guard's `signalPath` SHOULD be the content hash of the produced Artifact. Two consecutive iterations producing a byte-identical Artifact means the Builder has stopped responding to feedback and no further iteration will differ. Stop at the second repeat, not at iteration 40. Part 05 defines the mechanics.

# Kind Comparison Table

```text
kind                  | decision reads          | typical stop        | primary danger
----------------------+-------------------------+---------------------+---------------------------
for_each              | frozen collection index | collection_exhausted| silent truncation at cap
while                 | sandboxed condition     | condition_false     | condition body-independent
retry_until_success   | successExpr + backoff   | success_reached     | backoff eats wall clock
refine_until_verified | deterministic verdict   | verified            | no convergence, full burn
```

# Errors Named In This Part

```text
collection_not_found          resolve failed          -> loop failed, no iterations
collection_not_array          type wrong              -> loop failed, no iterations
condition_eval_failed         evaluator error         -> loop failed at boundary
condition_not_boolean         non-boolean condition   -> loop failed at boundary
success_expr_eval_failed      evaluator error         -> loop failed at boundary
verifier_node_missing         build-time structural   -> workflow does not build
verifier_node_wrong_kind      build-time structural   -> workflow does not build
refine_loop_has_no_builder    build-time structural   -> workflow does not build
self_verification_forbidden   build-time structural   -> workflow does not build
merge_inside_refine_loop      build-time structural   -> workflow does not build
refine_loop_ignores_feedback  build-time structural   -> workflow does not build
while_condition_body_independent  build-time static   -> workflow does not build
binding_name_collision        build-time naming       -> workflow does not build
verifier_verdict_missing      run-time                -> loop failed at boundary
```

Nine of these fourteen are build-time. That ratio is intentional. A loop that cannot possibly work should never be given a budget to prove it.

# AI Notes

Do not add a fifth loop kind because a use case seems to need one. Four kinds cover for-each, condition, flaky-retry, and refinement. A fifth kind is almost always a `while` whose condition the author did not want to write.

Do not implement `retry_until_success` and `refine_until_verified` as the same thing. Retry re-runs an identical attempt and expects the world to change. Refinement re-runs a different attempt because the Builder learned. Their backoff, their feedback, and their guards differ.

Do not let `acceptOn` grow an `orAdvisory: true` option. The moment a refinement loop can exit on a model saying "looks good to me", Eulinx's verification model is decoration.

Do not resolve the `for_each` collection lazily. Freeze it on entry.

# Related Documents

- [[LoopNodes-Part01]]
- [[LoopNodes-Part03]]
- [[LoopNodes-Part05]]
- [[ConditionNodes-Part02]]
- [[VerifierNodes-Part01]]
- [[BuilderNodes-Part01]]
- [[Verification-Part01]]
- [[RefinementLoop-Part01]]
- [[NodeArchitecture-Part01]]