/**
 * TopBar — IDE-style top bar for the center workspace area.
 *
 * Spans ONLY the center canvas region (not sidebar). Contains:
 * Project name, breadcrumbs, search, command palette, run/stop/deploy,
 * connection status, notifications, profile, and tab strip.
 *
 * Height: 48px. Follows VS Code / Linear / Cursor patterns.
 */

import { useCallback, type ReactNode } from "react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import type { CanvasTab } from "@/stores/layout-store"
import { FOCUS_RING_STYLE } from "@/a11y/focus-ring"

export interface TopBarProps {
  /** Current project/workspace name. */
  readonly projectName?: string
  /** Breadcrumb segments (e.g. ["Workspace", "Project", "File"]). */
  readonly breadcrumbs?: readonly string[]
  /** Active tab id. */
  readonly activeTabId: string
  /** All open tabs. */
  readonly tabs: readonly CanvasTab[]
  /** Whether a workflow is currently running. */
  readonly isRunning?: boolean
  /** Connection status. */
  readonly isConnected?: boolean
  /** Called when user clicks search / command palette. */
  readonly onOpenPalette?: () => void
  /** Called when user clicks Run. */
  readonly onRun?: () => void
  /** Called when user clicks Stop. */
  readonly onStop?: () => void
  /** Called when user clicks Deploy. */
  readonly onDeploy?: () => void
  /** Called when a tab is selected. */
  readonly onSelectTab?: (tabId: string) => void
  /** Called when a tab is closed. */
  readonly onCloseTab?: (tabId: string) => void
  /** Called when a new tab is added. */
  readonly onAddTab?: () => void
  /** Region focus visible state. */
  readonly focusVisible?: boolean
  readonly workspaceOpen?: boolean
}

const KIND_ICON: Record<CanvasTab["kind"], string> = {
  graph: "domain.graph",
  terminal: "domain.terminal",
  terminal_cards: "domain.terminal.square",
  artifact_diff: "domain.artifact",
  settings: "domain.settings",
}

