---
title: VerifierNodes Specification - Part 02
status: draft
version: 1.0
tags:
  - workflow-engine
  - verifier-nodes
  - configuration
  - architecture
related:
  - "[[VerifierNodes-Part01]]"
  - "[[VerifierNodes-Part03]]"
  - "[[NodeArchitecture-Part01]]"
  - "[[EdgeTypes-Part01]]"
---

# VerifierNodes Specification (Part 02)

The verifier node config, its full type, and the ordered validation algorithm that rejects a bad graph before it ever runs.

# Where Validation Happens

Verifier config is validated **twice**, at two different times, for two different reasons. Implementers routinely build only the first and ship a hole.

```text
Graph validation time   (before a run starts, when the workflow is saved or loaded)
  Catches: structural errors. Missing ports. Two methods. Infinite timeout.
           Static authorship violations. AI-overrides-deterministic edges.
  Effect:  the workflow is REJECTED. It cannot be saved. It cannot be run.

Dispatch time           (per node, per run, immediately before the method executes)
  Catches: dynamic errors. The producing worker is only known at runtime.
           Artifact type does not match the method. Secret ref unresolvable.
  Effect:  the NODE emits Verdict { outcome: "error" }. The run continues
           under the gate rules in Part 05.
```

A rule that can be checked statically MUST be checked at graph validation time. Deferring a static check to dispatch time means a user discovers a typo forty minutes into a run.

A rule that depends on runtime provenance MUST be checked at dispatch time. Checking it statically is impossible; in a graph with dynamic expansion ([[DynamicGraphs-Part01]]) the producing worker does not exist when the graph is saved.

# The Full Config Type

```ts
type VerifierNodeConfig = {
  nodeId: string;
  label: string;
  kind: "verifier";

  method: VerifierMethod;

  gate: GateMode;

  timeoutMs: number;

  cachePolicy: VerdictCachePolicy;

  authorshipScope: AuthorshipScope;

  onFail: FailureRoute;

  inputs: {
    artifact: PortBinding;
    context?: PortBinding[];
  };

  outputs: {
    verdict: PortDeclaration;
  };
};

type PortBinding = {
  portName: string;
  fromNodeId: string;
  fromPortName: string;
  required: boolean;
};

type PortDeclaration = {
  portName: string;
  type: "Verdict";
};

type AuthorshipScope = "worker" | "tree" | "model";

type VerdictCachePolicy = {
  enabled: boolean;
  ttlMs: number | null;
  scope: "run" | "workflow" | "workspace";
};

type FailureRoute =
  | { route: "refine"; loopNodeId: string; maxAttempts: number }
  | { route: "reject"; reason: string }
  | { route: "escalate"; prompt: string; timeoutMs: number; onTimeout: "reject" | "approve" };
```

Note, again, what is **absent**. There is no `excludeWorkerIds` field. There is no `allowSelfVerification` flag. There is no `skipIf` predicate. There is no `overridePolicy`. A workflow author cannot disable the safety boundary from the config, because the config has no vocabulary for disabling it. This is the same design principle as `WorkerCreationRequest` having no `permissions` array (see [[WorkerCreation-Part01]]): the caller names intent, and the engine resolves intent to powers under rules the caller does not control.

`authorshipScope` looks like an exception. It is not. All three of its values are restrictions; there is no value that permits self-verification. `worker` is the minimum enforcement and `tree` and `model` are strictly stronger. Part 05 defines each.

# Field Rules

`nodeId` MUST be unique within the workflow. MUST match `^[a-z][a-z0-9_]{2,63}$`. The engine uses it as a cache key component and as a stable Replay anchor, so it MUST NOT be regenerated between runs of the same saved workflow.

`label` is human-facing only. It appears in the node graph UI ([[NodeGraph-Part01]]). It has no semantic meaning and MUST NOT be parsed by anything.

`method` MUST be exactly one `VerifierMethod`. Not an array. Part 01 explains why.

`gate` MUST be present. There is no default. An implementer who defaults it defaults it to `soft` (because that makes the tests pass), and a soft gate is not a gate. Force the author to say the word.

