---
title: WorkerHierarchy Specification - Part 02
status: draft
version: 1.0
tags:
  - worker-system
  - worker-hierarchy
  - architecture
related:
  - "[[WorkerHierarchy-Part01]]"
  - "[[Orchestrator-Part01]]"
  - "[[Worker-Part01]]"
---

# WorkerHierarchy Specification (Part 02)

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

# The Four Layers

Eulinx's tree has exactly four conceptual layers. The layer is determined by node kind and depth, and the runtime MUST validate both.

```text
Layer 0  User               depth 0     kind = "user"           exactly one per Session
Layer 1  Root Orchestrator  depth 1     kind = "orchestrator"   exactly one per Session
Layer 2  Sub-Orchestrator   depth 2..N  kind = "orchestrator"   zero or more
Layer 3  Worker             depth 2..N  kind = "worker"         leaf only
```

Note that Layer 2 and Layer 3 share a depth range. A Worker may hang directly off the Root Orchestrator at depth 2 when the task needs no further planning. There is no rule that Workers must live at the deepest layer. The only depth rule is the configured `maxDepth` ceiling.

# Node Kind Rules

The runtime MUST enforce these kind rules on every insertion:

```text
K1  kind == "user" is allowed only at depth 0 and only with parentId == null.
K2  There MUST be exactly one node with kind == "user" per Session.
K3  The single child of the user node MUST have kind == "orchestrator".
K4  kind == "orchestrator" MUST have parentId != null.
K5  kind == "worker" MUST have childIds.length == 0 for its entire life.
K6  Only kind == "orchestrator" may appear in any node's ancestor path above depth 0.
```

Rule K5 is the leaf rule. It is checked at insertion of the child, not at creation of the Worker. If any code path attempts to insert a node whose parent has `kind == "worker"`, the insertion MUST be rejected with `HierarchyError::WorkerCannotHaveChildren`.

# Why Orchestrators Branch and Workers Do Not

An Orchestrator holds a plan. A plan is what tells you how to divide an objective, how to allocate budget between the pieces, and how to recombine the results. A Worker holds a single objective and no plan.

If a Worker could spawn children it would have to invent an allocation policy at reasoning time. That is a design decision made by an AI at runtime, which is exactly what Eulinx forbids. Delegation is a planning act, so it lives with the planner.

```text
Workers reason.
Orchestrators plan.
Planning is the right to divide.
Reasoning is not.
```

# Parent Reference Model

```ts
type ParentRef = {
  nodeId: HierarchyNodeId;
  kind: "user" | "orchestrator";
  depth: number;
  remainingBudget: BudgetAllocation;
  permissions: PermissionSet;
  runningChildCount: number;
  maxDirectChildren: number;
};

type ChildRef = {
  nodeId: HierarchyNodeId;
  kind: HierarchyNodeKind;
  actorId: string;
  state: HierarchyNodeState;
  allocatedBudget: BudgetAllocation;
  result: NodeResult | null;
  lastHeartbeatAt: string;
};
```

A parent holds `ChildRef` values, not live handles to child actors. A parent MUST NOT be able to call into a child process directly. All parent-to-child direction travels as messages through the runtime, which is specified in [[WorkerCommunication-Part03]].

# The Hierarchy Store

```ts
interface HierarchyStore {
  insert(request: InsertNodeRequest): Promise<HierarchyNode>;
  get(nodeId: HierarchyNodeId): Promise<HierarchyNode | null>;
  getParent(nodeId: HierarchyNodeId): Promise<HierarchyNode | null>;
  getChildren(nodeId: HierarchyNodeId): Promise<HierarchyNode[]>;
  getAncestors(nodeId: HierarchyNodeId): Promise<HierarchyNode[]>;
  getDescendants(nodeId: HierarchyNodeId): Promise<HierarchyNode[]>;
  getSubtreeRoot(sessionId: string): Promise<HierarchyNode>;
  setState(nodeId: HierarchyNodeId, state: HierarchyNodeState): Promise<void>;
  setResult(nodeId: HierarchyNodeId, result: NodeResult): Promise<void>;
  snapshot(sessionId: string): Promise<HierarchySnapshot>;
}

type InsertNodeRequest = {
  parentId: HierarchyNodeId;
  kind: HierarchyNodeKind;
  actorId: string;
  scope: DelegatedScope;
  requestedPermissions: PermissionSet;
  requestedBudget: BudgetAllocation;
};
```

`getAncestors` MUST be implemented by splitting `node.path` on `/` and doing a batch fetch. It MUST NOT be implemented as a recursive loop of `getParent` calls, because that is O(depth) round trips and will be called on every permission check.

