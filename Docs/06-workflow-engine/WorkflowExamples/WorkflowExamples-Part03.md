---
title: WorkflowExamples Specification - Part 03
status: draft
version: 1.0
tags:
  - workflow-engine
  - workflow-examples
  - refine-loop
related:
  - "[[06-workflow-engine/README]]"
  - [[WorkflowExamples-Part01]]
  - [[WorkflowExamples-Part02]]
  - [[LoopNodes-Part01]]
  - [[WorkflowExamples-Diagrams]]
---

# WorkflowExamples Specification (Part 03)

## Document Index

Part 01 - Entry point, object model, and Example 1: Fix a failing test
Part 02 - Example 2: Add a feature across N files (parallel fan-out and join)
Part 03 - Example 3: Refactor with a bounded refine loop
Part 04 - Example 4: Dynamic expansion (runtime graph extension)
WorkflowExamples-Diagrams - Four representations per example, six sets total

# Purpose

Part 03 presents Example 3: a refactor driven by a bounded refine loop that pairs a Builder with a Verifier and repeats until the Verifier passes or the iteration ceiling is hit.

This example exercises [[LoopNodes-Part01]] (refine kind), [[BuilderNodes-Part01]], and [[VerifierNodes-Part01]] together, and demonstrates the "Builder proposes, Verifier checks, loop refines" pattern that is the heart of Eulinx's safe automation. It also shows the no-write rule in action: the project is never touched until a Merge applies the final verified artifact.

# The Graph

The graph is:

```text
Input(goal: "extract the parser into its own module")
  -> Loop(refine, maxIterations 5, done = verifier.passed)
       body: Builder(refactor spec) -> Verifier(typecheck + ai-judge)
  -> Condition(passed?)
       true  -> Merge(apply refactor)
       false -> Output(report: refine failed, last diff attached)
  -> Output(result)
```

# Node Configurations (real values)

- `Input.goal`: text `"Refactor src/parse.ts: split the tokenizer and the AST builder into src/tokenizer.ts and src/ast.ts, keeping public API stable."`
- `Loop`: `loopKind=refine`, `maxIterations=5`, `termination=verifier.verdict.passed`, `parallel=false`.
- `Builder` (inside body): `workerId=refactor-worker`, `promptTemplate="Refactor per spec: {{spec}}. Previous critique: {{critique}}."`, `artifactKind=source-diff`, `permissionProfileId=read-only`.
- `Verifier` (inside body): `verifierKind=deterministic`, `checks=[typecheck, build]`, plus a second `verifierKind=ai` `aiVerdictAuthoritative=false` judge on readability; gate uses the deterministic `passed`.
- `Condition`: `expression=verifier.passed`, branches `true`/`false`.
- `Merge`: `joinSet=[verifier.verdict]`, `strategy=wait-first`, applies the `artifactRef` under a write permission profile after the deterministic gate passed.
- `Output`: publishes the applied result or, on failure, the last `artifactRef` and the critique as a report.

# The Run Trace

- Iteration 0: Builder reads the project read-only, emits a diff `artifactRef=hashA`. Verifier typecheck fails (a broken import). Verdict `passed=false`. Condition routes to loop continue.
- Iteration 1: Builder refines using the critique, emits `hashB`. Verifier typecheck still fails on a different import. `passed=false`.
- Iteration 2: Builder emits `hashC`. Verifier typecheck passes; ai-judge scores 0.8 (advisory). Deterministic gate `passed=true`. Loop `break`.
- Loop emits `hashC`; Condition `true`; Merge applies `hashC` to the project under permission. Output publishes success.
- If all five iterations failed, the ceiling is hit, loop `failed` with `iteration_limit_exceeded`, Condition `false`, Output reports the last diff for human review. The project is unchanged either way until the Merge.

# Why This Example Matters

It shows the safety boundary concretely: five Builders ran, none wrote the project; only the one verified diff reached the Merge. It shows termination (the ceiling); it shows advisory AI verdicts not blocking a deterministic gate; and it shows that failure is a report, not a crash.

# AI Notes

Do not let the Builder write the project because "it is a refactor". Refactors are exactly the risky change that needs verification. The no-write rule ([[BuilderNodes-Part04]]) applies doubly here.

Do not set `aiVerdictAuthoritative=true` on a refactor merge. The deterministic typecheck is the gate; the AI judge informs the human, not the merge.

Do not remove `maxIterations` to "let it keep trying". The ceiling is what guarantees the run ends. Five attempts is a deliberate budget ([[DynamicGraphs-Part05]] spirit applies to loops too).

# Related Documents

- [[06-workflow-engine/README]]
- [[WorkflowExamples-Part01]]
- [[WorkflowExamples-Part02]]
- [[WorkflowExamples-Part04]]
- [[WorkflowExamples-Diagrams]]
- [[LoopNodes-Part01]]
- [[BuilderNodes-Part01]]
- [[VerifierNodes-Part01]]
- [[MergeManager-Part01]]
