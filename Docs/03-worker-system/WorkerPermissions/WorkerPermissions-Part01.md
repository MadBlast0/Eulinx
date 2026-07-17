---
title: WorkerPermissions Specification - Part 01
status: draft
version: 1.0
tags:
  - worker-system
  - worker-permissions
  - permissions
related:
  - "[[Permission-Part01]]"
  - "[[PermissionManager-Part01]]"
  - "[[WorkerCreation-Part01]]"
---

# WorkerPermissions Specification (Part 01)

## Document Index

Part 01 - Purpose, Permission Profiles, and Modes
Part 02 - Grants, Inheritance, and Child Workers
Part 03 - Tool, Terminal, Filesystem, and Network Permissions
Part 04 - YOLO Mode, Approval Gates, and Revocation
Part 05 - Events, UI, and Implementation Checklist

# Purpose

WorkerPermissions defines what a Worker is allowed to do.

Workers are powerful because they can run AI CLIs, terminals, tools, and workflows. Therefore Workers must be treated as temporary processes with scoped capabilities, not trusted humans.

# Core Rule

```text
Workers request actions.
Runtime authorizes actions.
```

Workers MUST NOT grant themselves permissions.

# Permission Profiles

Recommended profiles:

```text
restricted
standard
trusted
yolo_sandbox
custom
```

# Restricted

For reviewers, planners, critics, and summarizers.

Usually allows:

- read assigned context
- create artifacts
- write memory summary

# Standard

For normal Worker tasks.

Usually allows:

- read scoped project files
- use owned terminal
- create patch artifacts
- invoke approved tools

# Trusted

For high-confidence tasks with broader scope.

Still requires safety gates for destructive actions.

# YOLO Sandbox

Allows faster work inside a sandbox, while still enforcing hard denials.

# AI Notes

Worker permissions should be task-shaped, not personality-shaped.

Do not give a Worker broad access just because it has a role name like "builder."

# Related Documents

- [[WorkerPermissions-Part02]]
- [[Permission-Part01]]
- [[PermissionManager-Part01]]

