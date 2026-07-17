---
title: WorkerPermissions Specification - Part 03
status: draft
version: 1.0
tags:
  - worker-system
  - worker-permissions
  - tools
related:
  - "[[ToolRegistry-Part01]]"
  - "[[WorkerSandbox-Part01]]"
---

# WorkerPermissions Specification (Part 03)

## Document Index

Part 01 - Purpose, Permission Profiles, and Modes
Part 02 - Grants, Inheritance, and Child Workers
Part 03 - Tool, Terminal, Filesystem, and Network Permissions
Part 04 - YOLO Mode, Approval Gates, and Revocation
Part 05 - Events, UI, and Implementation Checklist

# Tool Permissions

Workers may invoke Tools only through ToolRegistry.

Tool permissions should specify:

- tool id
- allowed actions
- input constraints
- output handling
- risk level

# Terminal Permissions

Terminal permissions should control:

- spawn
- read
- input
- kill
- attach
- detach

The most sensitive permission is terminal input.

# Filesystem Permissions

Filesystem permissions should be path-scoped.

Workers should prefer patch artifacts over direct writes.

# Network Permissions

Network permissions should support:

- domain allowlists
- upload restrictions
- payload limits
- tool-specific network access

# AI Notes

A terminal is not just a UI surface. It is a capability amplifier.

Treat terminal input as high-risk.

# Related Documents

- [[WorkerPermissions-Part04]]
- [[ToolRegistry-Part01]]
- [[Permission-Part05]]

