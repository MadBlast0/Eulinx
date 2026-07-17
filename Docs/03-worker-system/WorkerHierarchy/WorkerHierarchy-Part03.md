---
title: WorkerHierarchy Specification - Part 03
status: draft
version: 1.0
tags:
  - worker-system
  - worker-hierarchy
  - delegation
related:
  - "[[WorkerHierarchy-Part01]]"
  - "[[WorkerHierarchy-Part04]]"
  - "[[Scheduler-Part01]]"
---

# WorkerHierarchy Specification (Part 03)

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

# Why Limits Exist

An Orchestrator that can delegate without bound will delegate without bound. Language models asked to decompose a problem produce more subproblems when given more room, and each subproblem costs a process, a context window, and money.

Limits are not performance tuning. They are the termination proof for the whole system. A tree with a depth ceiling and a fan-out ceiling has a finite node count, which means the Session provably ends.

```text
maxNodes <= sum over d in 0..maxDepth of (maxDirectChildren ^ d)
```

With the defaults below that ceiling is 1 + 1 + 6 + 36 + 216 = 260 nodes, and `maxDescendants` caps it lower still at 64.

# Default Limits

```ts
const DEFAULT_NODE_LIMITS: NodeLimits = {
  maxDepth: 4,
  maxDirectChildren: 6,
  maxDescendants: 64,
  maxConcurrentRunningChildren: 3,
};
```

These are the values the implementation MUST ship with. They are stored on every node at insertion so that a limit change never retroactively invalidates a running tree.

The four limits are distinct and all four MUST be checked:

```text
maxDepth                     How far the tree may nest below the user root.
                             Counted absolutely from depth 0, not relatively.

maxDirectChildren            How many non-terminal children one parent may have
                             at once. Terminal children do not count.

maxDescendants               How many non-terminal nodes may exist in the whole
                             Session subtree at once. Checked against the root.

maxConcurrentRunningChildren How many children of one parent may be in state
                             "running" simultaneously. The rest wait in "admitted".
```

`maxDirectChildren` and `maxConcurrentRunningChildren` are different limits and implementers conflate them constantly. A parent may have 6 children planned while only 3 burn tokens at once. The Scheduler enforces the second; the hierarchy enforces the first.

# Limit Override Rules

```text
L1  A node's limits MUST be assigned at insertion and MUST NOT change afterward.
L2  A child's maxDepth MUST equal its parent's maxDepth. Depth is a tree-wide
    ceiling, not a per-node allowance.
L3  A child's maxDirectChildren MUST be <= its parent's maxDirectChildren.
L4  A child's maxDescendants MUST be <= its parent's remaining descendant budget.
L5  A user MAY raise limits for a new Session via RuntimeConfig. A user MUST NOT
    raise limits for a running Session.
L6  An Orchestrator MUST NOT request limits above its own. Such a request is
    rejected with HierarchyError::LimitEscalation.
```

Rule L5 exists because raising `maxDepth` mid-Session would let an already-running Orchestrator that was denied a delegation retry it and succeed. Limits must be immutable for the life of the tree or they are not limits.

# Delegation Rules

Delegation is the act of an Orchestrator creating a child node and handing it part of its own scope, permissions, and budget.

The runtime MUST enforce:

```text
D1  Only kind == "orchestrator" may delegate.
D2  An Orchestrator MUST NOT delegate while its own state is not "running".
D3  A delegated scope MUST be a subset of the delegator's scope:
      child.scope.allowedPaths  is a subset of parent.scope.allowedPaths
      child.scope.deniedPaths   is a superset of parent.scope.deniedPaths
      child.scope.allowedToolIds is a subset of parent.scope.allowedToolIds
      child.scope.deadlineAt    is <= parent.scope.deadlineAt
D4  A delegated budget MUST be <= the delegator's remaining budget.
D5  An Orchestrator MUST NOT delegate the same objective to two children.
    Duplicate objectives are detected by exact-match on scope.objective among
    non-terminal siblings and rejected with HierarchyError::DuplicateDelegation.
D6  An Orchestrator MUST NOT perform implementation work itself. If an
    Orchestrator emits a file-mutating Artifact, the ArtifactManager MUST
    reject it with ArtifactError::OrchestratorMayNotImplement.
D7  A Worker that discovers it needs delegation MUST return a NodeResult with
    outcome "partial" and a needsDelegation payload. It MUST NOT insert a node.
```

Rule D3's `deniedPaths` direction is not a typo. Denials accumulate downward. A child inherits every denial its parent had and may add more. This is the same intersection-and-narrowing logic as permissions, expressed for paths.

