---
title: WorkerHierarchy Specification - Part 06
status: draft
version: 1.0
tags:
  - worker-system
  - worker-hierarchy
  - implementation
related:
  - "[[WorkerHierarchy-Part01]]"
  - "[[WorkerHierarchy-Part05]]"
  - "[[WorkerHierarchy-Diagrams]]"
---

# WorkerHierarchy Specification (Part 06)

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

# Events

```text
hierarchy.node_inserted
hierarchy.node_admitted
hierarchy.node_started
hierarchy.node_signalled
hierarchy.delegated
hierarchy.delegation_rejected
hierarchy.result_bubbled
hierarchy.result_accepted
hierarchy.parent_unresponsive
hierarchy.cascade_complete
hierarchy.cancel_escalated_to_terminate
hierarchy.cascade_target_missing
hierarchy.orphan_detected
hierarchy.orphan_reaped
hierarchy.budget_refunded
hierarchy.budget_exhausted
hierarchy.corruption_detected
```

# Public API

```ts
interface WorkerHierarchyApi {
  delegate(request: DelegationRequest): Promise<DelegationDecision>;
  signal(signal: CascadeSignal): Promise<CascadeReceipt>;
  reportResult(message: ResultBubbleMessage): Promise<ResultAck>;
  snapshot(sessionId: string): Promise<HierarchySnapshot>;
  effectivePermissions(nodeId: HierarchyNodeId): Promise<PermissionSet>;
  remainingBudget(nodeId: HierarchyNodeId): Promise<BudgetAllocation>;
  detectOrphans(): Promise<OrphanReport>;
}
```

# Implementation Checklist

- [ ] Create the `hierarchy_nodes` table with all columns from Part 02
- [ ] Create the four indexes, including the partial unique index on `kind = 'user'`
- [ ] Define `HierarchyNode`, `NodeLimits`, `DelegatedScope`, `NodeResult`
- [ ] Define `PermissionSet`, `PermissionGrant`, `PermissionConstraint`
- [ ] Define `BudgetAllocation` with integer micros, never floats
- [ ] Define the full `HierarchyError` enum with all 17 variants
- [ ] Implement `patternCovers` glob matching with `*` and `**` semantics
- [ ] Implement `isPermissionSubset` exactly as Part 04 specifies, including denial inheritance
- [ ] Implement `budgetFits` checking all four dimensions
- [ ] Implement the insertion algorithm inside one SQLite transaction
- [ ] Implement `getAncestors` via path split plus batch fetch, not recursive `getParent`
- [ ] Implement `getDescendants` via the `path LIKE` prefix query
- [ ] Implement the cycle check as the secondary defense
- [ ] Make `parent_id` and `path` immutable; expose no reparent operation
- [ ] Implement the delegation algorithm with the rejected-fingerprint repeat guard
- [ ] Implement fan-out admission with deterministic `(priority, createdAt, nodeId)` sort
- [ ] Implement the cascade algorithm with depth-DESCENDING order
- [ ] Implement lock release inside the cascade, not in actor cleanup
- [ ] Implement grace period escalation from cancel to terminate
- [ ] Implement cascade idempotency by `signalId`
- [ ] Implement result bubbling with the 30000 ms ack timer and 3 retries
- [ ] Implement persist-then-acknowledge ordering on the parent side
- [ ] Implement the budget refund on every terminal transition
- [ ] Implement orphan detection at startup and on a 30000 ms sweep
- [ ] Implement the six orphan resolution rules, including the no-reparent rule
- [ ] Implement effective permission resolution with the ancestor-state check
- [ ] Emit every event in the list above
- [ ] Test: a child requesting a permission its parent lacks is rejected
- [ ] Test: a grandchild cannot exceed the grandparent even if the parent is permissive
- [ ] Test: cancelling a mid-tree Orchestrator terminates its whole subtree
- [ ] Test: a cascade never marks a parent terminal before its children
- [ ] Test: budget allocated to a child is refunded on completion
- [ ] Test: an orphan is reaped, not reparented
- [ ] Test: a Worker attempting to insert a node is rejected
- [ ] Test: replay of the same Session produces an identical tree

