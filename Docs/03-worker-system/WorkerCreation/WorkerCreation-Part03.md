---
title: WorkerCreation Specification - Part 03
status: draft
version: 1.0
tags:
  - worker-system
  - worker-creation
  - identity
related:
  - "[[WorkerCreation-Part02]]"
  - "[[WorkerCreation-Part04]]"
  - "[[Scheduler-Part01]]"
---

# WorkerCreation Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, Scope, and Object Model
Part 02 - Creation Request Schema and Validation
Part 03 - Admission Control, Identity, and Role Selection
Part 04 - Binding: Model, Permissions, Context, Sandbox, Terminal
Part 05 - The Ordered Creation Algorithm and Registration
Part 06 - Failure, Rollback, Checklist, and Examples

# Purpose

This part covers the three things that happen after validation passes and before anything is bound: deciding whether to accept the work at all, giving the Worker a name, and deciding what kind of Worker it is.

# Admission Control

Validation asks "is this request legal?". Admission asks "should we take it right now?".

These are different questions with different answers. A perfectly legal request MUST be refused when the system is saturated. Admission control is what keeps Eulinx from accepting a hundred legal Workers and thrashing.

Admission is **not** scheduling. The Scheduler decides *when* an admitted Worker runs. Admission decides whether it enters the queue at all.

```text
Validation:  is this legal?          -> reject or continue
Admission:   do we accept it now?    -> reject, defer, or admit
Scheduling:  when does it run?       -> the Scheduler's job
```

## The Admission Decision

```ts
type AdmissionDecision =
  | { verdict: "admit" }
  | { verdict: "defer"; retryAfterMs: number; reason: AdmissionPressure }
  | { verdict: "reject"; reason: AdmissionPressure };

type AdmissionPressure =
  | "workspace_worker_limit"
  | "session_worker_limit"
  | "global_worker_limit"
  | "terminal_slots_exhausted"
  | "provider_rate_limited"
  | "workspace_budget_exhausted"
  | "session_budget_exhausted"
  | "parent_budget_exhausted"
  | "disk_pressure"
  | "runtime_degraded"
  | "queue_depth_exceeded";
```

`defer` and `reject` are different and MUST NOT be conflated. `defer` means the pressure is transient and the caller SHOULD retry after `retryAfterMs`. `reject` means the pressure will not resolve on its own and the caller MUST NOT retry.

```text
PRESSURE                     VERDICT   retryAfterMs
------------------------------------------------------------------
workspace_worker_limit       defer     5000
session_worker_limit         defer     5000
global_worker_limit          defer     5000
terminal_slots_exhausted     defer     5000
provider_rate_limited        defer     from provider Retry-After
queue_depth_exceeded         defer     10000
disk_pressure                defer     30000
runtime_degraded             defer     10000
workspace_budget_exhausted   reject    n/a
session_budget_exhausted     reject    n/a
parent_budget_exhausted      reject    n/a
```

The split is clean: capacity pressure defers, budget exhaustion rejects. Capacity frees up as Workers finish. Budget does not free up; it only refills when a human raises it, and a Worker retrying against an exhausted budget is a Worker spinning forever.

## The Admission Algorithm

1. Count live Workers in the Workspace. If `>= maxLiveWorkersPerWorkspace`, defer with `workspace_worker_limit`.
2. Count live Workers in the Session. If `>= session limit`, defer with `session_worker_limit`.
3. Count live Workers globally. If `>= global limit`, defer with `global_worker_limit`.
4. Ask the terminal pool for a free slot count. If 0, defer with `terminal_slots_exhausted`.
5. Ask the Provider client whether it is currently rate limited. If yes, defer with `provider_rate_limited` and use the provider's own `Retry-After` as `retryAfterMs`.
6. Check remaining Workspace budget. If 0, reject with `workspace_budget_exhausted`.
7. Check remaining Session budget. If 0, reject with `session_budget_exhausted`.
8. If the parent is a Worker, check its remaining budget. If 0, reject with `parent_budget_exhausted`.
9. Check free disk under the sandbox root. If below the role's minimum, defer with `disk_pressure`.
10. Check RuntimeManager health. If `degraded`, defer with `runtime_degraded`.
11. Check the Scheduler's queue depth. If above the configured maximum, defer with `queue_depth_exceeded`.
12. Otherwise, admit.

"Live" means any state in `{queued, spawning, initializing, idle, working, waiting, blocked, paused}`. It MUST NOT include `requested`, because a `requested` Worker holds nothing and counting it would let a burst of requests deadlock admission against itself. It MUST NOT include `failing`, `terminating`, `terminated`, or `zombie`.

Priority interacts with admission:

```text
PRIORITY   BEHAVIOR
------------------------------------------------------------------
low        Defers on any pressure.
normal     Defers on any pressure.
high       Defers on any pressure. Jumps the Scheduler queue later.
critical   Bypasses queue_depth_exceeded only. All other
           pressures still apply. Budget still rejects.
```

`critical` MUST NOT bypass budget. Nothing bypasses budget. A `critical` Worker that spends money the user does not have is a bug with a billing statement.

# Identity Assignment

## The Worker ID

```text
Format:   wkr_<ULID>
Example:  wkr_01HQ8F3K2MQZX9V4B7N6R2T8YW
Length:   30 characters total
```

Rules:

- The ID MUST be a ULID, not a UUIDv4, not an auto-increment integer.
- The ID MUST be generated by the runtime. A caller-supplied ID MUST be rejected.
- The ID MUST be opaque. Nothing MUST parse it for meaning.
- The ID MUST be immutable for the Worker's entire life, including through retry-adjacent flows.
- The ID MUST NOT be reused, ever, including after termination.

