---
title: WorkerHierarchy Specification - Part 04
status: draft
version: 1.0
tags:
  - worker-system
  - worker-hierarchy
  - permissions
related:
  - "[[WorkerHierarchy-Part03]]"
  - "[[WorkerHierarchy-Part05]]"
  - "[[PermissionManager-Part01]]"
---

# WorkerHierarchy Specification (Part 04)

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

# The Authority Rule

```text
A child MUST NOT exceed its parent's permissions. Ever. Under any condition.
There is no escalation path, no override flag, no admin mode, and no exception
for the Root Orchestrator.
```

This is the most important rule in this document. Every other rule here is machinery for enforcing it.

Authority in Eulinx flows in exactly one direction: down, and weakening. The user root holds the maximum permission set for the Session. Every edge in the tree either preserves or shrinks that set. Therefore the permission set of any node is bounded above by the user's, and this is provable by induction on depth without inspecting a single AI decision.

# Permission Set Model

```ts
type PermissionVerb =
  | "fs.read"
  | "fs.write"
  | "fs.delete"
  | "process.spawn"
  | "net.outbound"
  | "tool.invoke"
  | "artifact.create"
  | "merge.propose"
  | "memory.read.workspace"
  | "memory.write.workspace"
  | "hierarchy.delegate";

type PermissionGrant = {
  verb: PermissionVerb;
  resourcePattern: string;
  constraints: PermissionConstraint[];
};

type PermissionConstraint =
  | { kind: "maxInvocations"; value: number }
  | { kind: "requiresApproval"; approver: "user" | "parent" }
  | { kind: "expiresAt"; iso: string }
  | { kind: "allowedHosts"; hosts: string[] };

type PermissionSet = {
  grants: PermissionGrant[];
  denials: PermissionGrant[];
};
```

Denials are stored explicitly and are not merely the absence of a grant. A denial is a positive statement that cannot be undone by a descendant. This is what makes the subset check tractable: a child may add denials freely, but may never remove one.

# The Subset Check

This is the algorithm referenced from Part 02 step 10 and Part 03 step 7. It MUST be implemented exactly as written.

```text
Function: isPermissionSubset(child: PermissionSet, parent: PermissionSet) -> bool

1.  For each grant G in child.grants:
      a. Find the set M of grants in parent.grants where
         P.verb == G.verb AND patternCovers(P.resourcePattern, G.resourcePattern).
      b. If M is empty, return false. The child asks for a verb or a resource
         the parent does not hold.
      c. Select P = the single most specific member of M. Specificity is
         measured by pattern segment count, longest wins; ties break on
         lexicographic order of the pattern so the choice is deterministic.
      d. For each constraint C in P.constraints:
           - If C.kind == "maxInvocations": the child MUST carry a
             maxInvocations constraint with value <= C.value. If absent,
             return false.
           - If C.kind == "requiresApproval": the child MUST carry an identical
             requiresApproval constraint. It MUST NOT be dropped or weakened
             from "user" to "parent". If absent or weakened, return false.
           - If C.kind == "expiresAt": the child MUST carry an expiresAt
             constraint with an ISO timestamp <= C.iso. If absent, return false.
           - If C.kind == "allowedHosts": the child's allowedHosts MUST be a
             subset of C.hosts. If absent, return false.
      e. If any grant D in parent.denials has D.verb == G.verb AND
         patternCovers(D.resourcePattern, G.resourcePattern), return false.
         An explicit parent denial beats any parent grant.

2.  For each denial D in parent.denials:
      a. The child MUST carry a denial with the same verb and a pattern that
         covers D.resourcePattern. If absent, return false.
         Denials are inherited mandatorily, not optionally.

3.  Return true.
```

Step 1e and step 2 together mean: denials propagate down and win over grants at every level. Implement `patternCovers` as glob matching where `**` matches any path depth and `*` matches one segment. `patternCovers("src/**", "src/api/x.ts")` is true. `patternCovers("src/api/*", "src/api/deep/x.ts")` is false.

# Effective Permission Resolution

At the moment a node attempts an action, the PermissionManager MUST compute the effective decision by walking the node's stored path, not by trusting the node's own permission set.

```text
1.  Load node by id. Read node.path.
2.  Split node.path on "/" to get the ancestor id list, root first.
3.  Batch load all ancestor nodes in one query using the id list.
4.  Set effective = ancestors[0].permissions (the user root set).
5.  For each subsequent ancestor A in path order, including the node itself:
      a. effective.grants = intersect(effective.grants, A.permissions.grants)
      b. effective.denials = union(effective.denials, A.permissions.denials)
6.  If any ancestor's state is "paused", "cancelled", "failed", or "terminated",
    return Decision::Deny with reason AncestorNotRunning. A node MUST NOT act
    under a dead or suspended ancestor.
7.  Evaluate the requested action against effective:
      a. If any denial matches, return Decision::Deny.
      b. If no grant matches, return Decision::Deny. Fail closed.
      c. If a matching grant carries requiresApproval, return
         Decision::NeedsApproval and route to the named approver.
      d. Otherwise return Decision::Allow.
8.  Emit permission.evaluated with nodeId, verb, resource, and decision.
```

