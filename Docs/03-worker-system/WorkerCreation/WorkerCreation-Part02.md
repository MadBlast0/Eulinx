---
title: WorkerCreation Specification - Part 02
status: draft
version: 1.0
tags:
  - worker-system
  - worker-creation
  - validation
related:
  - "[[WorkerCreation-Part01]]"
  - "[[WorkerCreation-Part03]]"
  - "[[WorkspaceManager-Part01]]"
---

# WorkerCreation Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, Scope, and Object Model
Part 02 - Creation Request Schema and Validation
Part 03 - Admission Control, Identity, and Role Selection
Part 04 - Binding: Model, Permissions, Context, Sandbox, Terminal
Part 05 - The Ordered Creation Algorithm and Registration
Part 06 - Failure, Rollback, Checklist, and Examples

# Purpose

This part defines validation: the layered checks a `WorkerCreationRequest` MUST survive before a single resource is allocated.

Validation is free. Allocation is not. Every check that can run before allocation MUST run before allocation, so that the common failure path costs nothing and rolls back nothing.

# Validation Layers

Validation runs in this order and stops at the first failure.

```text
1. Schema validation        Is the request structurally well-formed?
2. Reference validation     Do the things it names exist?
3. Boundary validation      Are they all in the same Workspace?
4. Parent validation        May the parent create this child?
5. Role validation          Is the role real and permitted here?
6. Inheritance validation   Are the requested powers a subset?
7. Resource validation      Is there a CLI, a model, a credential?
8. Budget validation        Is there budget left to spend?
9. Runtime validation       Is the runtime in a state that allows this?
```

The order is not arbitrary. Cheap checks precede expensive ones, and local checks precede checks that call other services. Layer 1 is a pure function. Layer 9 touches the RuntimeManager.

# Layer 1: Schema Validation

Pure. No I/O. MUST reject a request that:

```text
lacks requestId, workspaceId, projectId, or sessionId
has a requestId that is not a valid Eulinx ID
has an objective that is empty or longer than 8192 characters
has an unknown creationMode
has an unknown priority
has a parentRef with an unknown kind
has a parentRef with a negative depth
has a contextSeed with more than 64 explicitFilePaths
has a contextSeed with more than 64 explicitArtifactIds
has a contextSeed with any explicitFilePath that is absolute
has a contextSeed with any explicitFilePath containing ".."
has a budgetOverride with any negative or zero value
has a modelPreference naming a modelId without a providerId
has a retryOf pointing at itself
```

The two `explicitFilePath` rules are security checks, not hygiene. A path that is absolute or contains `..` is an attempt to reach outside the Workspace, and it MUST be rejected at the schema layer rather than trusted to a later boundary check. Defense in depth: [[WorkspaceManager-Part01]] will check again.

```ts
type SchemaViolation = {
  field: string;
  rule: string;
  got: string;
  message: string;
};
```

A schema failure MUST return every violation found, not the first. A caller fixing one field at a time across nine round trips is a caller that gives up.

# Layer 2: Reference Validation

Every ID in the request MUST resolve to a live object.

```text
FIELD                          MUST RESOLVE TO
------------------------------------------------------------------
workspaceId                    a Workspace that is loaded
projectId                      a Project in that Workspace
sessionId                      a Session that is active or resumable
parentRef.id                   a live Worker, Orchestrator, or node
taskId                         a Task in that Session
workflowId                     a Workflow in that Project
workflowNodeId                 a node in that Workflow
roleId                         a registered WorkerRole
permissionProfileOverrideId    a registered PermissionProfile
retryOf                        a Worker in state terminated
modelPreference.providerId     a configured Provider
modelPreference.modelId        a Model offered by that Provider
```

`retryOf` MUST point at a `terminated` Worker specifically. Retrying a Worker that is still alive would produce two Workers doing the same task with the same locks. If `retryOf` names a Worker in any non-terminal state, reject with `retry_target_still_alive`.

# Layer 3: Boundary Validation

This is the workspace isolation check and it is the most important layer in this part.

MUST verify:

```text
The Project belongs to the Workspace.
The Session belongs to the Workspace.
The parent belongs to the same Workspace.
The Task belongs to the Session.
The Workflow belongs to the Project.
Every explicitArtifactId belongs to the Workspace.
Every explicitFilePath resolves inside the Project root.
retryOf, if present, belongs to the same Workspace.
```

MUST NOT allow a Worker in Workspace A to be created with context, artifacts, files, or a parent from Workspace B. There is no flag, no mode, and no override that permits this. Cross-workspace creation is a runtime bug, not a feature.

The `explicitFilePath` resolution MUST be done by canonicalizing the path against the Project root and confirming the canonical result is still under the Project root. String prefix comparison is insufficient: symlinks, `..` segments already rejected at layer 1, and Windows short names all defeat it. Delegate to [[WorkspaceManager-Part01]]'s boundary checker; do not reimplement it here.

# Layer 4: Parent Validation

```text
PARENT KIND      REQUIREMENTS
------------------------------------------------------------------
user             Always permitted. depth = 0.
orchestrator     Orchestrator must be live and in the same Session.
                 depth = 0.
workflow_node    Node must be active in a running Workflow. depth = 0.
worker           Parent Worker must be in state working.
                 Parent must hold the spawn_child permission.
                 Parent depth + 1 must not exceed maxDepth.
                 Parent's live child count must be below maxChildren.
                 depth = parent.depth + 1.
```

A `worker` parent MUST be in `working`. Not `idle`, not `waiting`, not `blocked`. A Worker only creates a child as part of executing a task, and `working` is the only state in which the Part 03 operation matrix permits `spawn_child`. This check is the creation-side mirror of the gate, and both MUST exist.

Fan-out and depth limits:

```ts
type HierarchyLimits = {
  maxDepth: number;
  maxChildrenPerWorker: number;
  maxDescendantsPerRoot: number;
  maxLiveWorkersPerWorkspace: number;
};

const DEFAULT_HIERARCHY_LIMITS: HierarchyLimits = {
  maxDepth: 5,
  maxChildrenPerWorker: 8,
  maxDescendantsPerRoot: 64,
  maxLiveWorkersPerWorkspace: 32,
};
```

All four MUST be checked. `maxChildrenPerWorker` alone does not bound a tree: eight Workers each spawning eight, five deep, is 32768 Workers. `maxDescendantsPerRoot` is what actually stops the fork bomb. See [[WorkerHierarchy-Part03]].

# Layer 5: Role Validation

```text
The roleId resolves to a registered WorkerRole.
The role is not deprecated.
The role is permitted in this Workspace by Workspace policy.
The role's required CLI profile is available.
The role's required tools are all registered in the ToolRegistry.
The role's creationMode support includes the requested mode.
```

A role that names a tool the ToolRegistry does not have MUST be rejected at creation, not discovered at first tool call. A Worker that starts and then cannot do its job has already consumed a slot, a sandbox, and a model handshake.

# Layer 6: Inheritance Validation

This layer enforces the subset rule. It is the check that makes the hierarchy safe.

For a `worker` parent:

```text
The child's resolved permissions MUST be a subset of the parent's
  resolved permissions.
The child's budget MUST be drawn from the parent's REMAINING budget,
  not the parent's original budget.
The child's sandbox root MUST be inside the parent's sandbox root.
The child's model MUST be permitted by the parent's role policy.
```

The remaining-budget rule is the one implementers get wrong. A parent granted 100000 tokens that has already spent 90000 may create a child with at most 10000. Checking against the original 100000 lets a tree spend without bound: each generation re-reads a budget its ancestors already consumed.

```ts
type InheritanceViolation = {
  dimension: "permission" | "budget" | "sandbox" | "model";
  requested: string;
  parentHas: string;
  message: string;
};
```

MUST reject with `inheritance_violation` and MUST NOT silently narrow. Silently narrowing produces a Worker that believes it has powers it lacks, and it will fail confusingly at its first tool call rather than clearly at creation.

That rule has one deliberate exception, stated in Part 04: an explicit `permissionProfileOverrideId` or `budgetOverride` that narrows is honored, because the caller asked for narrowing. The prohibition is on narrowing the caller did not ask for.

# Layer 7: Resource Validation

```text
The Provider is configured and its credential is present.
The credential is not expired.
The Model is available from that Provider.
The CLI executable named by the role's CLI profile exists on disk.
The CLI executable is on the Workspace's approved list.
A terminal slot is available.
Disk space for the sandbox root exceeds the role's minimum.
```

Credential expiry MUST be checked at creation. A Worker that spawns with an expired token burns a slot, initializes, and dies at handshake, and the user sees a confusing runtime failure instead of a clear "your API key expired".

# Layer 8: Budget Validation

```text
The Workspace has remaining budget.
The Session has remaining budget.
The parent has remaining budget if the parent is a Worker.
The requested budgetOverride does not exceed any of the above.
The role's default budget does not exceed any of the above.
```

Budget is checked at every level of the chain, not just the nearest. A Session with budget left inside a Workspace with none MUST be rejected.

# Layer 9: Runtime Validation

```text
The RuntimeManager state is ready or running.
Runtime recovery has completed.
The Workspace is not shutting down.
The Session is not cancelled.
maxLiveWorkersPerWorkspace is not exceeded.
```

The recovery check is a hard requirement from [[WorkerLifecycle-Part05]]. Creating a Worker before recovery finishes means contending for locks that ghost Workers still hold in the database.

# The Validation Result

```ts
type ValidationResult =
  | { valid: true; request: WorkerCreationRequest }
  | { valid: false; failures: ValidationFailure[] };

type ValidationFailure = {
  layer: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  kind: WorkerCreationErrorKind;
  detail: SchemaViolation | InheritanceViolation | string;
  retryable: boolean;
  message: string;
};
```

Retryability by layer:

```text
LAYER  RETRYABLE  WHY
------------------------------------------------------------------
1      no         The request is malformed. It will stay malformed.
2      no         The named object does not exist.
3      no         Cross-boundary. Never becomes legal.
4      maybe      Parent may leave working; fan-out may free up.
5      no         The role is wrong.
6      no         The subset rule never loosens.
7      maybe      A credential may be refreshed; a slot may free up.
8      maybe      Budget may be raised by the user.
9      maybe      The runtime may become ready.
```

A caller MUST NOT retry a non-retryable failure. The Scheduler's retry policy MUST consult this table.

# AI Notes

Do not collapse these layers into one function with thirty `if` statements. The layer number is carried in the failure, the retryability is derived from it, and the Scheduler makes decisions from it. Layers are load-bearing.

Do not validate after allocating. The entire reason validation is nine layers deep and allocation-free is so that the failure path costs nothing.

Do not check budget against the parent's original allowance. Check remaining. See Layer 6.

Do not skip `maxDescendantsPerRoot` because `maxChildrenPerWorker` "already limits it". Do the multiplication.

Do not reimplement path canonicalization. Call WorkspaceManager. Path boundary bugs are how sandboxes get escaped and every language's path library has surprises.

Do not return only the first schema violation.

# Related Documents

- [[WorkerCreation-Part01]]
- [[WorkerCreation-Part03]]
- [[WorkerCreation-Diagrams]]
- [[WorkerHierarchy-Part03]]
- [[WorkspaceManager-Part01]]
- [[PermissionManager-Part01]]
- [[WorkerLifecycle-Part05]]
</content>