ULID is chosen deliberately over UUIDv4 for two reasons. It is lexicographically sortable by creation time, which makes `ORDER BY workerId` a deterministic, index-friendly creation order, and the watchdog and recovery sweeps in [[WorkerLifecycle-Part04]] and [[WorkerLifecycle-Part05]] both depend on `workerId` ordering being stable and meaningful. It is also monotonic within a millisecond, so two Workers created in the same tick still sort deterministically.

## Derived Identity

```ts
type WorkerIdentityAssignment = {
  workerId: string;
  rootWorkerId: string;
  parentWorkerId?: string;
  depth: number;
  siblingIndex: number;
  lineage: string[];
  displayName: string;
};
```

Computation:

```text
parentRef.kind is not "worker":
  rootWorkerId  = the new workerId (it is its own root)
  parentWorkerId = undefined
  depth         = 0
  lineage       = [workerId]

parentRef.kind is "worker":
  rootWorkerId  = parent.rootWorkerId
  parentWorkerId = parent.workerId
  depth         = parent.depth + 1
  lineage       = [...parent.lineage, workerId]
```

`siblingIndex` is the count of the parent's existing children at creation time, zero-based. It MUST be computed inside the same transaction that registers the Worker, or two concurrent children get the same index.

`lineage` is denormalized on purpose. Walking a parent chain to find the root is a recursive query on every event emission, and events are hot. Store the chain.

`displayName` is for humans only.

```text
Format:  <role.displayPrefix>-<siblingIndex>-<short>
Example: builder-0-K2MQZX
where short = last 6 characters of the ULID
```

`displayName` MUST NOT be used as a key, MUST NOT be assumed unique, and MUST NOT appear in any lookup. It is a label on a UI card.

# Role Selection

A role answers "what kind of Worker is this?" and it is the only knob the caller turns.

```ts
type WorkerRole = {
  roleId: string;
  displayPrefix: string;
  description: string;
  deprecated: boolean;

  cliProfileId: string;
  promptTemplateId: string;

  defaultPermissionProfileId: string;
  maxPermissionProfileId: string;

  defaultModelId: string;
  allowedModelIds: string[];
  fallbackModelIds: string[];

  defaultBudget: WorkerBudget;
  maxBudget: WorkerBudget;

  timeoutProfile: WorkerTimeoutProfile;
  sandboxStrategy: SandboxStrategy;

  requiredToolIds: string[];
  optionalToolIds: string[];

  allowedCreationModes: WorkerCreationMode[];
  allowedChildRoleIds: string[];

  version: number;
};
```

The `default` / `max` pairing is the mechanism that makes narrowing-only overrides possible. `default` is what you get. `max` is the ceiling an override may not exceed. A role with `default === max` is a role that cannot be widened at all, and that is the correct configuration for anything dangerous.

`allowedChildRoleIds` bounds the tree by kind, not just by count. A `reviewer` role with `allowedChildRoleIds: []` cannot spawn anything. A `builder` that may only spawn `tester` cannot spawn another `builder` and recurse. This MUST be checked in Layer 4 alongside the numeric limits.

## The Standard Roles

```text
ROLE         PURPOSE                          CHILDREN ALLOWED
------------------------------------------------------------------
orchestrator Plans and decomposes. Reasons     builder, reviewer,
             about work, does not do it.       tester, researcher
builder      Writes code. Produces artifacts.  tester
reviewer     Reads and critiques. Read-only    (none)
             permissions by default.
tester       Runs tests. Produces reports.     (none)
researcher   Reads and searches. No writes.    (none)
```

`reviewer` and `researcher` MUST default to read-only permission profiles. A reviewer that can write is a reviewer that will fix what it was asked to critique, and its fix will bypass the artifact and merge pipeline that exists precisely to keep AI output from touching trusted state.

## Role Resolution

1. Look up `roleId` in the role registry.
2. If absent, reject with `role_not_found`.
3. If `deprecated`, reject with `role_deprecated`.
4. Check the Workspace policy permits this role. If not, reject with `role_not_permitted_in_workspace`.
5. If the parent is a Worker, check `roleId` is in the parent role's `allowedChildRoleIds`. If not, reject with `child_role_not_permitted`.
6. Deep-clone the role into the resolved snapshot. MUST NOT store a reference.
7. Record `role.version` in the snapshot so Replay can reconstruct exactly what the Worker was.

Step 6 is the frozen-snapshot rule from Part 01. A user editing a role while a Worker runs MUST NOT change that Worker's powers.

# AI Notes

Do not merge admission into validation. Validation is deterministic and pure; admission depends on the state of the world at this instant. The same request that admits now defers in ten seconds, and that is correct.

Do not make `defer` and `reject` the same thing. A caller that retries a budget rejection spins forever against a wall only a human can move.

Do not let `critical` bypass budget checks. Priority is about ordering, not about money.

Do not use an auto-increment integer for `workerId`. It leaks the creation count, it collides across databases, and it makes IDs guessable.

Do not parse the `workerId`. It is opaque. If you need the role, read `roleId`.

Do not count `requested` Workers as live in admission. They hold no slot, no terminal, and no process, and counting them lets a burst of requests block itself.

Do not store a role reference on the Worker. Clone it.

# Related Documents

- [[WorkerCreation-Part02]]
- [[WorkerCreation-Part04]]
- [[WorkerCreation-Diagrams]]
- [[WorkerHierarchy-Part02]]
- [[Scheduler-Part01]]
- [[WorkerLifecycle-Part04]]
</content>
