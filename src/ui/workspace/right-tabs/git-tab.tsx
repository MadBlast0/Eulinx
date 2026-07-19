import { useEffect, useRef, useState } from "react"
import {
  Check,
  ChevronRight,
  File,
  GitPullRequest,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/utils/cn"

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
          className="mx-4 mt-3 flex items-center gap-2 rounded-[var(--wsx-r-sm)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)] px-3 py-2 text-xs text-[color:var(--wsx-text-sec)] transition-colors hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text)]"
        >
          <GitPullRequest className="h-3.5 w-3.5" strokeWidth={1.5} />
          Create PR
        </button>

        <div className="flex items-center gap-2 px-4 py-2 text-xs text-[color:var(--wsx-text-sec)]">
          vs <span className="font-mono text-[color:var(--wsx-accent)]">origin/main</span>
        </div>

        <div className="mx-4 my-2 rounded-[var(--wsx-r-sm)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)] px-3 py-2 text-xs text-[color:var(--wsx-text-muted)] focus-within:border-[color:var(--wsx-accent-dim)]">
          Message
        </div>

        <div ref={dropdownRef} className="relative mx-4 my-2 flex">
          <button
            type="button"
            onClick={cycleAction}
            className="flex flex-1 items-center justify-center gap-1 rounded-l-[var(--wsx-r-sm)] border border-[color:var(--wsx-accent-dim)] bg-[color:var(--wsx-accent-dim)] p-2 text-xs text-[color:var(--wsx-accent)] transition-colors hover:bg-[color:var(--wsx-accent)] hover:text-[color:var(--wsx-bg-app)]"
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
            onClick={(e) => {
              e.stopPropagation()
              setDropdownOpen((v) => !v)
            }}
            className="flex w-7 items-center justify-center rounded-r-[var(--wsx-r-sm)] border border-l-[color:var(--wsx-accent)] border-[color:var(--wsx-accent-dim)] bg-[color:var(--wsx-accent-dim)] text-[color:var(--wsx-accent)] transition-colors hover:bg-[color:var(--wsx-accent)] hover:text-[color:var(--wsx-bg-app)]"
          >
            <ChevronRight className="h-3 w-3 rotate-90" strokeWidth={1.5} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-0.5 min-w-[200px] rounded-[var(--wsx-r-md)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-elevated)] p-1 shadow-[var(--wsx-shadow-lg)]">
              {DROPDOWN_GROUPS.map((group, gi) => (
                <div key={gi}>
                  {group.map((item) => (
                    <div
                      key={item}
                      className="flex cursor-pointer items-center gap-2 rounded-[var(--wsx-r-sm)] px-3 py-2 text-xs text-[color:var(--wsx-text-sec)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text)]"
                    >
                      {item}
                    </div>
                  ))}
                  {gi < DROPDOWN_GROUPS.length - 1 && (
                    <div className="my-1 h-px bg-[color:var(--wsx-border)]" />
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

      <div className="shrink-0 border-t border-[color:var(--wsx-border)]">
        <button
          type="button"
          onClick={() => setCommitsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2 transition-colors hover:bg-[color:var(--wsx-bg-hover)]"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--wsx-text-muted)]">
            Commits 50 +
          </span>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center text-[color:var(--wsx-text-muted)]">
              <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
            </span>
            <ChevronRight
              className={cn(
                "h-3 w-3 text-[color:var(--wsx-text-muted)] transition-transform",
                commitsOpen && "rotate-90",
              )}
              strokeWidth={1.5}
            />
          </div>
        </button>
        {commitsOpen && (
          <div className="max-h-[250px] overflow-y-auto border-t border-[color:var(--wsx-border)]">
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
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--wsx-text-muted)]">
        {label}
      </span>
      {viewAll && (
        <span className="cursor-pointer text-[11px] text-[color:var(--wsx-text-muted)] hover:text-[color:var(--wsx-text-sec)]">
          View all
        </span>
      )}
    </div>
  )
}

function GitFileRow({ file }: { file: ChangeFile }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 px-4 py-1 text-xs text-[color:var(--wsx-text-sec)] transition-colors hover:bg-[color:var(--wsx-bg-hover)]"
    >
      <File className="h-3.5 w-3.5 shrink-0 text-[color:var(--wsx-text-muted)]" strokeWidth={1.5} />
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left font-mono">
        {file.name}
      </span>
      {file.path && (
        <span className="shrink-0 text-[11px] text-[color:var(--wsx-text-muted)]">{file.path}</span>
      )}
      <span className="flex shrink-0 gap-1 font-mono text-[11px]">
        {file.add !== undefined && (
          <span className="text-[color:var(--wsx-green)]">+{file.add}</span>
        )}
        {file.del !== undefined && (
          <span className="text-[color:var(--wsx-red)]">-{file.del}</span>
        )}
      </span>
      <span
        className="min-w-4 shrink-0 rounded-[3px] px-1 text-center font-mono text-[10px] font-semibold"
        style={
          file.badge === "M"
            ? { background: "var(--wsx-amber-dim)", color: "var(--wsx-amber)" }
            : { background: "var(--wsx-green-dim)", color: "var(--wsx-green)" }
        }
      >
        {file.badge}
      </span>
    </button>
  )
}

function CommitItem({ commit }: { commit: Commit }) {
  const [open, setOpen] = useState(false)
  const hasFiles = commit.files && commit.files.length > 0

  return (
    <div className="border-b border-[color:var(--wsx-border)] transition-colors hover:bg-[color:var(--wsx-bg-hover)]">
      <button
        type="button"
        onClick={() => hasFiles && setOpen((v) => !v)}
        className="flex w-full items-start gap-2 px-4 py-2 text-left"
      >
        <span
          className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ background: commit.merge ? "var(--wsx-purple)" : "var(--wsx-accent)" }}
        />
        <span className="min-w-0 flex-1">
          <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-tight text-[color:var(--wsx-text)]">
            {commit.msg}
            {commit.branch && (
              <span className="ml-1 rounded-[3px] bg-[color:var(--wsx-accent-surf)] px-1.5 py-px text-[9px] font-semibold text-[color:var(--wsx-accent)]">
                {commit.branch}
              </span>
            )}
          </span>
          <span className="mt-px block text-[10px] text-[color:var(--wsx-text-muted)]">
            Mad Blast · Jul 19
          </span>
        </span>
        {hasFiles && (
          <ChevronRight
            className={cn(
              "mt-1 h-3 w-3 shrink-0 text-[color:var(--wsx-text-muted)] transition-transform",
              open && "rotate-90",
            )}
            strokeWidth={1.5}
          />
        )}
      </button>
      {open && hasFiles && (
        <div className="pb-2 pl-6 pr-4">
          {commit.files!.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-2 py-0.5 text-[11px] text-[color:var(--wsx-text-muted)]"
            >
              <File className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                {f.name}
              </span>
              <span
                className="font-mono text-[9px] font-semibold"
                style={{ color: f.badge === "M" ? "var(--wsx-amber)" : "var(--wsx-green)" }}
              >
                {f.badge}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
