export enum PluginState {
  Discovered = 'discovered',
  Validating = 'validating',
  Validated = 'validated',
  Consent = 'consent',
  Installing = 'installing',
  Installed = 'installed',
  Activating = 'activating',
  Activated = 'activated',
  Deactivating = 'deactivating',
  Disabled = 'disabled',
  Error = 'error',
  Uninstalled = 'uninstalled',
}

export type PluginCapability =
  | 'fs.read'
  | 'fs.write'
  | 'net.http'
  | 'net.ws'
  | 'ui.notify'
  | 'ui.panel'
  | 'storage.kv'
  | 'hook.register'
  | 'tool.invoke'
  | 'process.spawn'
  | 'process.self_terminate'
  | 'db.query'
  | 'event.emit'

export type HookType = 'observe' | 'participate'

export interface DeclaredPermission {
  capability: PluginCapability
  scope: string
  reason: string
}

export interface PermissionRequirement {
  capability: PluginCapability
  scope: string
  granted: boolean
}

export interface ToolContribution {
  name: string
  description: string
  schema: Record<string, unknown>
  permissionRequired: string | null
}

export interface NodeContribution {
  nodeKind: string
  label: string
  configSchema: Record<string, unknown>
  inputPorts: Record<string, unknown>
  outputPorts: Record<string, unknown>
}

export interface HookContribution {
  hookName: string
  hookType: HookType
  timeoutMs: number
}

export interface SettingsContribution {
  namespace: string
  schema: Record<string, unknown>
  group: string
  uiHints: Record<string, unknown> | null
}

export interface PanelContribution {
  panelId: string
  title: string
  dock: 'left' | 'right' | 'bottom' | 'floating'
  icon: string | null
  minSize: Record<string, number> | null
}

export interface PluginContributes {
  tools: ToolContribution[]
  nodes: NodeContribution[]
  hooks: HookContribution[]
  settings: SettingsContribution[]
  panels: PanelContribution[]
}

export interface PluginManifest {
  schema: string
  id: string
  name: string
  version: string
  engines: string
  author: string
  summary: string
  description: string | null
  icon: string | null
  homepage: string | null
  capabilities: DeclaredPermission[]
  contributes: PluginContributes
  sdkVersion: string
  main: string
  signature: string | null
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface PluginInstance {
  manifest: PluginManifest
  state: PluginState
  grantRecord: PermissionRequirement[]
  failureCount: number
  lastFailure: string | null
  installedAt: string
  updatedAt: string
}

export interface ToolDescriptor {
  id: string
  name: string
  description: string
  schema: Record<string, unknown>
  handler: (args: Record<string, unknown>) => Promise<unknown>
  pluginId: string
}

export interface HookRegistration {
  hookName: string
  hookType: HookType
  handler: (context: Record<string, unknown>) => Promise<unknown>
  pluginId: string
  timeoutMs: number
}

export type EventHandler = (event: unknown) => void
export type UnsubscribeFn = () => void