`getDescendants` MUST be implemented as a prefix query: `WHERE path LIKE node.path || '/%'`. This is the reason `path` exists.

# SQLite Schema

```sql
CREATE TABLE hierarchy_nodes (
  id                TEXT PRIMARY KEY,
  kind              TEXT NOT NULL CHECK (kind IN ('user','orchestrator','worker')),
  session_id        TEXT NOT NULL,
  workspace_id      TEXT NOT NULL,
  project_id        TEXT NOT NULL,
  parent_id         TEXT REFERENCES hierarchy_nodes(id),
  depth             INTEGER NOT NULL,
  path              TEXT NOT NULL,
  actor_id          TEXT,
  state             TEXT NOT NULL,
  scope_json        TEXT NOT NULL,
  permissions_json  TEXT NOT NULL,
  budget_json       TEXT NOT NULL,
  limits_json       TEXT NOT NULL,
  result_json       TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  terminated_at     TEXT
);

CREATE INDEX idx_hierarchy_parent  ON hierarchy_nodes(parent_id);
CREATE INDEX idx_hierarchy_path    ON hierarchy_nodes(path);
CREATE INDEX idx_hierarchy_session ON hierarchy_nodes(session_id, state);
CREATE UNIQUE INDEX idx_hierarchy_one_root
  ON hierarchy_nodes(session_id) WHERE kind = 'user';
```

The partial unique index on `kind = 'user'` is what enforces invariant K2 at the database level. Do not enforce it only in application code.

# Insertion Algorithm

Every node enters the tree through exactly this procedure. There is no other insertion path.

```text
1.  Receive InsertNodeRequest from an Orchestrator via the runtime.
2.  Open a SQLite transaction. Everything below happens inside it.
3.  Load parent = hierarchy_nodes WHERE id = request.parentId.
    If missing, reject with HierarchyError::ParentNotFound.
4.  If parent.kind == "worker", reject with HierarchyError::WorkerCannotHaveChildren.
5.  If parent.state is not "running", reject with HierarchyError::ParentNotRunning.
6.  Compute childDepth = parent.depth + 1.
7.  If childDepth > parent.limits.maxDepth,
    reject with HierarchyError::DepthLimitExceeded.
8.  Count existing = children of parent in non-terminal states.
    If existing >= parent.limits.maxDirectChildren,
    reject with HierarchyError::FanOutLimitExceeded.
9.  Count subtree = descendants of the session root.
    If subtree >= root.limits.maxDescendants,
    reject with HierarchyError::DescendantLimitExceeded.
10. Verify request.requestedPermissions is a subset of parent.permissions.
    If not, reject with HierarchyError::PermissionEscalation.
    Subset check is specified in WorkerHierarchy-Part04.
11. Verify request.requestedBudget fits parent.budget.remaining.
    If not, reject with HierarchyError::BudgetExceeded.
12. Generate childId. Compute childPath = parent.path + "/" + childId.
13. Run the cycle check from WorkerHierarchy-Part05 against childPath.
    If it fails, reject with HierarchyError::CycleDetected.
14. Debit parent.budget.remaining by request.requestedBudget.
15. INSERT the child row with state = "pending".
16. Append childId to parent.childIds and UPDATE the parent row.
17. Commit the transaction.
18. Emit hierarchy.node_inserted on the EventBus.
19. Hand the node to the Scheduler for admission.
```

Step 2 matters. If the parent budget debit and the child insert are not in one transaction, a crash between them leaks budget permanently.

# Sibling Relationships

Siblings are nodes that share a parent. Siblings have no relationship to each other beyond that fact.

The runtime MUST enforce:

```text
S1  A sibling MUST NOT read another sibling's memory.
S2  A sibling MUST NOT message another sibling directly.
S3  A sibling MUST NOT hold a lock another sibling is blocked on for longer than
    the LockManager's configured lease.
S4  A sibling's failure MUST NOT implicitly cancel another sibling. Only the
    shared parent may decide that, via an explicit cascade.
```

Rule S4 is a policy choice and it is deliberate. Two Workers building unrelated modules should not kill each other because one hit a compile error. The parent Orchestrator holds the plan, so the parent decides whether one failure invalidates the batch.

# Related Documents

- [[WorkerHierarchy-Part01]]
- [[WorkerHierarchy-Part03]]
- [[WorkerHierarchy-Diagrams]]
- [[WorkerCommunication-Part03]]
- [[Orchestrator-Part01]]
- [[LockManager-Part01]]
