/**
 * WelcomeScreen — shown when no project is open.
 *
 * Replaces the old stat-card Dashboard. Provides:
 * Recent Projects, Open Folder, Create Project, Import Project,
 * Templates, Documentation, Shortcuts.
 *
 * Clean, professional, no unnecessary cards or whitespace.
 */

import { type ReactNode } from "react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"

export interface WelcomeScreenProps {
  /** Called when user wants to open a folder. */
  readonly onOpenFolder?: () => void
  /** Called when user wants to create a new project. */
  readonly onCreateProject?: () => void
  /** Called when user wants to import a project. */
  readonly onImportProject?: () => void
  /** Called when user selects a recent project. */
  readonly onOpenRecent?: (projectId: string) => void
}

const RECENT_PROJECTS = [
  { id: "proj-1", name: "Eulinx Core", path: "~/Projects/eulinx-core", modified: "2 hours ago" },
  { id: "proj-2", name: "API Gateway", path: "~/Projects/api-gateway", modified: "Yesterday" },
  { id: "proj-3", name: "ML Pipeline", path: "~/Projects/ml-pipeline", modified: "3 days ago" },
]

const TEMPLATES = [
  { id: "tpl-empty", name: "Empty Project", description: "Start from scratch" },
  { id: "tpl-agent", name: "Agent Workflow", description: "Multi-agent orchestration" },
  { id: "tpl-pipeline", name: "Data Pipeline", description: "ETL with AI workers" },
]

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], label: "Command Palette" },
  { keys: ["Ctrl", "N"], label: "New Tab" },
  { keys: ["Ctrl", "Shift", "P"], label: "Run Workflow" },
  { keys: ["Ctrl", "B"], label: "Toggle Sidebar" },
  { keys: ["Ctrl", "`"], label: "Toggle Panel" },
  { keys: ["Ctrl", "Shift", "I"], label: "Toggle Inspector" },
]

