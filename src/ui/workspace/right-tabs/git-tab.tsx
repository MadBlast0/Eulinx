import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  GitPullRequest,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { Dot, ListRow, StateBadge } from "../primitives"
import { type Tone, toneText } from "../state"
import { useProjects } from "../use-projects"
import {
  type ChangeEntry,
  type CommitEntry,
  commit as gitCommit,
  getStatus,
  push as gitPush,
  stageAll,
  type GitStatus,
} from "../git-client"
import {
  EmptyState,
  SectionHeader,
} from "../right-sidebar"

const DROPDOWN_GROUPS: readonly (readonly string[])[] = [
  ["Commit", "Commit & Push", "Commit & Sync"],
  ["Push", "Force Push", "Create PR"],
  ["Pull", "Fast-forward", "Sync", "Rebase from origin/main", "Fetch"],
  ["Publish Branch"],
]

const CHANGE_BADGE_TONE: Record<string, Tone> = {
  M: "warning",
  A: "success",
  D: "error",
  R: "info",
  U: "success",
  C: "info",
}

function changeBadgeTone(status: string): Tone {
  const key = status.trim().charAt(0) || "M"
  return CHANGE_BADGE_TONE[key] ?? "neutral"
}

export function GitTab() {
  const { activeProject } = useProjects()
  const repo = activeProject?.path ?? ""

  const [status, setStatus] = useState<GitStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [commitsOpen, setCommitsOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: Tone; text: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    if (repo === "") {
      setStatus(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await getStatus(repo)
      setStatus(result)
    } catch (e) {
      setStatus(null)
      setError(e instanceof Error ? e.message : "Failed to read git status")
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (!dropdownOpen) return
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [dropdownOpen])

  const isRepo = repo !== "" && status !== null && error === null

  const doStageAll = async () => {
    if (!isRepo) return
    setFeedback(null)
    try {
      await stageAll(repo)
      setFeedback({ tone: "success", text: "Staged all changes" })
      await refresh()
    } catch (e) {
      setFeedback({ tone: "error", text: e instanceof Error ? e.message : "Stage failed" })
    }
  }

  const doCommit = async () => {
    if (!isRepo || message.trim() === "") return
    setFeedback(null)
    try {
      const out = await gitCommit(repo, message.trim())
      setMessage("")
      setFeedback({ tone: "success", text: out || "Committed" })
      await refresh()
    } catch (e) {
      setFeedback({ tone: "error", text: e instanceof Error ? e.message : "Commit failed" })
    }
  }

  const doPush = async () => {
    if (!isRepo) return
    setFeedback(null)
    try {
      const out = await gitPush(repo)
      setFeedback({ tone: "success", text: out || "Pushed" })
      await refresh()
    } catch (e) {
      setFeedback({ tone: "error", text: e instanceof Error ? e.message : "Push failed" })
    }
  }

  const doCreatePr = () => {
    setFeedback({ tone: "neutral", text: "PR creation requires a linked Git provider" })
  }

  // ── Empty / error state ──

  if (!isRepo) {
    const reason = repo === "" ? "No project folder open" : error ?? "Not a git repository"
    return (
      <EmptyState
        icon={<GitPullRequest className="h-5 w-5" strokeWidth={1.5} />}
        title={error ? "Not a git repository" : "No git repository"}
        description={reason}
        action={
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-2 flex items-center gap-1.5 rounded-md border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-3 py-1.5 text-xs text-[color:var(--Eulinx-color-text-secondary)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)]"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} strokeWidth={1.5} />
            Retry
          </button>
        }
      />
    )
  }

  const branchLabel = status.branch !== "" ? status.branch : "unknown"
  const upstream =
    status.ahead > 0 || status.behind > 0
      ? `↑${status.ahead} ↓${status.behind}`
      : ""

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {/* ── Branch info ── */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <span className="flex items-center gap-1.5 text-xs font-mono text-[color:var(--Eulinx-color-text-secondary)]">
            <GitPullRequest className="h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
            {branchLabel}
          </span>
          {upstream && (
            <span className="font-mono text-[11px]" style={toneText("info")}>{upstream}</span>
          )}
        </div>

        {/* ── Sync status ── */}
        <div className="px-3 pb-2 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
          {status.ahead > 0 || status.behind > 0 ? (
            <span>vs <span className="font-mono text-[color:var(--Eulinx-color-accent)]">origin/{branchLabel}</span></span>
          ) : (
            <span>In sync with origin/{branchLabel}</span>
          )}
        </div>

        {/* ── Commit message ── */}
        <div className="mx-3 mb-2 rounded-md border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-2.5 py-1.5 transition-colors focus-within:border-[color:var(--Eulinx-color-ring)]">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void doCommit() }}
            placeholder="Commit message"
            className="w-full bg-transparent text-xs text-[color:var(--Eulinx-color-text)] outline-none placeholder:text-[color:var(--Eulinx-color-text-muted)]"
          />
        </div>

        {/* ── Action bar ── */}
        <div ref={dropdownRef} className="relative mx-3 mb-2 flex">
          <button
            type="button"
            onClick={() => void doStageAll()}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-1 rounded-l-md border border-[color:var(--Eulinx-color-accent)] p-1.5 text-xs text-[color:var(--Eulinx-color-accent)] transition-colors hover:bg-[color:var(--Eulinx-color-accent)] hover:text-[color:var(--Eulinx-color-background)] disabled:opacity-50"
            style={{ background: "color-mix(in srgb, var(--Eulinx-color-accent) 10%, transparent)" }}
          >
            <Check className="h-3 w-3" strokeWidth={1.5} />
            Stage All
          </button>
          <button
            type="button"
            onClick={() => void doCommit()}
            disabled={loading || message.trim() === ""}
            className="flex flex-1 items-center justify-center gap-1 border border-l-0 border-[color:var(--Eulinx-color-accent)] p-1.5 text-xs text-[color:var(--Eulinx-color-accent)] transition-colors hover:bg-[color:var(--Eulinx-color-accent)] hover:text-[color:var(--Eulinx-color-background)] disabled:opacity-50"
            style={{ background: "color-mix(in srgb, var(--Eulinx-color-accent) 10%, transparent)" }}
          >
            <Check className="h-3 w-3" strokeWidth={1.5} />
            Commit
          </button>
          <button
            type="button"
            onClick={() => void doPush()}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-1 border border-l-0 border-[color:var(--Eulinx-color-accent)] p-1.5 text-xs text-[color:var(--Eulinx-color-accent)] transition-colors hover:bg-[color:var(--Eulinx-color-accent)] hover:text-[color:var(--Eulinx-color-background)] disabled:opacity-50"
            style={{ background: "color-mix(in srgb, var(--Eulinx-color-accent) 10%, transparent)" }}
          >
            <GitPullRequest className="h-3 w-3" strokeWidth={1.5} />
            Push
          </button>
          <button
            type="button"
            aria-label="Git action options"
            aria-expanded={dropdownOpen}
            onClick={(e) => { e.stopPropagation(); setDropdownOpen((v) => !v) }}
            className="flex w-7 items-center justify-center rounded-r-md border border-l-0 border-[color:var(--Eulinx-color-accent)] text-[color:var(--Eulinx-color-accent)] transition-colors hover:bg-[color:var(--Eulinx-color-accent)] hover:text-[color:var(--Eulinx-color-background)]"
            style={{ background: "color-mix(in srgb, var(--Eulinx-color-accent) 10%, transparent)" }}
          >
            <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full z-[var(--Eulinx-z-dropdown)] mt-0.5 min-w-[200px] rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1 shadow-lg">
              {DROPDOWN_GROUPS.map((group, gi) => (
                <div key={gi}>
                  {group.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false)
                        if (item === "Push") void doPush()
                        else if (item === "Create PR") doCreatePr()
                        else setFeedback({ tone: "neutral", text: `${item} is not available yet` })
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-[color:var(--Eulinx-color-text-secondary)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
                    >
                      {item}
                    </button>
                  ))}
                  {gi < DROPDOWN_GROUPS.length - 1 && (
                    <div className="my-1 h-px bg-[color:var(--Eulinx-color-border)]" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Create PR shortcut ── */}
        <button
          type="button"
          onClick={doCreatePr}
          className="mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-md border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-2.5 py-1.5 text-xs text-[color:var(--Eulinx-color-text-secondary)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
        >
          <GitPullRequest className="h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
          Create PR
        </button>

        {/* ── Feedback ── */}
        {feedback && (
          <div
            className="mx-3 mb-2 flex items-start gap-1.5 rounded-md px-2 py-1.5 text-[11px]"
            style={toneText(feedback.tone)}
          >
            {feedback.tone === "error" && (
              <AlertCircle className="mt-px h-3 w-3 shrink-0" strokeWidth={1.5} />
            )}
            <span className="min-w-0 flex-1">{feedback.text}</span>
          </div>
        )}

        {/* ── Changes ── */}
        <SectionHeader label="Changes" count={status.changes.length} />
        {status.changes.length === 0 ? (
          <div className="px-3 py-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
            No staged or modified files
          </div>
        ) : (
          status.changes.map((file) => <GitFileRow key={file.path} file={file} />)
        )}

        {/* ── Untracked ── */}
        <SectionHeader label="Untracked" count={status.untracked.length} />
        {status.untracked.length === 0 ? (
          <div className="px-3 py-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
            No untracked files
          </div>
        ) : (
          status.untracked.map((file) => <GitFileRow key={file.path} file={file} />)
        )}
      </div>

      {/* ── Commits (collapsible footer) ── */}
      <div className="shrink-0 border-t border-[color:var(--Eulinx-color-border)]">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={commitsOpen}
          onClick={() => setCommitsOpen((v) => !v)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCommitsOpen((v) => !v) } }}
          className="flex w-full cursor-pointer items-center justify-between px-3 py-1.5 transition-colors hover:bg-[color:var(--Eulinx-color-hover)]/50"
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
            Commits
            <span className="ml-1 text-[color:var(--Eulinx-color-text-muted)]/60">{status.commits.length}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Refresh"
              onClick={(e) => { e.stopPropagation(); void refresh() }}
              className="flex h-5 w-5 items-center justify-center text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:text-[color:var(--Eulinx-color-text-secondary)]"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} strokeWidth={1.5} />
            </button>
            <ChevronRight
              className={cn(
                "h-3 w-3 text-[color:var(--Eulinx-color-text-muted)] transition-transform duration-150",
                commitsOpen && "rotate-90",
              )}
              strokeWidth={1.5}
            />
          </div>
        </div>
        {commitsOpen && (
          <div className="max-h-[250px] overflow-y-auto border-t border-[color:var(--Eulinx-color-border)]">
            {status.commits.length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">No commits yet</div>
            ) : (
              status.commits.map((commit, i) => <CommitItem key={commit.hash || i} commit={commit} />)
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── File row ──

function GitFileRow({ file }: { file: ChangeEntry }) {
  const badge = file.status.trim().charAt(0) || "M"
  const name = file.path.split("/").pop() ?? file.path
  const dir = file.path.includes("/")
    ? file.path.slice(0, file.path.lastIndexOf("/"))
    : undefined
  return (
    <ListRow
      role="button"
      tabIndex={0}
      className="mx-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--Eulinx-color-ring)]"
    >
      <span className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left font-mono text-xs">
        {name}
      </span>
      {dir && (
        <span className="shrink-0 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">{dir}</span>
      )}
      <span className="flex shrink-0 gap-1 font-mono text-[11px]">
        {file.add > 0 && <span style={toneText("success")}>+{file.add}</span>}
        {file.del > 0 && <span style={toneText("error")}>-{file.del}</span>}
      </span>
      <StateBadge tone={changeBadgeTone(file.status)} className="font-mono">{badge}</StateBadge>
    </ListRow>
  )
}

// ── Commit row ──

function CommitItem({ commit }: { commit: CommitEntry }) {
  return (
    <div className="border-b border-[color:var(--Eulinx-color-border)]/50 transition-colors hover:bg-[color:var(--Eulinx-color-hover)]/30">
      <div className="flex items-start gap-2 px-3 py-1.5 text-left">
        <span className="mt-[5px]"><Dot tone="info" /></span>
        <span className="min-w-0 flex-1">
          <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-tight text-[color:var(--Eulinx-color-text)]">
            {commit.message}
            <StateBadge tone="accent" className="ml-1 text-[9px] font-semibold">{commit.hash}</StateBadge>
          </span>
          <span className="mt-px block text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
            {commit.author} · {commit.when}
          </span>
        </span>
      </div>
    </div>
  )
}