# Worked Example 1: A Delegation That Is Approved

```text
Session budget: 200000 tokens, 5000000 usdMicros.

Node user_root
  depth 0, kind user, path "user_root"
  permissions: grants [fs.read "**", fs.write "**", tool.invoke "*",
                       hierarchy.delegate "*"]
  budget: allocated 200000 tokens / 5000000 usdMicros
  limits: maxDepth 4, maxDirectChildren 6, maxDescendants 64,
          maxConcurrentRunningChildren 3

Root Orchestrator orc_root inserted:
  depth 1, path "user_root/orc_root"
  requested: fs.write "**", 180000 tokens
  subset check: passes, "**" covered by "**"
  budget fit: 180000 <= 200000 - 0 - 0. Passes.
  user_root.reservedForChildrenTokens becomes 180000.

orc_root delegates to a Sub-Orchestrator:
  DelegationRequest {
    delegatorNodeId: "orc_root",
    childKind: "orchestrator",
    objective: "Implement the REST API layer",
    rationale: "API work is independent of the UI work and can run in parallel",
    scope: { allowedPaths: ["src/api/**"], deniedPaths: ["**/*.env"],
             allowedToolIds: ["fs", "bash", "test-runner"],
             deadlineAt: "2026-07-17T18:00:00Z" },
    requestedPermissions: { grants: [fs.write "src/api/**",
                                     tool.invoke "test-runner"],
                            denials: [fs.write "**/*.env"] },
    requestedBudget: { allocatedTokens: 60000, allocatedUsdMicros: 1500000 }
  }

  Step 2: rationale non-empty. Pass.
  Step 3: orc_root.state == "running". Pass.
  Step 4: kind is orchestrator. Pass.
  Step 5: "src/api/**" is a subset of "**". Pass.
  Step 6: no sibling with this objective. Pass.
  Step 7: fs.write "src/api/**" covered by parent's fs.write "**". Pass.
  Step 8: 60000 <= 180000 - 0 - 0. Pass.
  Step 9: insert. childDepth 2 <= maxDepth 4. Pass.
          fan-out 0 < 6. Pass. Cycle check passes.
  Result: sub_api inserted at depth 2, path "user_root/orc_root/sub_api".
          orc_root.reservedForChildrenTokens becomes 60000.
```

# Worked Example 2: An Escalation That Is Rejected

```text
sub_api holds: fs.write "src/api/**", denials [fs.write "**/*.env"]

sub_api attempts to delegate a Worker:
  requestedPermissions: { grants: [fs.write "src/**"], denials: [] }

  isPermissionSubset runs:
    Step 1a: child grant fs.write "src/**".
             Search parent grants for fs.write where
             patternCovers(parentPattern, "src/**").
             Parent has fs.write "src/api/**".
             patternCovers("src/api/**", "src/**") is FALSE. "src/api/**" does
             not cover the broader "src/**".
    Step 1b: M is empty. Return false.

  Step 7 of the delegation algorithm fails.
  Reject with HierarchyError::PermissionEscalation.
  Explanation: "Requested fs.write on 'src/**' exceeds your grant of
                fs.write on 'src/api/**'. Narrow the child scope."
  Emit hierarchy.delegation_rejected.

  Fingerprint hash(childKind, objective, scope, requestedPermissions) is stored
  in sub_api's rejected set. An identical retry is rejected with
  HierarchyError::RepeatedRejectedDelegation without re-running the checks.

sub_api replans with fs.write "src/api/db/*" and denials
  [fs.write "**/*.env"] inherited. Now:
    Step 1a: patternCovers("src/api/**", "src/api/db/*") is TRUE.
    Step 2:  parent denial fs.write "**/*.env" is present in the child. Pass.
  Approved.
```