export function WelcomeScreen({
  onOpenFolder,
  onCreateProject,
  onImportProject,
  onOpenRecent,
}: WelcomeScreenProps): ReactNode {
  return (
    <div
      className="flex h-full flex-col overflow-y-auto"
      style={{ background: token("--Eulinx-color-background") }}
    >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-10 py-12">
          {/* Header */}
          <div className="flex flex-col gap-6 border-b pb-8" style={{ borderColor: token("--Eulinx-color-border") }}>
            <div className="flex flex-col gap-2">
              <h1
                className="text-2xl font-semibold"
                style={{ color: token("--Eulinx-color-text") }}
              >
                Eulinx
              </h1>
              <p
                className="max-w-xl text-sm leading-6"
                style={{ color: token("--Eulinx-color-text-secondary") }}
              >
                Open a workspace, create a project, or start from a workflow template.
              </p>
              <p
                className="max-w-2xl text-xs leading-5"
                style={{ color: token("--Eulinx-color-text-muted") }}
              >
                Eulinx is a workspace for getting real work done with AI. You describe a
                goal in plain language, and Eulinx starts AI helpers — called{" "}
                <strong style={{ color: token("--Eulinx-color-text-secondary") }}>workers</strong> — that
                carry out the steps in real terminal sessions. You review the results and
                decide what to keep.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <QuickAction
                icon="action.open"
                label="Open Folder"
                onClick={onOpenFolder}
                primary
              />
              <QuickAction
                icon="action.add"
                label="New Project"
                onClick={onCreateProject}
              />
              <QuickAction
                icon="action.import"
                label="Import"
                onClick={onImportProject}
              />
            </div>
          </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          {/* Recent Projects */}
          <Section title="Example Projects" hint="These are sample entries to help you get started.">
            {RECENT_PROJECTS.length === 0 ? (
              <EmptyState message="No recent projects" />
            ) : (
              <div className="flex flex-col overflow-hidden rounded-md border" style={{ borderColor: token("--Eulinx-color-border") }}>
                {RECENT_PROJECTS.map((proj) => (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => onOpenRecent?.(proj.id)}
                    className="flex items-center gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[color:var(--Eulinx-color-hover)]"
                    style={{ borderColor: token("--Eulinx-color-border") }}
                  >
                    <span style={{ color: token("--Eulinx-color-text-muted"), flexShrink: 0 }}>
                      <Icon
                        name="domain.folder"
                        size="sm"
                        aria-hidden
                      />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span
                        className="truncate text-sm"
                        style={{ color: token("--Eulinx-color-text") }}
                      >
                        {proj.name}
                      </span>
                      <span
                        className="truncate text-xs"
                        style={{ color: token("--Eulinx-color-text-muted") }}
                      >
                        {proj.path}
                      </span>
                    </div>
                    <span
                      className="flex-shrink-0 text-xs"
                      style={{ color: token("--Eulinx-color-text-muted") }}
                    >
                      {proj.modified}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* Templates */}
          <Section title="Templates">
            <div className="flex flex-col gap-0.5">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={onCreateProject}
                  className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors hover:bg-[color:var(--Eulinx-color-hover)]"
                  style={{ borderColor: token("--Eulinx-color-border") }}
                >
                  <span style={{ color: token("--Eulinx-color-text-muted"), flexShrink: 0 }}>
                    <Icon
                      name="domain.template"
                      size="sm"
                      aria-hidden
                    />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span
                      className="truncate text-sm"
                      style={{ color: token("--Eulinx-color-text") }}
                    >
                      {tpl.name}
                    </span>
                    <span
                      className="truncate text-xs"
                      style={{ color: token("--Eulinx-color-text-muted") }}
                    >
                      {tpl.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Section>
        </div>

        {/* Shortcuts */}
        <Section title="Keyboard Shortcuts">
          <div className="grid grid-cols-1 gap-x-8 gap-y-2 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3" style={{ borderColor: token("--Eulinx-color-border") }}>
            {SHORTCUTS.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between gap-2"
              >
                <span
                  className="text-xs"
                  style={{ color: token("--Eulinx-color-text-muted") }}
                >
                  {s.label}
                </span>
                <div className="flex items-center gap-0.5">
                  {s.keys.map((k, i) => (
                    <kbd
                      key={i}
                      className="rounded px-1 py-0.5 text-[10px]"
                      style={{
                        background: token("--Eulinx-color-surface-alt"),
                        border: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
                        color: token("--Eulinx-color-text-muted"),
                        fontFamily: "var(--Eulinx-font-mono, monospace)",
                      }}
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

function QuickAction({
  icon,
  label,
  onClick,
  primary = false,
}: {
  icon: string
  label: string
  onClick?: () => void
  primary?: boolean
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors"
      style={{
        background: primary ? token("--Eulinx-color-accent") : token("--Eulinx-color-surface"),
        border: `var(--Eulinx-border-thin) solid ${primary ? token("--Eulinx-color-accent") : token("--Eulinx-color-border")}`,
        color: primary ? token("--Eulinx-color-surface") : token("--Eulinx-color-text"),
      }}
    >
      <Icon name={icon} size="sm" aria-hidden />
      {label}
    </button>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <h2
        className="text-xs font-semibold uppercase"
        style={{
          color: token("--Eulinx-color-text-secondary"),
          letterSpacing: 0,
        }}
      >
        {title}
      </h2>
      {hint ? (
        <p className="-mt-1 text-xs leading-5" style={{ color: token("--Eulinx-color-text-muted") }}>
          {hint}
        </p>
      ) : null}
      {children}
    </div>
  )
}

function EmptyState({ message }: { message: string }): ReactNode {
  return (
    <div
      className="flex items-center justify-center rounded px-3 py-6 text-sm"
      style={{
        background: token("--Eulinx-color-surface"),
        border: `var(--Eulinx-border-thin) dashed ${token("--Eulinx-color-border")}`,
        color: token("--Eulinx-color-text-muted"),
      }}
    >
      {message}
    </div>
  )
}
