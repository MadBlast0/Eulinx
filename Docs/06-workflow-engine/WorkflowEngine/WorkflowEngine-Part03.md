---
title: WorkflowEngine Specification - Part 03
status: draft
version: 1.0
tags:
  - workflow-engine
  - workflow-engine-core
  - scheduling
  - topology
related:
  - "[[WorkflowEngine-Part02]]"
  - "[[WorkflowEngine-Part04]]"
  - "[[EdgeTypes-Part01]]"
  - "[[ConditionNodes-Part01]]"
---

# WorkflowEngine Specification (Part 03)

Readiness, the ready set, and the topological execution model. This part answers the engine's only real question: which nodes may run right now?

# The Readiness Rule

A node is **ready** when every incoming edge is **satisfied**.

That sentence is the whole model, and every subtlety lives in the word "satisfied". An edge is not satisfied merely because its source node finished. A source node that was **skipped** satisfies its edges too, but with a different downstream meaning. A source node that **failed** does not satisfy anything.

```text
Edge satisfaction by source node terminal state:

  source succeeded  -> edge satisfied,     value available
  source skipped    -> edge satisfied,     value absent
  source failed     -> edge NOT satisfied, downstream cascades
  source cancelled  -> edge NOT satisfied, downstream cascades
```

The engine MUST NOT compute readiness by walking upstream on every tick. That is O(V*E) per tick and, worse, it produces wrong answers once Condition nodes skip branches, because a naive "are all parents succeeded?" check leaves a fan-in node pending forever when one parent was correctly skipped.

Instead the engine maintains a **counter**.

# remainingDeps

Every `NodeRuntimeState` carries `remainingDeps`: the number of incoming edges not yet satisfied.

```text
Initialization (buildMirror step 9, expanded):
  remainingDeps = count of incoming edges to this node,
                  excluding loop back-edges.

Decrement:
  When a node reaches a terminal state, for each outgoing edge whose
  satisfaction rule fires, decrement the target's remainingDeps by exactly 1.

Readiness:
  A node with state == "pending" and remainingDeps == 0 becomes "ready".
```

The decrement MUST happen exactly once per edge. Not once per tick, not once per target. This is why `remainingDeps` is persisted rather than recomputed: a decrement that runs twice because a tick was retried after a crash produces a node that becomes ready before its dependencies are done, and the resulting bug is nondeterministic and nearly unfindable.

The idempotency guarantee comes from the transaction. The source node's transition to a terminal state and every resulting `remainingDeps` decrement commit **in the same transaction**. Either the source is terminal and every decrement happened, or neither did. There is no interleaving.

```text
MUST: decrement targets in the same transaction as the source's terminal transition.
MUST NOT: decrement in a separate pass, a background job, or a post-commit hook.
```

# The Fan-In Rule

A node with multiple incoming edges runs **once**, after all of them are satisfied. It does not run once per incoming edge.

```text
   A ----+
         +---> C
   B ----+

   C.remainingDeps starts at 2.
   A succeeds -> C.remainingDeps = 1. C stays pending.
   B succeeds -> C.remainingDeps = 0. C becomes ready.
   C runs once.
```

This is the behaviour a recursion cannot produce, and it is why Part 01 forbids recursion. A depth-first walk visits C twice.

# The Skip Cascade

When a Condition node takes one branch, the other branch's nodes must not remain pending forever. They must be marked `skipped`, and that skip must propagate.

The cascade rule:

```text
A node MUST transition to skipped when:
  - it is pending, AND
  - at least one incoming CONTROL edge's source was skipped or not selected, AND
  - no incoming control edge can still be satisfied by a node that is
    pending, ready, or running.
```

The second clause matters. Consider a diamond where one branch is skipped and the other succeeds:

```text
   COND --true--> A --+
        --false-> B --+---> C
```

If `B` is skipped and `A` succeeds, `C` MUST still run. `C` has one satisfied edge from `A`. The skip of `B` satisfies `B`'s edge with an absent value. `C.remainingDeps` reaches 0 through both paths and `C` runs exactly once with `A`'s value present and `B`'s value absent.

Now consider a branch that leads only to `D`:

```text
   COND --false-> B --> D
```

If `B` is skipped, `D` has no other incoming control edge, and `D` MUST be marked `skipped` with `skipReason = "upstream_skipped"`. `D`'s own outgoing edges then cascade the same way.

The engine implements this as: a skip is a terminal state, it satisfies outgoing edges, and it stamps a flag on the target. The target evaluates the skip rule when its `remainingDeps` reaches 0:

```text
When remainingDeps reaches 0 for node N:
  1. Examine N's incoming control edges.
  2. If at least one control edge's source terminated in succeeded,
     N -> ready.
  3. Else if N has zero incoming control edges (it is a root),
     N -> ready.
  4. Else (every incoming control edge's source was skipped, failed,
     or cancelled),
     N -> skipped with skipReason derived from the sources:
       any source failed    -> "upstream_failed"
       else any cancelled   -> "run_cancelled"
       else                 -> "upstream_skipped"
  5. Persist. Emit. If N became skipped, cascade to N's targets.
```

Note that step 2 requires only **one** succeeded control parent. A node whose parents are `{succeeded, skipped}` runs. A node whose parents are `{skipped, skipped}` is skipped. This is the standard "OR on control, AND on arrival" semantics, and choosing it explicitly here is the point: the alternative (require all parents succeeded) makes every Condition node's merge point unreachable.

# The Failure Cascade

A failed node does not satisfy its edges, so downstream nodes never reach `remainingDeps == 0` on their own. The engine MUST explicitly cascade.

```text
When node N transitions to failed (after retries are exhausted, per
[[NodeArchitecture-Part05]]):

  1. Determine failure disposition from N's config:
       "fail_run"       -> the whole run fails. This is the default.
       "fail_branch"    -> only N's descendants are affected.
       "continue"       -> N is treated as skipped for cascade purposes;
                           the run continues. Only legal when every
                           outgoing data port of N is declared optional.
  2. For "fail_run":
       Transition the run to failed with kind node_failed_fatal.
       Cancel every running node (Part 06 cancel procedure).
       Mark every pending and ready node skipped with reason "upstream_failed".
  3. For "fail_branch":
       Walk N's descendants in topoOrder.
       For each descendant reachable only through N, mark skipped with
       reason "upstream_failed". A descendant with another satisfiable
       path is left alone; its remainingDeps will resolve normally.
  4. For "continue":
       Satisfy N's outgoing edges with absent values. Decrement targets.
       Do not cascade a skip.
```

Step 3's "reachable only through N" is a reachability query, not a neighbour check. Implement it as: mark N's direct targets; for each, re-evaluate the skip rule of step 4 in the previous section. That rule already answers "does this node have another live path?" correctly, because a node with a `pending` or `running` parent has not reached `remainingDeps == 0` and is therefore not evaluated yet. Do not write a separate reachability walk; it will disagree with the skip rule at exactly one edge case and you will find it in production.

# Computing The Ready Set

```text
computeReadySet(mirror) -> NodeExecutionKey[]

 1. If run.state != "running", return empty. 
    A pausing, cancelling, paused, or terminal run dispatches nothing.
 2. Read mirror.readySet. It is already maintained by the write path.
 3. Filter out any key present in mirror.runningSet.
    (Defensive: a correct write path makes this a no-op. Keep it. It is
     one set lookup and it turns a dispatch-twice bug into a no-op.)
 4. Sort the result by the tuple (topoRank(nodeId), nodeId, iterationIndex)
    ascending, where topoRank is the index of nodeId in mirror.topoOrder.
 5. Return the sorted array.
```

Step 4 is the determinism step and it is not optional. Two nodes that became ready in the same tick have no natural order. Without the sort, their dispatch order depends on `HashMap` iteration, which Rust deliberately randomizes per process. A replay would then dispatch them in a different order, and any node that observes wall-clock or Scheduler admission order would produce a different result. Sort. It costs nothing.

`topoRank` as the primary sort key means that when two nodes are both ready, the one earlier in the graph goes first. This is not required for correctness (they are independent by definition, or they would not both be ready) but it makes the UI's node-activation order match the visual left-to-right flow, and it makes test assertions stable.

# Topological Execution Model

The engine does **not** execute in topological order. It executes in **readiness order**, which respects topological order as a consequence.

The distinction matters:

```text
Topological execution:  visit topoOrder[0], then [1], then [2]...
                        Correct, but strictly serial. No parallelism.

Readiness execution:    run everything whose deps are met, concurrently.
                        Respects topology. Exploits parallelism.
```

`topoOrder` exists in the engine for exactly three purposes:

1. Validation. If Kahn's algorithm cannot order the graph, the graph has an illegal cycle.
2. Tiebreak. The sort key in step 4 above.
3. Cascade traversal. Walking descendants in `topoOrder` guarantees a parent is processed before its child, so a cascade never has to revisit a node.