`timeoutMs` MUST be an integer. MUST be `>= 1000`. MUST be `<= 1800000` (30 minutes). MUST NOT be `null`, `0`, `Infinity`, or absent. Part 06 gives the recommended value per verifier kind.

`cachePolicy.ttlMs` MAY be `null`, meaning no time-based expiry. This is safe and is the recommended setting, because verdict cache entries are invalidated by content hash and verifier fingerprint, not by time. A TTL is a defense against a fingerprint bug, not a correctness mechanism.

`onFail` MUST be present. A verifier whose failure has no defined route is a verifier whose failure is ignored.

# The Graph Validation Algorithm

Run this for every node of `kind: "verifier"` when a workflow is saved and again when it is loaded for a run. It is ordered. Do not reorder it; later steps assume earlier steps passed.

```text
 1. Assert config.kind == "verifier".
      else -> not our node, skip.

 2. Assert nodeId matches ^[a-z][a-z0-9_]{2,63}$ and is unique in the workflow.
      else -> reject: invalid_node_id

 3. Assert method is a single object, not an array, and method.class is
    exactly one of "deterministic" | "ai".
      else -> reject: invalid_method_class

 4. Assert method.kind is a legal member of its class:
      class "deterministic" -> kind in { schema, lint, typecheck, build, test }
      class "ai"            -> kind in { critic, judge }
      else -> reject: method_kind_class_mismatch

 5. Validate method.config against the schema for (class, kind).
    Part 03 gives the five deterministic schemas.
    Part 04 gives the two AI schemas.
      else -> reject: invalid_method_config

 6. Assert gate.mode is exactly "hard" or "soft".
      else -> reject: missing_gate_mode

 7. Assert timeoutMs is an integer in [1000, 1800000].
      else -> reject: invalid_timeout

 8. Assert inputs.artifact is present and required == true.
      else -> reject: missing_artifact_input

 9. Resolve inputs.artifact.fromNodeId. Assert the node exists in the graph
    and declares an output port named inputs.artifact.fromPortName whose
    type is "Artifact" or "ArtifactRef".
      node missing   -> reject: dangling_artifact_input
      port missing   -> reject: unknown_source_port
      type mismatch  -> reject: artifact_port_type_mismatch

10. Assert outputs.verdict.type == "Verdict".
      else -> reject: invalid_verdict_port

11. STATIC AUTHORSHIP CHECK.
    Walk the graph backwards from inputs.artifact.fromNodeId to find the
    producing node P (Part 05 defines the walk).
    If P is a builder node and this verifier node's method.class == "ai" and
    this verifier's resolved workerRef would be P's workerRef, reject.
      -> reject: static_authorship_violation
    NOTE: this catches the obvious case only. The real check is at dispatch
    time (step 4 of the dispatch algorithm). This step is a courtesy to the
    user, not the enforcement mechanism. Do not treat it as sufficient.

12. PRECEDENCE CHECK.
    If this node's method.class == "ai" and gate.mode == "hard":
      Find every deterministic hard-gate verifier node D that reads the same
      artifact source (same fromNodeId + fromPortName).
      Assert there is no edge path from this AI node to a node that consumes
      D's verdict in a way that could satisfy a gate D failed.
      Concretely: assert no merge node lists this AI verdict and D's verdict
      in an "any" combinator. Only "all" is legal when a deterministic
      verdict is in the set.
        else -> reject: ai_overrides_deterministic

13. FAILURE ROUTE CHECK.
    switch onFail.route:
      "refine":
        Assert onFail.loopNodeId names an existing loop node in the graph.
          else -> reject: dangling_refine_target
        Assert that loop node's body transitively contains the producing
        node P found in step 11. A refine loop that does not re-run the
        producer cannot change the artifact and will spin maxAttempts times
        producing the identical failing verdict.
          else -> reject: refine_loop_excludes_producer
        Assert onFail.maxAttempts is an integer in [1, 10].
          else -> reject: invalid_max_attempts
      "reject":
        Assert onFail.reason is a non-empty string.
          else -> reject: missing_reject_reason
      "escalate":
        Assert onFail.prompt is a non-empty string.
          else -> reject: missing_escalation_prompt
        Assert onFail.timeoutMs is an integer in [1000, 86400000].
          else -> reject: invalid_escalation_timeout
        Assert onFail.onTimeout is "reject" or "approve".
        If onFail.onTimeout == "approve" and gate.mode == "hard":
          -> reject: unattended_approval_on_hard_gate
        Rationale: a hard gate that opens itself when nobody answers is
        not a gate. Fail closed. See [[PermissionManager-Part01]].

14. SOFT GATE SANITY.
    If gate.mode == "soft" and onFail.route != "reject":
      -> reject: soft_gate_with_active_route
    Rationale: a soft gate does not block, so there is nothing for a refine
    loop or an escalation to gate on. A soft gate records and moves on.
    Its onFail MUST be { route: "reject", reason } which, on a soft gate,
    means "record the rejection in the verdict log and proceed".

15. CACHE POLICY CHECK.
    Assert cachePolicy.scope is one of "run" | "workflow" | "workspace".
    If cachePolicy.enabled and cachePolicy.ttlMs != null:
      assert ttlMs is an integer in [1000, 604800000] (max 7 days).
        else -> reject: invalid_cache_ttl
    If method.class == "ai" and cachePolicy.scope == "workspace":
      -> warn: ai_verdict_cached_workspace_wide
      This is legal but almost never what the author meant. An AI verdict
      is model-version-dependent and the fingerprint covers that, but a
      workspace-scoped AI cache will serve verdicts across unrelated
      projects. Warn loudly. Do not reject.

16. Node is valid.
```