export function TopBar({
  projectName = "Eulinx",
  breadcrumbs,
  activeTabId,
  tabs,
  isRunning = false,
  isConnected = true,
  onOpenPalette,
  onRun,
  onStop,
  onDeploy,
  onSelectTab,
  onCloseTab,
  onAddTab,
  focusVisible = false,
  workspaceOpen = true,
}: TopBarProps): ReactNode {
  const handleCloseTab = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation()
      onCloseTab?.(tabId)
    },
    [onCloseTab],
  )

  return (
    <div
      className="flex shrink-0 flex-col"
      style={{
        borderBottom: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
        background: token("--Eulinx-color-surface"),
      }}
    >
      {/* Main bar row */}
      <div
        className="flex h-12 items-center gap-2 px-3"
        style={{ minHeight: 48 }}
      >
        {/* Project name + breadcrumbs */}
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="truncate text-sm font-semibold"
            style={{ color: token("--Eulinx-color-text"), maxWidth: 160 }}
            title={projectName}
          >
            {projectName}
          </span>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span style={{ color: token("--Eulinx-color-text-muted"), opacity: 0.5 }}>
                    <Icon
                      name="nav.chevron.right"
                      size="xs"
                      aria-hidden
                    />
                  </span>
                  <span
                    className="text-xs truncate"
                    style={{
                      color: i === breadcrumbs.length - 1
                        ? token("--Eulinx-color-text")
                        : token("--Eulinx-color-text-muted"),
                      maxWidth: 120,
                    }}
                    title={crumb}
                  >
                    {crumb}
                  </span>
                </span>
              ))}
            </>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search / Command palette */}
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Search or run command (Ctrl+K)"
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors"
          style={{
            color: token("--Eulinx-color-text-muted"),
            border: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
            background: "transparent",
          }}
        >
          <Icon name="domain.search" size="xs" aria-hidden />
          <span className="hidden sm:inline">Search</span>
          <kbd
            className="ml-1 text-[10px] opacity-60"
            style={{ fontFamily: "var(--Eulinx-font-mono, monospace)" }}
          >
            Ctrl+K
          </kbd>
        </button>

        {/* Action buttons */}
        {workspaceOpen ? <div className="flex items-center gap-1">
          {isRunning ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop workflow"
              className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
              style={{
                color: token("--Eulinx-color-error"),
                border: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-error")}`,
                background: "transparent",
              }}
            >
              <Icon name="action.stop" size="xs" aria-hidden />
              <span className="hidden sm:inline">Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRun}
              aria-label="Run workflow"
              className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
              style={{
                color: token("--Eulinx-color-surface"),
                background: token("--Eulinx-color-accent"),
              }}
            >
              <Icon name="action.play" size="xs" aria-hidden />
              <span className="hidden sm:inline">Run</span>
            </button>
          )}
          <button
            type="button"
            onClick={onDeploy}
            aria-label="Deploy"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
            style={{
              color: token("--Eulinx-color-text-muted"),
              border: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
              background: "transparent",
            }}
          >
            <Icon name="domain.deploy" size="xs" aria-hidden />
            <span className="hidden sm:inline">Deploy</span>
          </button>
        </div> : null}

        {/* Divider */}
        {workspaceOpen ? <div
          className="mx-1"
          style={{
            width: 1,
            height: 20,
            background: token("--Eulinx-color-border"),
          }}
        /> : null}

        {/* Connection status */}
        <button
          type="button"
          aria-label={isConnected ? "Connected" : "Disconnected"}
          className="flex items-center gap-1.5 rounded px-1.5 py-1"
          style={{ color: token("--Eulinx-color-text-muted") }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isConnected
                ? token("--Eulinx-color-success")
                : token("--Eulinx-color-error"),
            }}
          />
          <span className="text-xs hidden md:inline">
            {isConnected ? "Connected" : "Offline"}
          </span>
        </button>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="flex items-center justify-center rounded transition-colors"
          style={{
            width: 28,
            height: 28,
            color: token("--Eulinx-color-text-muted"),
          }}
        >
          <Icon name="domain.bell" size="sm" aria-hidden />
        </button>

        {/* Profile */}
        <button
          type="button"
          aria-label="Profile"
          className="flex items-center justify-center rounded transition-colors"
          style={{
            width: 28,
            height: 28,
            color: token("--Eulinx-color-text-muted"),
          }}
        >
          <Icon name="domain.user" size="sm" aria-hidden />
        </button>
      </div>

      {/* Tab strip */}
      {workspaceOpen ? <div
        role="tablist"
        aria-label="Canvas tabs"
        className="flex h-8 items-center gap-0.5 overflow-x-auto px-2"
        style={{
          borderTop: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
          background: token("--Eulinx-color-surface"),
        }}
      >
        {tabs.map((tab) => {
          const active = tab.tabId === activeTabId
          return (
            <div
              key={tab.tabId}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              title={tab.title}
              onClick={() => onSelectTab?.(tab.tabId)}
              className="group flex cursor-pointer items-center gap-1 whitespace-nowrap rounded px-2.5 py-1 text-xs transition-colors"
              style={{
                height: 28,
                background: active ? token("--Eulinx-color-surface-alt") : "transparent",
                color: active ? token("--Eulinx-color-text") : token("--Eulinx-color-text-muted"),
                outline: focusVisible && active ? (FOCUS_RING_STYLE.outline as string) : "none",
                outlineOffset: focusVisible && active ? (FOCUS_RING_STYLE.outlineOffset as string) : undefined,
              }}
            >
              <Icon name={KIND_ICON[tab.kind] ?? "domain.graph"} size="xs" aria-hidden />
              <span className="max-w-[140px] truncate">{tab.title}</span>
              {!tab.pinned && (
                <button
                  type="button"
                  aria-label={`Close ${tab.title}`}
                  onClick={(e) => handleCloseTab(e, tab.tabId)}
                  className="ml-0.5 flex items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
                  style={{
                    width: 16,
                    height: 16,
                    color: token("--Eulinx-color-text-muted"),
                  }}
                >
                  <Icon name="nav.close" size="xs" aria-hidden />
                </button>
              )}
            </div>
          )
        })}

        <button
          type="button"
          aria-label="New tab"
          onClick={onAddTab}
          className="flex items-center justify-center rounded transition-colors"
          style={{
            width: 24,
            height: 24,
            color: token("--Eulinx-color-text-muted"),
          }}
        >
          <Icon name="action.add" size="xs" aria-hidden />
        </button>
      </div> : null}
    </div>
  )
}
