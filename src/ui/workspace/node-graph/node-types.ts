/**
 * Official Eulinx node kinds — aligned with Docs/06-workflow-engine/NodeTypes.
 *
 * Categories:
 *   DOERS:          input, output, worker, orchestrator, builder, tool, mcp
 *   CONTROL/QUALITY: verifier, condition, loop, merge
 *   IO/EXTERNAL:    artifact, memory
 *   TIMING/GATE:    delay, human_approval
 *
 * Legacy UI-only kinds (terminal, browser, map, etc.) are kept for backward
 * compatibility but are not part of the workflow engine spec.
 */
export type EulinxNodeKind =
  // ── Official workflow engine kinds ──
  | "input"
  | "output"
  | "worker"
  | "orchestrator"
  | "builder"
  | "verifier"
  | "condition"
  | "loop"
  | "merge"
  | "artifact"
  | "memory"
  | "tool"
  | "mcp"
  | "delay"
  | "human_approval"
  | "switch"
  | "filter"
  | "set"
  | "code"
  | "threshold"
  | "webhook_trigger"
  | "schedule_trigger"
  | "http_request"
  // ── Legacy / UI-only kinds ──
  | "terminal"
  | "browser"
  | "map"
  | "agent"
  | "session"
  | "prompt"
  | "router"
  | "file"
  | "event"
  | "metric"
  | "log"
  | "note"
  | "unknown"

export interface NodeTypeMeta {
  readonly label: string
  readonly iconName: string
  readonly accentVar: string
}

const TERMINAL = "var(--Eulinx-color-node-terminal)"
const BROWSER = "var(--Eulinx-color-node-browser)"
const MAP = "var(--Eulinx-color-node-map)"
const WORKER = "var(--Eulinx-color-node-worker)"

// ── Official kind accent colors ──
const INPUT = "var(--Eulinx-color-node-input)"
const OUTPUT = "var(--Eulinx-color-node-output)"
const ORCHESTRATOR = "var(--Eulinx-color-node-orchestrator)"
const BUILDER = "var(--Eulinx-color-node-builder)"
const VERIFIER = "var(--Eulinx-color-node-verifier)"
const CONDITION = "var(--Eulinx-color-node-condition)"
const LOOP = "var(--Eulinx-color-node-loop)"
const ARTIFACT = "var(--Eulinx-color-node-artifact)"
const MCP = "var(--Eulinx-color-node-mcp)"
const DELAY = "var(--Eulinx-color-node-delay)"
const HUMAN = "var(--Eulinx-color-node-human)"

// ── n8n-inspired kind accent colors ──
const SWITCH = "var(--Eulinx-color-node-switch)"
const FILTER = "var(--Eulinx-color-node-filter)"
const SET = "var(--Eulinx-color-node-set)"
const CODE = "var(--Eulinx-color-node-code)"

export const NODE_TYPE_META: Record<EulinxNodeKind, NodeTypeMeta> = {
  // ── Official workflow engine kinds ──
  input:          { label: "Input",          iconName: "run",         accentVar: INPUT },
  output:         { label: "Output",         iconName: "panel",       accentVar: OUTPUT },
  worker:         { label: "Worker",         iconName: "aiAgent",     accentVar: WORKER },
  orchestrator:   { label: "Orchestrator",   iconName: "scheduler",   accentVar: ORCHESTRATOR },
  builder:        { label: "Builder",        iconName: "graph",       accentVar: BUILDER },
  verifier:       { label: "Verifier",       iconName: "conditions",  accentVar: VERIFIER },
  condition:      { label: "Condition",      iconName: "route",       accentVar: CONDITION },
  loop:           { label: "Loop",           iconName: "loops",       accentVar: LOOP },
  merge:          { label: "Merge",          iconName: "merge",       accentVar: MAP },
  artifact:       { label: "Artifact",       iconName: "artifacts",   accentVar: ARTIFACT },
  memory:         { label: "Memory",         iconName: "memory",      accentVar: MAP },
  tool:           { label: "Tool",           iconName: "tool",        accentVar: TERMINAL },
  mcp:            { label: "MCP",            iconName: "cloud",       accentVar: MCP },
  delay:          { label: "Delay",          iconName: "scheduler",   accentVar: DELAY },
  human_approval: { label: "Human Approval", iconName: "aiAgent",     accentVar: HUMAN },
  // ── n8n-inspired kinds ──
  switch:          { label: "Switch",        iconName: "split",       accentVar: SWITCH },
  filter:          { label: "Filter",        iconName: "conditions",  accentVar: FILTER },
  set:             { label: "Set",           iconName: "variables",   accentVar: SET },
  code:            { label: "Code",          iconName: "terminal",    accentVar: CODE },
  threshold:       { label: "Threshold",     iconName: "diagnostics", accentVar: CONDITION },
  webhook_trigger: { label: "Webhook",       iconName: "api",         accentVar: INPUT },
  schedule_trigger:{ label: "Schedule",      iconName: "scheduler",   accentVar: INPUT },
  http_request:    { label: "HTTP Request",  iconName: "cloud",       accentVar: MCP },
  // ── Legacy / UI-only kinds ──
  terminal:       { label: "Terminal",       iconName: "terminal",    accentVar: TERMINAL },
  browser:        { label: "Browser",        iconName: "api",         accentVar: BROWSER },
  map:            { label: "Map",            iconName: "map",         accentVar: MAP },
  agent:          { label: "Agent",          iconName: "aiAgent",     accentVar: WORKER },
  session:        { label: "Session",        iconName: "network",     accentVar: TERMINAL },
  prompt:         { label: "Prompt",         iconName: "prompt",      accentVar: WORKER },
  router:         { label: "Router",         iconName: "split",       accentVar: BROWSER },
  file:           { label: "File",           iconName: "file",        accentVar: TERMINAL },
  event:          { label: "Event",          iconName: "event",       accentVar: MAP },
  metric:         { label: "Metric",         iconName: "diagnostics", accentVar: BROWSER },
  log:            { label: "Log",            iconName: "logs",        accentVar: TERMINAL },
  note:           { label: "Note",           iconName: "note",        accentVar: MAP },
  unknown:        { label: "Node",           iconName: "variables",   accentVar: TERMINAL },
}

export function getNodeTypeMeta(kind: EulinxNodeKind): NodeTypeMeta {
  return NODE_TYPE_META[kind] ?? NODE_TYPE_META.unknown
}

/** Whether the kind is an official workflow engine node (not legacy UI-only). */
export function isWorkflowKind(kind: EulinxNodeKind): boolean {
  switch (kind) {
    case "input":
    case "output":
    case "worker":
    case "orchestrator":
    case "builder":
    case "verifier":
    case "condition":
    case "loop":
    case "merge":
    case "artifact":
    case "memory":
    case "tool":
    case "mcp":
    case "delay":
    case "human_approval":
    case "switch":
    case "filter":
    case "set":
    case "code":
    case "threshold":
    case "webhook_trigger":
    case "schedule_trigger":
    case "http_request":
      return true
    default:
      return false
  }
}
