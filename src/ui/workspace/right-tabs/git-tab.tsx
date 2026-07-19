import { useEffect, useRef, useState } from "react"
import {
  Check,
  ChevronRight,
  File,
  GitPullRequest,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { Dot, ListRow, StateBadge } from "../primitives"
import { type Tone, toneText } from "../state"

type GitAction = "stage" | "commit" | "push"

const ACTION_LABEL: Record<GitAction, string> = {
  stage: "Stage All",
  commit: "Commit",
  push: "Push",
}

interface ChangeFile {
  readonly name: string
  readonly path?: string
  readonly add?: number
  readonly del?: number
  readonly badge: "M" | "U"
}

const CHANGES: readonly ChangeFile[] = [
  { name: "App.tsx", path: "src", add: 12, del: 4, badge: "M" },
  { name: "tokens.css", path: "src/ui/tokens", add: 62, del: 62, badge: "M" },
]
const UNTRACKED: readonly ChangeFile[] = [
  { name: "ui-redesign-prototype.html", add: 1408, badge: "U" },
]

interface Commit {
  readonly msg: string
  readonly branch?: string
  readonly merge?: boolean
  readonly files?: readonly { readonly name: string; readonly badge: "M" | "A" }[]
}

const COMMITS: readonly Commit[] = [
  {
    msg: "Form elements inherit font; add chrome, co...",
    branch: "main",
    files: [{ name: "globals.css", badge: "M" }],
  },
  {
    msg: "Replace Dashboard with WelcomeScreen and Ca...",
    merge: true,
    files: [
      { name: "canvas-view.tsx", badge: "A" },
      { name: "welcome-screen.tsx", badge: "A" },
    ],
  },
  { msg: "Add overlay UI components with accessible dialo..." },
  { msg: "Add layout primitives: CommandPalette, Search" },
]

const DROPDOWN_GROUPS: readonly (readonly string[])[] = [
  ["Commit", "Commit & Push", "Commit & Sync"],
  ["Push", "Force Push", "Create PR"],
  ["Pull", "Fast-forward", "Sync", "Rebase from origin/main", "Fetch"],
  ["Publish Branch"],
]

const CHANGE_BADGE_TONE: Record<"M" | "U", Tone> = {
  M: "warning",
  U: "success",
}

const COMMIT_FILE_TONE: Record<"M" | "A", Tone> = {
  M: "warning",
  A: "success",
}

export function GitTab() {
  const [action, setAction] = useState<GitAction>("stage")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [commitsOpen, setCommitsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const cycleAction = () => {
    const order: readonly GitAction[] = ["stage", "commit", "push"]
    const next = order[(order.indexOf(action) + 1) % order.length] ?? "stage"
    setAction(next)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <button
          type="button"
          className="mx-4 mt-3 flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-3 py-2 text-xs text-[color:var(--Eulinx-color-text-secondary)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <GitPullRequest className="h-3.5 w-3.5" strokeWidth={1.5} />
          Create PR
        </button>

        <div className="flex items-center gap-2 px-4 py-2 text-xs text-[color:var(--Eulinx-color-text-secondary)]">
          vs <span className="font-mono text-[color:var(--Eulinx-color-accent)]">origin/main</span>
        </div>

        <div className="mx-4 my-2 rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-3 py-2 text-xs text-[color:var(--Eulinx-color-text-muted)] transition-colors focus-within:border-[color:var(--Eulinx-color-ring)]">
          Message
        </div>

        <div ref={dropdownRef} className="relative mx-4 my-2 flex">
          <button
            type="button"
            onClick={cycleAction}
            className="flex flex-1 items-center justify-center gap-1 rounded-l-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-accent)] p-2 text-xs text-[color:var(--Eulinx-color-accent)] transition-colors hover:bg-[color:var(--Eulinx-color-accent)] hover:text-[color:var(--Eulinx-color-background)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            style={{ background: "color-mix(in srgb, var(--Eulinx-color-accent) 14%, transparent)" }}
          >
            {action === "commit" ? (
              <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <GitPullRequest className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            {ACTION_LABEL[action]}
          </button>
          <button
            type="button"
            aria-label="Git action options"
            aria-expanded={dropdownOpen}
            onClick={(e) => {
              e.stopPropagation()
              setDropdownOpen((v) => !v)
            }}
            className="flex w-7 items-center justify-center rounded-r-[var(--Eulinx-radius-sm)] border border-l-0 border-[color:var(--Eulinx-color-accent)] text-[color:var(--Eulinx-color-accent)] transition-colors hover:bg-[color:var(--Eulinx-color-accent)] hover:text-[color:var(--Eulinx-color-background)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            style={{ background: "color-mix(in srgb, var(--Eulinx-color-accent) 14%, transparent)" }}
          >
            <ChevronRight className="h-3 w-3 rotate-90" strokeWidth={1.5} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full z-[var(--Eulinx-z-dropdown)] mt-0.5 min-w-[200px] rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-raised)] p-1 shadow-[var(--Eulinx-elev-lg)]">
              {DROPDOWN_GROUPS.map((group, gi) => (
                <div key={gi}>
                  {group.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-2 rounded-[var(--Eulinx-radius-sm)] px-3 py-2 text-left text-xs text-[color:var(--Eulinx-color-text-secondary)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

        <SectionHead label="Changes 9" viewAll />
        {CHANGES.map((file) => (
          <GitFileRow key={file.name} file={file} />
        ))}

        <SectionHead label="Untracked 2" />
        {UNTRACKED.map((file) => (
          <GitFileRow key={file.name} file={file} />
        ))}
      </div>

      <div className="shrink-0 border-t border-[color:var(--Eulinx-color-border)]">
        <button
          type="button"
          aria-expanded={commitsOpen}
          onClick={() => setCommitsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2 transition-colors hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--Eulinx-color-text-muted)]">
            Commits 50 +
          </span>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center text-[color:var(--Eulinx-color-text-muted)]">
              <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
            </span>
            <ChevronRight
              className={cn(
                "h-3 w-3 text-[color:var(--Eulinx-color-text-muted)] transition-transform",
                commitsOpen && "rotate-90",
              )}
              strokeWidth={1.5}
            />
          </div>
        </button>
        {commitsOpen && (
          <div className="max-h-[250px] overflow-y-auto border-t border-[color:var(--Eulinx-color-border)]">
            {COMMITS.map((commit, i) => (
              <CommitItem key={i} commit={commit} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionHead({ label, viewAll = false }: { label: string; viewAll?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--Eulinx-color-text-muted)]">
        {label}
      </span>
      {viewAll && (
        <button
          type="button"
          className="cursor-pointer text-[11px] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:text-[color:var(--Eulinx-color-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          View all
        </button>
      )}
    </div>
  )
}

function GitFileRow({ file }: { file: ChangeFile }) {
  return (
    <ListRow role="button" tabIndex={0} className="mx-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
      <File className="h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left font-mono text-xs">
        {file.name}
      </span>
      {file.path && (
        <span className="shrink-0 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">{file.path}</span>
      )}
      <span className="flex shrink-0 gap-1 font-mono text-[11px]">
        {file.add !== undefined && (
          <span style={toneText("success")}>+{file.add}</span>
        )}
        {file.del !== undefined && (
          <span style={toneText("error")}>-{file.del}</span>
        )}
      </span>
      <StateBadge tone={CHANGE_BADGE_TONE[file.badge]} className="font-mono">
        {file.badge}
      </StateBadge>
    </ListRow>
  )
}

function CommitItem({ commit }: { commit: Commit }) {
  const [open, setOpen] = useState(false)
  const hasFiles = commit.files && commit.files.length > 0

  return (
    <div className="border-b border-[color:var(--Eulinx-color-border)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)]">
      <button
        type="button"
        aria-expanded={hasFiles ? open : undefined}
        onClick={() => hasFiles && setOpen((v) => !v)}
        className="flex w-full items-start gap-2 px-4 py-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <span className="mt-[5px]">
          <Dot tone={commit.merge ? "accent" : "info"} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-tight text-[color:var(--Eulinx-color-text)]">
            {commit.msg}
            {commit.branch && (
              <StateBadge tone="accent" className="ml-1 text-[9px] font-semibold">
                {commit.branch}
              </StateBadge>
            )}
          </span>
          <span className="mt-px block text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
            Mad Blast · Jul 19
          </span>
        </span>
        {hasFiles && (
          <ChevronRight
            className={cn(
              "mt-1 h-3 w-3 shrink-0 text-[color:var(--Eulinx-color-text-muted)] transition-transform",
              open && "rotate-90",
            )}
            strokeWidth={1.5}
          />
        )}
      </button>
      {open && hasFiles && commit.files && (
        <div className="pb-2 pl-6 pr-4">
          {commit.files.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-2 py-0.5 text-[11px] text-[color:var(--Eulinx-color-text-muted)]"
            >
              <File className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                {f.name}
              </span>
              <span className="font-mono text-[9px] font-semibold" style={toneText(COMMIT_FILE_TONE[f.badge])}>
                {f.badge}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
