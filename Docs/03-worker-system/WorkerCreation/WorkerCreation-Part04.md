---
title: WorkerCreation Specification - Part 04
status: draft
version: 1.0
tags:
  - worker-system
  - worker-creation
  - binding
related:
  - "[[WorkerCreation-Part03]]"
  - "[[WorkerCreation-Part05]]"
  - "[[ContextManager-Part01]]"
---

# WorkerCreation Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, Scope, and Object Model
Part 02 - Creation Request Schema and Validation
Part 03 - Admission Control, Identity, and Role Selection
Part 04 - Binding: Model, Permissions, Context, Sandbox, Terminal
Part 05 - The Ordered Creation Algorithm and Registration
Part 06 - Failure, Rollback, Checklist, and Examples

# Purpose

This part defines the five bindings that turn an identity into a Worker: a model to reason with, permissions to act with, context to reason about, a sandbox to act inside, and a terminal to act through.

Each binding resolves a reference to a frozen value. After this part, nothing about the Worker's powers is a pointer to something a user can edit.

# The Resolved Profile

This is the output of all five bindings and the Worker's complete definition.

```ts
type ResolvedWorkerProfile = {
  workerId: string;
  roleId: string;
  roleVersion: number;

  resolvedModel: ResolvedModelBinding;
  resolvedPermissions: ResolvedPermissionSet;
  resolvedContext: ResolvedContextBinding;
  resolvedSandbox: ResolvedSandboxBinding;
  resolvedTerminal: ResolvedTerminalBinding;
  resolvedBudget: WorkerBudget;
  resolvedTimeouts: WorkerTimeoutProfile;

  resolvedAt: string;
  resolverVersion: number;
};
```

`ResolvedWorkerProfile` MUST be persisted in full at registration. It is what Replay reconstructs from, and it is the evidence in a post-mortem of what a Worker was actually allowed to do.

# Binding 1: Model and Provider

```ts
type ResolvedModelBinding = {
  providerId: string;
  modelId: string;
  credentialRef: string;
  contextWindowTokens: number;
  maxOutputTokens: number;
  fallbackChain: string[];
  parameters: ModelParameters;
};

type ModelParameters = {
  temperature: number;
  topP: number;
  maxTokens: number;
  stopSequences: string[];
};
```

Resolution:

1. If `request.modelPreference.modelId` is set, use it. Else use `role.defaultModelId`.
2. Verify the chosen `modelId` is in `role.allowedModelIds`. If not, reject with `model_not_permitted_for_role`.
3. If the parent is a Worker, verify the model is permitted by the parent role's policy. If not, reject with `inheritance_violation`.
4. Resolve `providerId` from the model registry.
5. Resolve `credentialRef`. This is a **reference to** a credential, never the credential itself.
6. Verify the credential exists and is unexpired.
7. Build `fallbackChain` from `role.fallbackModelIds`, filtered to models whose providers have live credentials. If `request.modelPreference.fallbackAllowed` is false, set `fallbackChain = []`.
8. Resolve `parameters` from the role. A caller MUST NOT set model parameters directly.

`credentialRef` MUST be an opaque handle that the ProviderClient exchanges for a real secret at call time. The API key MUST NOT be written into `ResolvedWorkerProfile`, MUST NOT be persisted to SQLite, and MUST NOT be placed in an environment variable that appears in a process listing. See [[WorkerSandbox-Part05]].

Step 8 exists because model parameters are a permission surface. A caller that can set `temperature: 2.0` and `stopSequences: []` on a Worker with write permissions has meaningfully changed that Worker's behavior without touching its permission profile.

# Binding 2: Permissions

```ts
type ResolvedPermissionSet = {
  grants: PermissionGrant[];
  profileId: string;
  profileVersion: number;
  narrowedFrom?: string;
  escalationPolicy: "deny" | "ask_user" | "ask_parent";
};

type PermissionGrant = {
  capability: PermissionCapability;
  scope: PermissionScope;
  constraints: PermissionConstraint[];
};

type PermissionCapability =
  | "fs.read"
  | "fs.write"
  | "fs.delete"
  | "fs.execute"
  | "net.http"
  | "net.any"
  | "tool.invoke"
  | "worker.spawn"
  | "memory.read"
  | "memory.write"
  | "artifact.create"
  | "terminal.interactive";

type PermissionScope = {
  paths?: string[];
  hosts?: string[];
  toolIds?: string[];
  roleIds?: string[];
};

type PermissionConstraint =
  | { kind: "max_invocations"; value: number }
  | { kind: "requires_approval" }
  | { kind: "read_only" }
  | { kind: "time_boxed"; untilMs: number };
```

