---
title: VerifierNodes Specification - Part 03
status: draft
version: 1.0
tags:
  - workflow-engine
  - verifier-nodes
  - deterministic-verification
  - architecture
related:
  - "[[VerifierNodes-Part02]]"
  - "[[VerifierNodes-Part04]]"
  - "[[TestArtifacts-Part01]]"
  - "[[WorkspaceManager-Part01]]"
---

# VerifierNodes Specification (Part 03)

The five deterministic verifiers: schema, lint, typecheck, build, test. These are the authoritative ones. When one of these says fail, the artifact does not merge, and no model's opinion changes that.

# What Makes a Verifier Deterministic

A deterministic verifier runs a real tool against real bytes and reports a real exit code. It contains no model call. It has no opinion.

```text
deterministic verifier =
    materialize artifact into a scratch tree
  + run a subprocess
  + read exit code and stdout/stderr
  + parse into findings
  + map exit code to outcome

No step in that list can return a different answer on Tuesday.
```

Every deterministic verifier MUST satisfy:

- no network access unless the config explicitly enables it (`allowNetwork`, default `false`)
- no wall-clock dependency in the pass/fail decision
- no dependency on state outside the materialized scratch tree
- identical exit code for identical input bytes

A verifier that violates any of these MUST NOT be given `class: "deterministic"`. Its verdict would be marked `authoritative: true` and the whole precedence model rests on that flag being honest.

# Materialization: The Scratch Tree

Every deterministic verifier runs against a **materialized scratch tree**, never against the project working tree. This is the mechanism that makes "verify before merge" physically true rather than aspirational.

```ts
type ScratchTree = {
  scratchId: string;
  rootPath: string;
  baseCommitSha: string;
  appliedArtifactIds: string[];
  createdAt: string;
  ttlMs: number;
};
```

## Algorithm 03-A: Materialize

```text
 1. Read artifact.baseCommitSha from the artifact's provenance record.
      absent -> Verdict { outcome: "error", findings: [missing_base_commit] }

 2. Request a scratch tree from the WorkspaceManager:
      workspaceManager.createScratchTree(workspaceId, baseCommitSha)
    This produces an isolated copy-on-write checkout at baseCommitSha.
    It is NOT the user's working tree. It is NOT a git worktree of the
    user's branch that could be left dirty.
      quota exceeded -> Verdict { outcome: "error", findings: [scratch_quota_exceeded] }
      base sha unknown -> Verdict { outcome: "error", findings: [unknown_base_commit] }

 3. Apply the artifact to the scratch tree.
      For a patch artifact: apply the diff.
        conflict -> Verdict { outcome: "fail",
                              findings: [{ code: "patch_does_not_apply", severity: "error", ... }] }
        NOTE: this is "fail", not "error". A patch that does not apply to
        its own declared base is a defective artifact, and that is exactly
        the kind of thing a verifier exists to catch. Route it to refine.
      For a file artifact: write the file at its declared path.
        path escapes scratch root -> Verdict { outcome: "error",
                                               findings: [path_boundary_violation] }
        and emit workspace.path_violation at severity "critical".
        See [[WorkspaceManager-Part01]]. This is an attack, not a bug.

 4. If the node has additional artifacts on its context ports and the
    method config sets applyContextArtifacts: true, apply each in the
    order given. Same error handling as step 3.

 5. Record appliedArtifactIds. Return the ScratchTree.

 6. On ANY exit path from the verifier, including timeout and internal
    error, destroy the scratch tree. A leaked scratch tree is a leaked
    multi-gigabyte checkout. Use a finally block. Do not rely on the TTL
    sweep; the TTL sweep is the backstop, not the mechanism.
```

The scratch tree MUST be destroyed even on the cache-hit path if one was created. It MUST NOT be reused across verifier nodes; two verifiers sharing a scratch tree means verifier A's side effects change verifier B's answer, and determinism is gone.

# The Compatibility Matrix

Dispatch-time step 2 (Part 02) checks this table. A verifier kind MUST refuse an artifact type it cannot meaningfully check.

