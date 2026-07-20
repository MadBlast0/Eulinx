export const SCHEMA_VERSION = 1

export interface AppMetaRow {
  id: number
  app_version: string
  install_id: string
  created_at: string
}

export interface WorkspaceRow {
  id: string
  name: string
  path: string
  workspace_format_version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ProjectRow {
  id: string
  workspace_id: string
  name: string
  root_path: string | null
  git_remote: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface UserRow {
  id: string
  display_name: string
  created_at: string
  updated_at: string
}

export interface WorkerRow {
  id: string
  workspace_id: string
  project_id: string | null
  parent_worker_id: string | null
  name: string
  kind: 'orchestrator' | 'builder' | 'verifier' | 'scout' | 'generic'
  model_profile: string
  status: 'created' | 'initializing' | 'idle' | 'planning' | 'working' | 'waiting' | 'reviewing' | 'testing' | 'blocked' | 'needs_human' | 'completed' | 'archived' | 'destroyed'
  terminal_handle: string | null
  permission_set_id: string | null
  current_task_id: string | null
  spawned_worker_ids: string
  token_usage: number
  cost_micro_usd: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface WorkerChannelRow {
  id: string
  workspace_id: string
  name: string
  kind: 'global' | 'partitioned'
  member_worker_ids: string
  created_at: string
}

export interface SessionRow {
  id: string
  workspace_id: string
  project_id: string | null
  owner_worker_id: string | null
  owner_user_id: string | null
  kind: 'user' | 'worker' | 'orchestrator'
  model_profile: string | null
  title: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface TaskRow {
  id: string
  workspace_id: string
  project_id: string | null
  owner_worker_id: string | null
  parent_task_id: string | null
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'backlog' | 'queued' | 'in_progress' | 'blocked' | 'completed' | 'cancelled' | 'failed'
  deadline: string | null
  dependencies: string
  assigned_worker_id: string | null
  artifact_ids: string
  verification_status: 'pending' | 'verified' | 'failed' | 'unverified'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ExecutionRow {
  id: string
  workspace_id: string
  worker_id: string
  task_id: string | null
  session_id: string | null
  kind: 'tool' | 'model_call' | 'command' | 'mcp_tool'
  adapter: string
  status: 'started' | 'succeeded' | 'failed' | 'cancelled'
  input_ref: string | null
  output_ref: string | null
  error_ref: string | null
  started_at: string
  finished_at: string | null
  token_usage: number
  cost_micro_usd: number
  created_at: string
}

export interface WorkflowRow {
  id: string
  workspace_id: string
  project_id: string | null
  name: string
  description: string | null
  status: 'draft' | 'active' | 'archived'
  graph_version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface NodeRow {
  id: string
  workflow_id: string
  kind: 'worker' | 'orchestrator' | 'tool' | 'builder' | 'verifier' | 'condition' | 'loop' | 'merge' | 'artifact' | 'memory' | 'mcp' | 'input' | 'output' | 'delay' | 'human_approval' | 'plugin'
  label: string
  config: string
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
}

export interface EdgeRow {
  id: string
  workflow_id: string
  source_node_id: string
  target_node_id: string
  kind: 'control' | 'data' | 'artifact' | 'dependency' | 'communication'
  label: string | null
  created_at: string
}

export interface RunRow {
  id: string
  workspace_id: string
  workflow_id: string
  status: 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  current_tick: number
  engine_version: string
  run_context_ref: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export interface RunStepRow {
  id: string
  run_id: string
  node_id: string
  status: 'pending' | 'ready' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled'
  attempt: number
  input_ref: string | null
  output_ref: string | null
  error_ref: string | null
  started_at: string | null
  finished_at: string | null
  updated_at: string
}

export interface RunContextRow {
  id: string
  run_id: string
  payload: string
  created_at: string
  updated_at: string
}

export interface ArtifactRow {
  id: string
  workspace_id: string
  project_id: string | null
  producer_worker_id: string | null
  producer_task_id: string | null
  kind: 'markdown' | 'code' | 'json' | 'prompt' | 'test' | 'screenshot' | 'diagram' | 'plan' | 'commit' | 'patch' | 'sql' | 'image' | 'binary'
  name: string
  storage_ref: string
  byte_size: number
  mime_type: string | null
  hash_sha256: string
  verification_status: 'unverified' | 'pending' | 'verified' | 'failed'
  current_version_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PromptRow {
  id: string
  workspace_id: string
  name: string
  description: string | null
  current_version_id: string | null
  tags: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PromptVersionRow {
  id: string
  prompt_id: string
  version: number
  content: string
  variables: string
  parent_version_id: string | null
  created_by: string
  created_at: string
}

export interface ChatRow {
  id: string
  workspace_id: string
  project_id: string | null
  session_id: string | null
  title: string | null
  kind: 'user' | 'agent' | 'channel'
  channel_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MessageRow {
  id: string
  chat_id: string
  sender_kind: 'user' | 'worker' | 'system' | 'tool'
  sender_worker_id: string | null
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  content_kind: 'text' | 'markdown' | 'code' | 'json' | 'artifact_ref' | 'tool_result'
  artifact_ref: string | null
  channel_id: string | null
  token_count: number | null
  created_at: string
}

export interface MemoryEntryRow {
  id: string
  workspace_id: string
  scope: 'global' | 'workspace' | 'project' | 'worker' | 'task' | 'session'
  scope_id: string | null
  kind: 'working' | 'conversation' | 'project' | 'knowledge' | 'vector' | 'temporary' | 'long_term' | 'worker' | 'workspace'
  content: string
  importance: number
  source_ref: string | null
  is_redacted: number
  created_at: string
  updated_at: string
  expires_at: string | null
  deleted_at: string | null
}

export interface SettingsRow {
  id: string
  workspace_id: string | null
  key: string
  value: string
  updated_at: string
}

export interface LogEntryRow {
  id: string
  workspace_id: string | null
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error'
  source: string
  message: string
  metadata: string | null
  created_at: string
}

export interface PluginRow {
  id: string
  workspace_id: string | null
  name: string
  kind: 'node' | 'provider' | 'tool' | 'panel'
  version: string
  enabled: number
  entry_point: string
  manifest_ref: string
  installed_at: string
  updated_at: string
}

export interface PluginNodeRow {
  id: string
  plugin_id: string
  node_kind: string
  config_schema: string
  created_at: string
}

export interface PluginToolRow {
  id: string
  plugin_id: string
  tool_name: string
  capability: string
  permission_required: string | null
  created_at: string
}

export interface LockRecordRow {
  id: string
  workspace_id: string
  resource: string
  holder_id: string
  holder_kind: string
  lock_kind: string
  mode: 'shared' | 'exclusive'
  acquired_at: string
  expires_at: string | null
  released_at: string | null
}

export interface MergeRecordRow {
  id: string
  workspace_id: string
  artifact_ids: string
  target_paths: string
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'failed' | 'rolled_back'
  requested_by: string
  approved_by: string | null
  applied_at: string | null
  created_at: string
  updated_at: string
}

export type TableRow =
  | AppMetaRow
  | WorkspaceRow
  | ProjectRow
  | UserRow
  | WorkerRow
  | WorkerChannelRow
  | SessionRow
  | TaskRow
  | ExecutionRow
  | WorkflowRow
  | NodeRow
  | EdgeRow
  | RunRow
  | RunStepRow
  | RunContextRow
  | ArtifactRow
  | PromptRow
  | PromptVersionRow
  | ChatRow
  | MessageRow
  | MemoryEntryRow
  | SettingsRow
  | LogEntryRow
  | PluginRow
  | PluginNodeRow
  | PluginToolRow
  | LockRecordRow
  | MergeRecordRow
