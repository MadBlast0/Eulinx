---
title: Snapshots - Part 01
status: draft
version: 1.0
tags: [memory, snapshots]
related:
  - "[[MergeManager-Part06]]"
---

# Snapshots - Part 01

## Document Index

Part 01 - Purpose, Snapshot Types, and Contents
Part 02 - Creation, Restore, and Safety
Part 03 - Implementation Checklist and Future Expansion

# Purpose

Snapshots preserve state at a point in time.

Snapshots help Eulinx recover from failed merges, bad Worker runs, and user experiments.

# Snapshot Types

```text
workspace_snapshot
project_files_snapshot
workflow_snapshot
memory_snapshot
pre_merge_snapshot
session_snapshot
```

# Contents

Snapshots may include:

- file checksums
- selected file contents
- workflow graph state
- memory references
- artifact references
- permission state