```text
method.kind    accepts artifact types
-----------    ----------------------------------------------------------
schema         JSONArtifact, MarkdownArtifact, any artifact with a
               declared schemaId
lint           PatchArtifact, CodeArtifact
typecheck      PatchArtifact, CodeArtifact
build          PatchArtifact, CodeArtifact
test           PatchArtifact, CodeArtifact, TestArtifact

Anything else -> Verdict { outcome: "error",
                           findings: [artifact_type_mismatch] }
```

A `schema` verifier pointed at a PatchArtifact is a graph bug. Do not "helpfully" coerce. Emit the error verdict so the user sees it.

# Shared Deterministic Config

```ts
type DeterministicVerifierConfig =
  | SchemaVerifierConfig
  | LintVerifierConfig
  | TypecheckVerifierConfig
  | BuildVerifierConfig
  | TestVerifierConfig;

type SubprocessConfig = {
  tool: string;
  args: string[];
  workingDir: string;
  env: Record<string, string>;
  allowNetwork: boolean;
  expectExitCode: number;
  maxOutputBytes: number;
};
```

`tool` MUST be resolved through the ToolRegistry ([[ToolRegistry-Part01]]), never executed as a raw shell string. `args` MUST be an array of separate strings and MUST NOT be shell-joined. A verifier that builds `sh -c "${tool} ${args.join(' ')}"` has created a command injection sink fed by artifact content, which is AI output. Do not do this.

`env` MUST NOT contain secrets. Deterministic verifiers do not need credentials; if yours does, it is doing network work and `allowNetwork` should be explicit.

`maxOutputBytes` MUST be set. Default `10485760` (10 MB). A build that emits a gigabyte of output to stdout will otherwise consume all memory. On overflow: truncate, set `outcome` per exit code as normal, and append a finding with code `output_truncated`.

# 03.1 Schema Verifier

Validates a structured artifact against a JSON Schema.

```ts
type SchemaVerifierConfig = {
  tool: "internal_schema_validator";
  schemaSource: { kind: "registry"; schemaId: string }
              | { kind: "inline"; schema: object }
              | { kind: "artifact"; artifactId: string };
  draft: "2020-12" | "draft-07";
  strict: boolean;
  allowAdditionalProperties: boolean;
};
```

This is the one deterministic verifier that does NOT spawn a subprocess. It runs in-process against a bundled validator. It still materializes nothing; it reads the artifact bytes directly.

## Algorithm 03-B: Schema Verification

```text
1. Parse artifact bytes as JSON (or as YAML front matter for MarkdownArtifact).
     parse error -> Verdict { outcome: "fail",
                              findings: [{ code: "malformed_json",
                                           severity: "error",
                                           line, column, message }] }
2. Resolve schemaSource.
     kind "registry": look up schemaId in the schema registry.
       not found -> Verdict { outcome: "error", findings: [unknown_schema_id] }
     kind "inline": use as-is.
     kind "artifact": resolve artifactId via ArtifactManager.
       not found -> Verdict { outcome: "error", findings: [schema_artifact_not_found] }
3. Compile the schema.
     invalid schema -> Verdict { outcome: "error", findings: [invalid_schema] }
     This is "error" not "fail": a broken schema is the graph's bug, not
     the artifact's. Do not route a broken schema to a refine loop; the
     builder cannot fix the verifier's schema and will burn all three
     attempts trying.
4. Validate. Collect every violation, not just the first.
5. Map each violation to a Finding:
     severity: "error"
     code:     the JSON Schema keyword that failed (e.g. "required", "type")
     message:  the validator message
     filePath: the artifact's declared path
     line/column: from the JSON source map if available, else omit
6. outcome = findings.filter(f => f.severity == "error").length == 0
               ? "pass" : "fail"
```

# 03.2 Lint Verifier

```ts
type LintVerifierConfig = SubprocessConfig & {
  kind: "lint";
  parser: "eslint_json" | "clippy_json" | "ruff_json" | "generic_exit_code";
  configPath?: string;
  failOnWarning: boolean;
  ignoreCodes: string[];
};
```

## Algorithm 03-C: Lint Verification