Resolution:

1. Start from `role.defaultPermissionProfileId`. Resolve it to a grant list.
2. If `request.permissionProfileOverrideId` is set, resolve it too.
3. Verify the override is a **subset** of `role.maxPermissionProfileId`. If not, reject with `permission_widening_attempted`.
4. Verify the override is a subset of the role default OR is explicitly narrower. Widening beyond the default but within max is permitted only if the requesting actor holds `worker.spawn` with a scope covering that role. Otherwise reject.
5. If the parent is a Worker, intersect the result with the parent's `resolvedPermissions`. The child gets the intersection, never the union.
6. Verify the intersection is non-empty. An empty grant list means the child can do nothing; reject with `inheritance_produces_empty_permissions` rather than creating a useless Worker.
7. Set `escalationPolicy` from the role.
8. Freeze.

Step 5 is the subset rule and it is the reason the hierarchy is safe. Intersection, not union. A parent with `fs.read` on `src/` and a child requesting `fs.read` on `/` gets `fs.read` on `src/`.

MUST NOT ever produce a grant the parent lacks. There is no flag for this. A child that needs more than its parent is a child whose parent should have been created differently.

# Binding 3: Context Package

```ts
type ResolvedContextBinding = {
  contextPackageId: string;
  promptTemplateId: string;
  promptTemplateVersion: number;
  estimatedTokens: number;
  sources: ContextSource[];
  redactionsApplied: number;
};

type ContextSource = {
  kind: "objective" | "parent_context" | "memory" | "artifact"
      | "file" | "role_instructions" | "workspace_rules";
  ref: string;
  tokens: number;
  truncated: boolean;
};
```

Assembly is delegated to [[ContextManager-Part01]]. WorkerCreation does not build context; it specifies what may go in it.

1. Always include `role_instructions` and `workspace_rules`.
2. Always include the `objective` verbatim.
3. If `contextSeed.includeParentContext` and the parent is a Worker, include the parent's shareable context per [[ContextSharing-Part02]]. MUST apply the parent's redaction rules.
4. If `contextSeed.memoryQuery` is set, ask the MemoryManager for matching memory scoped to this Workspace.
5. Include `explicitArtifactIds`, each verified in-Workspace at Layer 3.
6. Include `explicitFilePaths`, each verified in-boundary at Layer 3 and readable under the resolved `fs.read` grants. A path the Worker could not read anyway MUST NOT be put in its context.
7. Compute `estimatedTokens`. If it exceeds `resolvedModel.contextWindowTokens * 0.6`, ask ContextManager to compress. If still over after compression, reject with `context_exceeds_window`.
8. Apply secret redaction. Record the count.
9. Freeze the package and assign `contextPackageId`.

Step 6 is a real rule with real consequences. Putting a file in a Worker's context that its permissions forbid it to read is a permission bypass through the back door. Context is read access.

The 0.6 threshold in step 7 leaves 40 percent of the window for the conversation. A Worker whose context fills its window has no room to think.

# Binding 4: Sandbox

```ts
type ResolvedSandboxBinding = {
  sandboxId: string;
  sandboxRoot: string;
  strategy: SandboxStrategy;
  projectMountPath?: string;
  projectMountMode: "none" | "read_only" | "copy_on_write";
  networkPolicy: NetworkPolicy;
  envAllowlist: string[];
  cleanupPolicy: "on_terminate" | "on_success" | "never";
  quotaBytes: number;
};

type SandboxStrategy =
  | "isolated_temp"
  | "workspace_scratch"
  | "project_copy"
  | "project_direct";

type NetworkPolicy = {
  mode: "none" | "allowlist" | "any";
  allowedHosts: string[];
};
```

Resolution:

