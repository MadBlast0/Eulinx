---
title: Browser Diagrams
status: draft
version: 1.0
tags:
  - features
  - browser
  - diagrams
related:
  - "[[Browser-Part01]]"
---

# Browser Diagrams

```mermaid
flowchart LR
  AI["AI Node"] --> B["Browser Node"]
  B --> MCP["Browser MCP / Native"]
  MCP --> OUT["Structured Output"]
  OUT --> ACT["Action Node"]
  B -.-> PANEL["Browser Panel (observe)"]
```

```text
agent -> browser node -> mcp/native -> structured output -> downstream
```

# Related Documents

- [[Browser-Part01]]
