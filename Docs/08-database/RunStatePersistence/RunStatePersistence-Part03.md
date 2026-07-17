---
title: RunStatePersistence Specification - Part 03
status: draft
version: 1.0
tags:
  - database
  - run-state
  - run-context
related:
  - "[[08-database/README]]"
  - "[[RunStatePersistence-Part01]]"
  - "[[SQLiteSchema-Part03]]"
---

# RunStatePersistence Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Run-State Model, and the Crash-Recovery Contract
Part 02 - The Persist Algorithm, Tick Coupling, and Resume
Part 03 - Run Context, Large Payloads, and the Port-Value Contract
Part 04 - Concurrency, Checkpointing, Checklist, and Worked Examples

# Run Context

`run_context` is the data carried along data edges between nodes. It is what lets a completed Builder step's output become a ready Verifier step's input without re-running the Builder. The context is a map from port identifier to port value, plus metadata about which step produced each value.

The context is stored separately from `run` (see [[SQLiteSchema-Part03]]) so that large payloads do not bloat the run row and so a context read can be skipped when only run status is needed. The `run.run_context_ref` points at the `run_context` row.

# The Port-Value Contract

Each port value in the context records:

- the `port_id` (typed port name defined by the node contract in [[NodeArchitecture-Part01]])
- the producing `run_step` id (so a value can be traced to its source for replay and debugging)
- the value, which is either inline (small) or a reference to an `artifact` (large)
- a `produced_at` tick, so ordering of values on the same port is deterministic

The contract rule: a ready node consumes only port values whose producing step is `succeeded`. A value from a `failed` or `skipped` step is never injected, which preserves the determinism [[WorkflowEngine-Part01]] requires.

# Large Payloads

A port value that exceeds a size threshold (e.g. a generated file, a large markdown plan) is NOT stored inline in `run_context`. Instead:

- the value is written as an `artifact` (see [[SQLiteSchema-Part04]]) in the artifact store,
- the `run_context` entry holds an `artifact_ref` plus a short summary,
- the consuming step reads the artifact on demand.

This keeps `run_context` small and the resume read fast, while still making the value durable and replayable. The artifact itself is versioned and history-tracked.

# Invariants

```text
run_context holds port values keyed by port_id with a producing step id.
Only succeeded steps' values are injected into ready nodes.
Large values are artifact_refs, not inline blobs.
run_context is 1:1 with run and read in the same resume call.
produced_at tick orders multiple values on the same port deterministically.
```

# AI Notes

Do not inline a generated source file into `run_context`. It bloats the row, slows every resume, and duplicates the artifact store. Write an `artifact` and store the ref.

Do not inject a value from a `failed` step into a ready node. It breaks determinism and lets a Verifier "verify" output that was never produced. The port-value contract filters by producing-step status; honor it.

Do not let `run_context` become the only copy of a value. The artifact store is authoritative for large values; `run_context` is a pointer plus a summary. If the artifact is pruned, the context entry must be marked stale, not silently wrong.

# Related Documents

- [[08-database/README]]
- [[RunStatePersistence-Part02]]
- [[RunStatePersistence-Part04]]
- [[RunStatePersistence-Diagrams]]
- [[SQLiteSchema-Part03]]
- [[SQLiteSchema-Part04]]
- [[NodeArchitecture-Part01]]
- [[WorkflowEngine-Part01]]