It is never the dispatch order.

# Cycles

A control cycle in the graph is **illegal**, with exactly one exception: an edge explicitly marked as a loop back-edge belonging to a declared Loop node.

```ts
type EdgeDefinition = {
  // ...
  loopBackEdge?: {
    loopNodeId: NodeId;
  };
};
```

Validation rules:

```text
MUST: run Kahn's algorithm over all control and dependency edges,
      excluding edges with loopBackEdge set.
MUST: if nodes remain unordered, fail the run with graph_invalid and
      report the remaining node ids as the cycle.
MUST: verify every loopBackEdge.loopNodeId refers to a node of kind "loop".
      If not, fail with graph_invalid.
MUST: verify the back-edge's target is the declared loop's body entry.
      A back-edge that jumps to an arbitrary node is not a loop; it is a goto.
MUST NOT: silently break a cycle by dropping an edge.
MUST NOT: detect cycles at runtime by counting visits. Detect at validation.
```

Loop semantics are owned by [[LoopNodes-Part01]]. The engine's only contribution is: a loop back-edge does not count toward `remainingDeps`, and re-entering a loop body increments `iterationIndex`, producing a fresh set of `node_runtime_state` rows that are `pending` again.

# Error Cases

`unsatisfiable_node` - a node is pending, its `remainingDeps > 0`, and no upstream node is pending, ready, or running. The graph is deadlocked. This MUST NOT happen if the cascade rules are implemented correctly, so it is an engine bug rather than a data condition. Detect it in the terminal check (Part 08 step 12): if the ready set is empty, nothing is running, and any node is still pending, fail the run with kind `port_unsatisfied` and list the stuck node ids. Failing loudly here is what makes cascade bugs findable. A run that silently reports `succeeded` with pending nodes is undiagnosable.

`negative_remaining_deps` - a decrement drove the counter below zero. This means an edge was satisfied twice. Fail the run immediately with `persistence_failed` and log the edge id. Do not clamp to zero. Clamping converts a double-satisfy bug into a race that fires once a month.

`unknown_node_kind` - the ready node's `kind` has no registered handler. Fail the run with kind `unknown_node_kind`. MUST NOT skip the node and continue: a graph that references a plugin the user has uninstalled has changed meaning, and running it partially is worse than not running it.

`orphan_iteration` - a `node_runtime_state` row exists with an `iterationIndex` greater than 0 for a node not inside any loop. Data corruption. Fail with `recovery_impossible`.

# Invariants

```text
remainingDeps is decremented exactly once per incoming edge per iteration.
remainingDeps never goes negative.
A node becomes ready only via remainingDeps reaching 0.
A node with at least one succeeded control parent is never skipped.
A node with zero succeeded control parents and no live parents is always skipped.
Every skip and every failure cascades to a terminal state for all descendants.
The ready set is sorted before dispatch, every tick, without exception.
A loop back-edge never contributes to remainingDeps.
When the run terminates, no node is left pending or ready.
```

# AI Notes

Do not implement readiness as `node.parents.every(p => p.state === 'succeeded')`. It is wrong the first time a Condition node skips a branch, and the failure mode is a run that hangs forever with the merge node pending. Use the counter.

Do not decrement `remainingDeps` in a loop over targets after the transaction commits. If the app dies between the commit and the decrement, the node is terminal but its children never learn. The decrements are part of the same transaction. This is the single most important sentence in this part.

Do not treat skip as failure. They are different terminal states with different cascade rules, and collapsing them makes every Condition node fail its own run.

Do not clamp `remainingDeps` at zero to "be safe". A negative counter is evidence of a double-satisfy bug and you want it to scream on the first occurrence, in a test, not on a user's machine six months later.

Do not skip the sort because "the set only ever has one element in my test graph". It will have four elements in the first real workflow, and the resulting nondeterminism will be blamed on the AI model rather than on the missing sort.

# Related Documents

- [[WorkflowEngine-Part02]]
- [[WorkflowEngine-Part04]]
- [[WorkflowEngine-Part07]]
- [[WorkflowEngine-Part08]]
- [[WorkflowEngine-Diagrams]]
- [[NodeArchitecture-Part03]]
- [[NodeArchitecture-Part05]]
- [[EdgeTypes-Part01]]
- [[ConditionNodes-Part01]]
- [[LoopNodes-Part01]]
- [[ExecutionFlow-Part01]]
</content>
</invoke>