# Worked Example 3: A Cascade Cancel

```text
Tree at the moment the user clicks Stop:

  user_root (running)
    orc_root (running)
      sub_api (running)
        wrk_schema (running, holds lock on src/api/db/schema.sql)
        wrk_handlers (running)
      sub_ui (running)
        wrk_components (admitted, no actor yet)

User cancels orc_root. CascadeSignal { kind: "cancel",
  originNodeId: "user_root", targetNodeId: "orc_root",
  reason: "UserRequested", gracePeriodMs: 5000 }

Step 3: "user_root" is in orc_root.path. Authorized.
Step 5: subtree = orc_root, sub_api, sub_ui, wrk_schema, wrk_handlers,
        wrk_components. Six nodes.
Step 6: sort by depth DESC:
        depth 3: wrk_schema, wrk_handlers, wrk_components
        depth 2: sub_api, sub_ui
        depth 1: orc_root
Step 7: wrk_schema  -> cancelled, cancel message sent, lock on
                       src/api/db/schema.sql RELEASED, budget refunded
        wrk_handlers -> cancelled, cancel message sent, budget refunded
        wrk_components -> cancelled. It was "admitted" with no actor, so
                       step 7d is a no-op. Rule C4 means it is still signalled.
        sub_api      -> cancelled, budget refunded to orc_root
        sub_ui       -> cancelled, budget refunded to orc_root
        orc_root     -> cancelled, budget refunded to user_root
Step 8: wrk_schema acknowledges in 800 ms and attaches a partial NodeResult
        with one artifact. wrk_handlers does not acknowledge within 5000 ms,
        so it is escalated to terminate and its process is killed.
        Emit hierarchy.cancel_escalated_to_terminate.
Step 9: hierarchy.cascade_complete, affectedCount 6.

Final: user_root.reservedForChildrenTokens is 0. All spend has been rolled up
       into user_root.spentTokens. The tree is quiescent and the meter is
       correct.
```

# Common Mistakes

Computing depth at read time by walking parents. Depth is stored at insert. If you walk, you will walk on every permission check, and permission checks happen on every action.

Implementing permission inheritance as a union. It is an intersection for grants and a union for denials. Getting this backwards grants every Worker root authority and is the worst possible bug in Eulinx.

Cascading top-down. Children MUST be signalled first or you will mark a parent terminal while its children run, violating H11 and stranding processes.

Forgetting to release locks during a cascade. A killed actor never runs its own cleanup. The cascade releases the locks.

Reparenting orphans to their grandparent. It looks kind and it corrupts budget arithmetic and plan structure. Reap them.

Double counting budget by adding child spend to parent spend while the reservation is still held. The parent pays once, at reservation. Refund at terminal.

Letting Workers spawn Workers. Delegation is planning. Workers do not plan.

Using floats for cost. Use integer micros.

Trusting `node.permissions` instead of walking the path. The stored set is a cache; the walk is the truth, and it catches the ancestor-paused case that the cache cannot.

Making admission order nondeterministic. Replay is a requirement. Sort on `(priority, createdAt, nodeId)` and never on hash-map iteration order.

# Future Expansion

Possible later additions, none of which are in scope now:

- weighted budget redistribution when a sibling finishes far under its allocation
- speculative delegation where two children attempt the same objective and the first acceptable result wins, requiring an explicit relaxation of rule D5
- hierarchy templates that pre-declare a tree shape for a known workflow
- cross-Session hierarchy references for resumable long-running work
- a user-facing tree editor that can prune a subtree before it runs
- per-node retry policies that re-delegate a failed child automatically
- soft depth limits that require user approval rather than hard rejection

# Related Documents

- [[WorkerHierarchy-Part01]]
- [[WorkerHierarchy-Part05]]
- [[WorkerHierarchy-Diagrams]]
- [[WorkerCommunication-Part01]]
- [[WorkerMemory-Part01]]
- [[PermissionManager-Part01]]