# The Delegation Request

```ts
type DelegationRequest = {
  requestId: string;
  delegatorNodeId: HierarchyNodeId;
  childKind: "orchestrator" | "worker";
  objective: string;
  rationale: string;
  scope: DelegatedScope;
  requestedPermissions: PermissionSet;
  requestedBudget: BudgetAllocation;
  expectedArtifactKinds: string[];
};

type DelegationDecision =
  | { verdict: "approved"; nodeId: HierarchyNodeId }
  | { verdict: "rejected"; error: HierarchyError; explanation: string };
```

`rationale` is required and MUST be non-empty. It is not decoration. It is written to the audit log and it is what the user reads when reviewing why the tree grew. An Orchestrator that cannot explain a delegation in one sentence should not be making it.

# Delegation Algorithm

```text
1.  Orchestrator produces a DelegationRequest.
2.  Runtime validates rationale is non-empty. If empty, reject with
    HierarchyError::MissingRationale.
3.  Load delegator node. If state != "running", reject with
    HierarchyError::ParentNotRunning.
4.  If delegator.kind != "orchestrator", reject with
    HierarchyError::OnlyOrchestratorsMayDelegate.
5.  Apply rule D3. For each of allowedPaths, deniedPaths, allowedToolIds,
    deadlineAt, run the subset check. On any failure reject with
    HierarchyError::ScopeEscalation and name the offending field.
6.  Apply rule D5. Query non-terminal siblings for an exact objective match.
    If found, reject with HierarchyError::DuplicateDelegation.
7.  Run the permission subset check from WorkerHierarchy-Part04 step by step.
8.  Run the budget fit check from WorkerHierarchy-Part04 step by step.
9.  Call HierarchyStore.insert with the validated request. The insertion
    algorithm in Part 02 re-checks depth, fan-out, and cycles inside its
    transaction. Do not skip that re-check just because we are here.
10. On insert success, emit hierarchy.delegated with delegatorNodeId,
    childNodeId, objective, and rationale.
11. Return DelegationDecision { verdict: "approved", nodeId }.
12. On any rejection, emit hierarchy.delegation_rejected and return
    DelegationDecision { verdict: "rejected", error, explanation }.
13. The rejected Orchestrator receives the explanation as a message and MUST
    replan. It MUST NOT retry the identical request. A second identical
    request MUST be rejected with HierarchyError::RepeatedRejectedDelegation.
```

Step 13's repeat guard is necessary. A model that gets "depth limit exceeded" will cheerfully try the same thing again forever. The runtime keeps a set of rejected request fingerprints per node, where the fingerprint is a hash of `(childKind, objective, scope, requestedPermissions)`.

# Fan-Out Admission

When a parent has more children than `maxConcurrentRunningChildren`, the Scheduler decides which run.

```text
1.  Collect children of parent in state "admitted".
2.  Sort by (priority DESC, createdAt ASC). Ties break on nodeId ASC so the
    order is deterministic and replayable.
3.  Count running = children in state "running".
4.  While running < parent.limits.maxConcurrentRunningChildren and the sorted
    list is non-empty:
      a. Pop the head node.
      b. Ask the Scheduler for a global slot. If none, stop.
      c. Transition the node to "running".
      d. running += 1.
5.  Remaining nodes stay in "admitted" and are reconsidered when any sibling
    reaches a terminal state.
```

Sorting MUST be deterministic. Replay is a stated Eulinx requirement, and a nondeterministic admission order makes replay produce a different tree.

# Limit Errors

```ts
type HierarchyError =
  | "ParentNotFound"
  | "ParentNotRunning"
  | "WorkerCannotHaveChildren"
  | "OnlyOrchestratorsMayDelegate"
  | "DepthLimitExceeded"
  | "FanOutLimitExceeded"
  | "DescendantLimitExceeded"
  | "LimitEscalation"
  | "PermissionEscalation"
  | "ScopeEscalation"
  | "BudgetExceeded"
  | "CycleDetected"
  | "DuplicateDelegation"
  | "RepeatedRejectedDelegation"
  | "MissingRationale"
  | "CrossSessionEdge"
  | "CrossWorkspaceEdge";
```

Every one of these MUST produce a distinct message to the delegating Orchestrator. "Delegation failed" is not an acceptable message. The Orchestrator needs to know whether to replan smaller, replan shallower, or give up.

# Related Documents

- [[WorkerHierarchy-Part02]]
- [[WorkerHierarchy-Part04]]
- [[WorkerHierarchy-Diagrams]]
- [[Scheduler-Part01]]
- [[Orchestrator-Part01]]