# Validation Error Type

```ts
type VerifierConfigError = {
  kind: VerifierConfigErrorKind;
  nodeId: string;
  failedAtStep: number;
  field?: string;
  message: string;
  at: string;
};

type VerifierConfigErrorKind =
  | "invalid_node_id"
  | "invalid_method_class"
  | "method_kind_class_mismatch"
  | "invalid_method_config"
  | "missing_gate_mode"
  | "invalid_timeout"
  | "missing_artifact_input"
  | "dangling_artifact_input"
  | "unknown_source_port"
  | "artifact_port_type_mismatch"
  | "invalid_verdict_port"
  | "static_authorship_violation"
  | "ai_overrides_deterministic"
  | "dangling_refine_target"
  | "refine_loop_excludes_producer"
  | "invalid_max_attempts"
  | "missing_reject_reason"
  | "missing_escalation_prompt"
  | "invalid_escalation_timeout"
  | "unattended_approval_on_hard_gate"
  | "soft_gate_with_active_route"
  | "invalid_cache_ttl";
```

`failedAtStep` refers to the step number in the algorithm above. It MUST be populated. The UI renders it as "your verifier node failed validation at step 13" with a link to this document, and that is the difference between a user fixing their graph and a user filing a bug.

Validation MUST collect **all** errors across **all** verifier nodes and return them as a list. It MUST NOT stop at the first. A user with six misconfigured verifiers should learn that in one pass, not six.

# The Dispatch-Time Validation Algorithm

Run this immediately before the method executes, per node, per run attempt.

```text
1. Resolve the artifact reference on inputs.artifact through the
   ArtifactManager. Do NOT read the filesystem.
     not found -> Verdict { outcome: "error", findings: [artifact_not_found] }

2. Assert the resolved artifact's type is compatible with method.kind.
   Part 03 gives the compatibility matrix.
     mismatch -> Verdict { outcome: "error", findings: [artifact_type_mismatch] }

3. Read the artifact's provenance record to obtain producedByWorkerId,
   its rootWorkerId, and its resolvedModel.

4. AUTHORSHIP EXCLUSION CHECK. This is the enforcement point.
   Compute the exclusion set per authorshipScope (Part 05, algorithm 05-A).
   Assert this node's assigned verifier worker is not in that set.
     violation -> Verdict { outcome: "error",
                            findings: [authorship_violation] }
                  and emit workflow.verifier.authorship_violation on the
                  EventBus at severity "error".
   The engine MUST NOT silently reassign to a different worker here. It
   emits the error verdict. A silent reassignment hides a graph bug that
   the user needs to see.

5. Compute artifactContentHash = sha256(artifact bytes).

6. Compute verifierFingerprint per Part 06, algorithm 06-A.

7. Consult the verdict cache. On hit, return the cached verdict with
   fromCache = true. Skip to emit.

8. Resolve any secret refs in method.config through the runtime secret
   store. Secrets MUST NOT be written into the verdict, the findings,
   the prompt, or any log line.
     unresolvable -> Verdict { outcome: "error",
                               findings: [secret_unresolvable] }

9. Start the timeout timer at timeoutMs.

10. Execute the method.

11. Map the result to a Verdict per Part 03 (deterministic) or
    Part 04 (AI).

12. Write to cache. Emit. Done.
```