1. Take `strategy` from the role. A caller MUST NOT choose a strategy.
2. Compute `sandboxRoot` deterministically: `<workspace.runtimeRoot>/workers/<workerId>/`.
3. Verify `sandboxRoot` does not already exist. If it does, that is an ID collision or a leaked sandbox; reject with `sandbox_collision`.
4. If the parent is a Worker, verify `sandboxRoot` is inside the parent's `sandboxRoot`. If the strategy places it elsewhere, reject with `inheritance_violation`.
5. Set `projectMountMode` from the strategy: `isolated_temp` gets `none`, `workspace_scratch` gets `read_only`, `project_copy` gets `copy_on_write`, `project_direct` gets `copy_on_write`.
6. Set `networkPolicy` from the role. Default `mode` is `none`.
7. Build `envAllowlist`. This is an **allowlist**, never a denylist. The Worker process receives only these variables. See below.
8. Create the directory with the quota applied.

Note that `project_direct` still gets `copy_on_write`, not direct write access. There is no sandbox strategy in Eulinx that grants a Worker unmediated write access to the Project. That is the artifact and merge rule from the global principles, enforced at the filesystem layer rather than trusted to the Worker's good behavior.

The `envAllowlist` MUST be an allowlist. The default inherited environment on a developer machine contains `AWS_SECRET_ACCESS_KEY`, `GITHUB_TOKEN`, `NPM_TOKEN`, and SSH agent sockets. A denylist misses the one you did not think of. The default allowlist is:

```text
PATH
HOME or USERPROFILE
TMPDIR or TEMP
LANG
EULINX_WORKER_ID
EULINX_SANDBOX_ROOT
EULINX_EVENT_SOCKET
```

Nothing else. Not `SHELL`, not `SSH_AUTH_SOCK`, not the provider API key, which reaches the process through `credentialRef` at call time and never through the environment.

# Binding 5: Terminal

```ts
type ResolvedTerminalBinding = {
  terminalId: string;
  ptyRows: number;
  ptyCols: number;
  shellPath: string;
  cliProfileId: string;
  command: string;
  args: string[];
  cwd: string;
  scrollbackLines: number;
  interactive: boolean;
};
```

Resolution:

1. Reserve a terminal slot from the pool. If none, that is an admission bug; Part 03 step 4 should have deferred. Reject with `terminal_slots_exhausted`.
2. Resolve `cliProfileId` from the role.
3. Resolve `command` from the CLI profile. It MUST come from the profile. It MUST NOT come from the request, from the objective, or from any AI output.
4. Build `args` by binding the CLI profile's **argument template** to resolved values. Each slot is typed and each value is validated against its slot's type.
5. Set `cwd = resolvedSandbox.sandboxRoot`. Never the Project root.
6. Set `interactive` from the `terminal.interactive` grant. If the Worker lacks it, the PTY is output-only and input is rejected.
7. Bind the PTY. Do not start the process; that is Part 05.

Step 4 is the command injection boundary and it is worth being explicit about. The objective is AI-adjacent text. It MUST NOT be concatenated into a command string. The argument template names slots, the resolver fills slots with validated values, and the process is started with an argument **vector**, never a shell string.

```text
CORRECT:
  command = "claude"
  args    = ["--print", "--model", "claude-opus-4-8",
             "--append-system-prompt", "<resolved prompt>"]
  spawn(command, args)          <-- no shell

WRONG:
  spawn(`claude --print "${objective}"`, { shell: true })
```

The wrong form is how an objective containing `"; rm -rf ~; echo "` becomes a very bad afternoon. MUST NOT use `shell: true`. MUST NOT build a command string. MUST pass an argument vector.

# AI Notes

Do not put the API key in an environment variable. It shows up in process listings, in crash dumps, and in the Worker's own `env` output if it ever runs one. Use `credentialRef` and resolve at call time.

Do not use an environment denylist. Allowlist. You will not think of `SSH_AUTH_SOCK`.

Do not union parent and child permissions. Intersect. This is the single most consequential line in this part.

Do not let a caller pick a sandbox strategy or a sandbox root. Roles pick strategies; the runtime computes roots.

Do not put a file in a Worker's context that the Worker lacks permission to read.

Do not build a command string. Argument vectors, no shell, always.

Do not store the role by reference. The frozen snapshot is the entire point of this part.

# Related Documents

- [[WorkerCreation-Part03]]
- [[WorkerCreation-Part05]]
- [[WorkerCreation-Diagrams]]
- [[ContextManager-Part01]]
- [[ContextSharing-Part02]]
- [[WorkerSandbox-Part05]]
- [[WorkerPermissions-Part01]]
- [[PermissionManager-Part01]]
</content>