Step 6 is not optional and implementers skip it. A Worker whose grandparent Orchestrator was cancelled two seconds ago MUST NOT be able to write a file, even if its own node row still says "running" because the cascade has not reached it yet. The ancestor state check closes that window.

Step 5 recomputes rather than trusting `node.permissions` because the stored set is a cache. If a bug or a migration ever corrupts a stored set, the walk catches it. This costs one indexed batch query per action and is worth it.

# Budget Model

```ts
type BudgetAllocation = {
  allocatedTokens: number;
  allocatedUsdMicros: number;
  allocatedWallClockMs: number;
  allocatedToolInvocations: number;

  spentTokens: number;
  spentUsdMicros: number;
  spentWallClockMs: number;
  spentToolInvocations: number;

  reservedForChildrenTokens: number;
  reservedForChildrenUsdMicros: number;
};
```

Costs are held in integer micros of USD. They MUST NOT be held as floats. Floating point accumulation across hundreds of tool calls drifts, and a budget that drifts is a budget that does not hold.

Remaining budget is derived, never stored:

```text
remainingTokens = allocatedTokens - spentTokens - reservedForChildrenTokens
```

# The Budget Fit Check

```text
Function: budgetFits(request: BudgetAllocation, parent: HierarchyNode) -> bool

1.  Compute parentRemainingTokens =
      parent.budget.allocatedTokens
      - parent.budget.spentTokens
      - parent.budget.reservedForChildrenTokens
2.  If request.allocatedTokens > parentRemainingTokens, return false.
3.  Repeat steps 1 and 2 for usdMicros, wallClockMs, and toolInvocations.
    All four dimensions MUST fit. Any single failure returns false.
4.  Verify request.allocatedWallClockMs does not push the child's deadline past
    parent.scope.deadlineAt. If it does, return false.
5.  Return true.
```

# Budget Inheritance Rules

```text
B1  A parent MUST debit reservedForChildren by the child's full allocation at
    insertion, inside the same transaction as the insert.
B2  A child's spend MUST NOT be double counted against the parent. The parent
    already paid at reservation time. Do not also add child spend to
    parent.spentTokens.
B3  When a child reaches a terminal state, the parent MUST refund the child's
    unspent allocation:
      refund = child.allocated - child.spent
      parent.reservedForChildren -= child.allocated
      parent.spent += child.spent
    This is the only moment parent.spent moves due to a child.
B4  A node MUST NOT exceed its own allocation. When spent reaches allocated,
    the runtime MUST transition the node to "failed" with reason
    BudgetExhausted and cascade terminate to its descendants.
B5  A node MUST NOT borrow from a sibling. If a Worker needs more budget it
    MUST return outcome "partial" with a needsBudget payload and let the parent
    decide whether to re-delegate with a larger allocation.
B6  The user root's allocation is the Session budget. It is set once at Session
    start and MUST NOT be raised by any node in the tree, only by the user
    through an explicit UI action that is recorded as a user event.
```

Rule B3's refund step is where the accounting closes. Without it a Session that allocates 10k tokens to a child that uses 2k has 8k stranded forever, and the tree runs out of budget while the meter says it is idle.

# Worked Authority Example

```text
User root:          fs.write on "**",         200000 tokens, 5000000 usdMicros
Root Orchestrator:  fs.write on "**",         180000 tokens, 4500000 usdMicros
Sub-Orch Backend:   fs.write on "src/api/**",  60000 tokens, 1500000 usdMicros
Worker schema:      fs.write on "src/api/db/*", 20000 tokens,  500000 usdMicros

Worker schema requests fs.write on "src/api/db/schema.sql".
  Walk path: root -> orc -> sub -> worker.
  intersect grants: "**" AND "**" AND "src/api/**" AND "src/api/db/*"
                  = "src/api/db/*"
  "src/api/db/schema.sql" matches "src/api/db/*". Allow.

Worker schema requests fs.write on "src/ui/App.tsx".
  Effective grant is "src/api/db/*". No match. Deny.
  It does not matter that the user root holds fs.write on "**".
  The narrowest ancestor wins.
```

# Related Documents

- [[WorkerHierarchy-Part03]]
- [[WorkerHierarchy-Part05]]
- [[WorkerHierarchy-Diagrams]]
- [[PermissionManager-Part01]]
- [[Permission-Part01]]