Step 4 before step 5 is deliberate. Do not hash an artifact you are not allowed to verify, and do not consult a cache under an identity that has no right to the answer.

# Worked Config: A Typecheck Hard Gate

```ts
const typecheckGate: VerifierNodeConfig = {
  nodeId: "verify_types",
  label: "TypeScript typecheck",
  kind: "verifier",
  method: {
    class: "deterministic",
    kind: "typecheck",
    config: {
      tool: "tsc",
      args: ["--noEmit", "--pretty", "false"],
      workingDir: ".",
      tsconfigPath: "tsconfig.json",
      expectExitCode: 0,
      parser: "tsc_default"
    }
  },
  gate: { mode: "hard" },
  timeoutMs: 120000,
  cachePolicy: { enabled: true, ttlMs: null, scope: "workflow" },
  authorshipScope: "worker",
  onFail: { route: "refine", loopNodeId: "refine_loop", maxAttempts: 3 },
  inputs: {
    artifact: {
      portName: "artifact",
      fromNodeId: "build_patch",
      fromPortName: "patch",
      required: true
    }
  },
  outputs: { verdict: { portName: "verdict", type: "Verdict" } }
};
```

This config passes all 16 steps. Walk it once by hand against the algorithm before implementing; if your validator accepts this and rejects the same config with `timeoutMs: 0`, `gate` removed, or `loopNodeId: "does_not_exist"`, the validator is working.

# Worked Config: A Critic Soft Gate

```ts
const criticAdvisory: VerifierNodeConfig = {
  nodeId: "critic_readability",
  label: "Critic: readability and naming",
  kind: "verifier",
  method: {
    class: "ai",
    kind: "critic",
    config: {
      modelId: "claude-sonnet-4-5",
      providerId: "anthropic",
      rubricId: "readability_v2",
      promptTemplateId: "critic_readability_v2",
      scoreRange: [0, 10],
      threshold: 6,
      passIf: "gte",
      maxTokens: 4000,
      temperature: 0
    }
  },
  gate: { mode: "soft", recordOnly: true },
  timeoutMs: 90000,
  cachePolicy: { enabled: true, ttlMs: null, scope: "workflow" },
  authorshipScope: "tree",
  onFail: { route: "reject", reason: "Readability below threshold. Advisory only." },
  inputs: {
    artifact: {
      portName: "artifact",
      fromNodeId: "build_patch",
      fromPortName: "patch",
      required: true
    }
  },
  outputs: { verdict: { portName: "verdict", type: "Verdict" } }
};
```

Note step 14: because `gate.mode` is `soft`, `onFail.route` MUST be `reject`. A soft critic that tries to drive a refine loop is rejected at validation. If the author wants the critic to drive refinement, they make it a hard gate and accept that an advisory opinion now blocks their run. That tradeoff is theirs to make explicitly, which is the point.

Note `authorshipScope: "tree"` on the AI verifier. AI critics are held to the stricter scope by convention because a sibling worker sharing a root shares a context package and a system prompt, and shared context correlates opinions. Part 05 covers this.

# Related Documents

- [[VerifierNodes-Part01]]
- [[VerifierNodes-Part03]]
- [[VerifierNodes-Part04]]
- [[VerifierNodes-Part05]]
- [[VerifierNodes-Part06]]
- [[VerifierNodes-Diagrams]]
- [[NodeArchitecture-Part01]]
- [[EdgeTypes-Part01]]
- [[DynamicGraphs-Part01]]
- [[LoopNodes-Part01]]
- [[WorkerCreation-Part01]]
- [[PermissionManager-Part01]]