```text
1. Materialize (algorithm 03-A).
2. Run tool with args in workingDir under the scratch root.
3. On spawn failure (ENOENT, EACCES):
     -> Verdict { outcome: "error", findings: [tool_not_found] }
     Do NOT map a missing linter to "pass". A missing linter is an
     unverified artifact, and unverified means the gate stays shut.
4. Parse stdout per parser:
     "eslint_json"  -> ESLint JSON: severity 2 = error, 1 = warning
     "clippy_json"  -> cargo clippy --message-format=json
     "ruff_json"    -> ruff --output-format=json
     "generic_exit_code" -> no findings; exit code only
   parse failure -> Verdict { outcome: "error", findings: [unparseable_tool_output] }
5. Drop findings whose code is in ignoreCodes.
6. errors   = findings where severity == "error"
   warnings = findings where severity == "warning"
7. outcome:
     if errors.length > 0                      -> "fail"
     else if failOnWarning && warnings.length > 0 -> "fail"
     else                                       -> "pass"
   For parser "generic_exit_code":
     outcome = exitCode == expectExitCode ? "pass" : "fail"
8. Destroy the scratch tree.
```

# 03.3 Typecheck Verifier

```ts
type TypecheckVerifierConfig = SubprocessConfig & {
  kind: "typecheck";
  parser: "tsc_default" | "cargo_check_json" | "mypy_default" | "generic_exit_code";
  tsconfigPath?: string;
  incremental: false;
};
```

`incremental` MUST be `false` and the type pins it. An incremental typecheck reads a cache file whose contents depend on what was checked before, which makes the verifier's answer depend on history. That is non-determinism, and this verifier's verdict is marked authoritative. Pass `--noEmit` and let it be slow.

## Algorithm 03-D: Typecheck Verification

```text
1. Materialize (03-A).
2. Delete any incremental cache in the scratch tree:
     tsc:         remove *.tsbuildinfo
     cargo check: nothing to do, the scratch tree is fresh
     mypy:        remove .mypy_cache
3. Run tool with args.
4. Spawn failure -> Verdict { outcome: "error", findings: [tool_not_found] }
5. Parse per parser. Every diagnostic becomes a Finding with severity
   "error" and code set to the diagnostic id (e.g. "TS2345", "E0308").
6. outcome = exitCode == expectExitCode ? "pass" : "fail"
7. Destroy the scratch tree.
```

The findings here are the highest-value payload in the entire verifier system. `TS2345: Argument of type 'string' is not assignable to parameter of type 'number'` at `src/auth/token.ts:42:18` is precisely what a refine loop needs to fix the patch on attempt two. Populate `filePath`, `line`, and `column`. Part 06 shows how the refine loop consumes them.

# 03.4 Build Verifier

```ts
type BuildVerifierConfig = SubprocessConfig & {
  kind: "build";
  parser: "generic_exit_code" | "cargo_build_json" | "vite_default";
  artifactsOutDir?: string;
  cleanBefore: boolean;
  allowNetwork: boolean;
};
```

Build is the one deterministic verifier where `allowNetwork: true` is sometimes legitimate, because dependency resolution may need a registry. This weakens determinism and the config MUST make it explicit. When `allowNetwork` is true:

- the verifier MUST still be marked `class: "deterministic"` (its exit code is still a fact, not an opinion)
- the verifier fingerprint (Part 06) MUST include a lockfile hash, so that a changed dependency invalidates the cache
- a network failure MUST map to `outcome: "error"` with code `network_unavailable`, NOT to `outcome: "fail"`. A registry outage is not a defect in the artifact and MUST NOT drive a refine loop. The builder cannot fix npm being down.

## Algorithm 03-E: Build Verification

```text
1. Materialize (03-A).
2. If cleanBefore, remove the declared artifactsOutDir from the scratch tree.
3. If !allowNetwork, run the subprocess with network namespaces denied via
   the sandbox. See [[WorkerSandbox-Part01]].
4. Run tool with args. Enforce maxOutputBytes.
5. Classify the result:
     exitCode == expectExitCode                  -> "pass"
     spawn failure (ENOENT/EACCES)               -> "error" / tool_not_found
     network denied but attempted                -> "error" / network_denied
     network attempted and failed (DNS/timeout)  -> "error" / network_unavailable
     disk full (ENOSPC in output)                -> "error" / disk_full
     any other non-expected exit code            -> "fail"
6. Parse output into findings per parser.
7. Destroy the scratch tree, including artifactsOutDir. Build outputs are
   not artifacts. They are not merged. They do not leave the scratch tree.
```

