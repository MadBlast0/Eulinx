---
title: Browser Specification - Part 03
status: draft
version: 1.0
tags:
  - features
  - browser
related:
  - "[[Browser-Part02]]"
  - "[[PermissionManager-Part01]]"
---

# Browser Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and the Browser Capability
Part 02 - The Browser Node and Output Contract
Part 03 - Permissions, Scope, and Safety

# Permissions

Browser actions are tiered by risk:

- read / navigate: granted by the base browser capability
- form submit / post: requires an explicit, scoped grant
- download to workspace: produces an Artifact, gated like any file write
- authenticated session reuse: requires explicit user consent and is never silent

Every browser action routes through the PermissionManager exactly like filesystem or git actions.

# Scope and Safety

A browser node MUST NOT exfiltrate workspace secrets into forms without consent. The capability is sandboxed: it cannot read arbitrary local files unless granted. Downloads land as Artifacts and go through the MergeManager if they are to enter the workspace tree.

# Privacy

When fully local, browser traffic goes only to the destinations the user or agent navigates to; Eulinx does not proxy or log browsing content beyond what the agent needs. Cloud sync, if enabled, does not include browse payloads by default.

# AI Notes

Do not let a browser node post or submit forms without an explicit grant.

Do not return raw HTML as the primary output; extract structured fields per the contract.

Do not let the browser capability read local files unless explicitly granted; treat it as untrusted like any external tool.

# Related Documents

- [[PermissionManager-Part01]]