Step 7 matters. A build verifier that leaves a `dist/` directory behind has mutated something, and Part 01 says verifiers do not mutate. If the workflow wants build output as an artifact, that is a builder node's job, not a verifier's.

# 03.5 Test Verifier

```ts
type TestVerifierConfig = SubprocessConfig & {
  kind: "test";
  parser: "jest_json" | "vitest_json" | "cargo_test_json" | "pytest_json" | "junit_xml";
  testFilter?: string;
  reportPath?: string;
  failOnNoTests: boolean;
  requireCoverage?: { minLinePct: number; reportPath: string };
  seed?: number;
};
```

## Algorithm 03-F: Test Verification

```text
1. Materialize (03-A).
2. If seed is set, inject it into env as the runner's seed variable so
   that randomized test order is reproducible. If seed is not set and the
   runner randomizes by default, set seed = 0 and pin it. A test verifier
   whose answer depends on shuffle order is not deterministic and its
   verdict is marked authoritative. Pin the seed.
3. Run tool with args plus testFilter if set.
4. Read the machine-readable report from reportPath if set, else parse
   stdout per parser.
     report missing   -> Verdict { outcome: "error", findings: [missing_test_report] }
     report unparseable -> Verdict { outcome: "error", findings: [unparseable_tool_output] }
5. Extract: totalTests, passed, failed, skipped.
6. If totalTests == 0:
     failOnNoTests  -> Verdict { outcome: "fail", findings: [no_tests_ran] }
     !failOnNoTests -> Verdict { outcome: "pass", findings: [no_tests_ran (info)] }
   Default failOnNoTests to true. A test filter typo that matches nothing
   otherwise reports a green gate on zero evidence. That is the single
   most dangerous false-pass in this system.
7. Map each failed test to a Finding:
     severity: "error"
     code:     "test_failed"
     message:  the assertion message
     filePath: the test file
     line:     the failing assertion line
     excerpt:  the first 2000 chars of the failure output
8. If requireCoverage is set:
     read the coverage report.
       missing -> Verdict { outcome: "error", findings: [missing_coverage_report] }
     if linePct < minLinePct:
       append Finding { severity: "error", code: "coverage_below_threshold" }
9. outcome:
     failed > 0                              -> "fail"
     coverage below threshold                -> "fail"
     else                                    -> "pass"
10. Destroy the scratch tree.
```

Note that a flaky test produces a non-deterministic verdict and therefore poisons the verdict cache. The mitigation is not a retry loop inside the verifier; retrying until green is exactly how a flaky test becomes a merged bug. The mitigation is `seed` pinning plus surfacing flakiness as a first-class finding. If a test verifier's cached verdict disagrees with a fresh run on identical content hash and fingerprint, the engine MUST emit `workflow.verifier.nondeterminism_detected` at severity `warning` and MUST invalidate that cache entry. Part 06 covers the detector.

# Exit Code Mapping Summary

```text
                          outcome
condition                 -------
exitCode == expected      pass
exitCode != expected      fail
tool not found            error   (never pass, never fail)
timeout elapsed           timeout
network denied/down       error
disk full                 error
output unparseable        error
patch does not apply      fail
path boundary violation   error   (+ critical event)
schema itself invalid     error
zero tests, failOnNoTests fail
```

The rule underneath this table: **"fail" means the artifact is defective. "error" means we could not find out.** Both keep a hard gate shut. Only "fail" is worth sending to a refine loop, because only "fail" is something a builder can act on. Part 06 encodes this in the routing algorithm.

# Related Documents

- [[VerifierNodes-Part01]]
- [[VerifierNodes-Part02]]
- [[VerifierNodes-Part04]]
- [[VerifierNodes-Part05]]
- [[VerifierNodes-Part06]]
- [[VerifierNodes-Diagrams]]
- [[Verification-Part01]]
- [[TestArtifacts-Part01]]
- [[PatchArtifacts-Part01]]
- [[WorkspaceManager-Part01]]
- [[WorkerSandbox-Part01]]
- [[ToolRegistry-Part01]]
