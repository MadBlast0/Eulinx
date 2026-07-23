import { useMemo, useState } from "react"
import { AppIcon } from "../app-icon"
import { Plus, Trash2 } from "lucide-react"
import { ArtifactsProvider, useArtifacts, type Artifact, type ArtifactKind } from "../artifacts-store"

const KIND_META: Record<ArtifactKind, { label: string; iconName: string }> = {
  code: { label: "Code", iconName: "artifacts" },
  markdown: { label: "Markdown", iconName: "artifacts" },
  image: { label: "Image", iconName: "artifacts" },
  document: { label: "Document", iconName: "artifacts" },
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function ArtifactRow({ artifact, onRemove }: { artifact: Artifact; onRemove: (id: string) => void }) {
  const meta = KIND_META[artifact.kind]
  return (
    <li className="group flex items-center gap-3 rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-3 py-2.5 transition-colors hover:border-[color:var(--Eulinx-color-accent)] hover:bg-[color:var(--Eulinx-color-surface-hover)]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface-sunken)] text-[color:var(--Eulinx-color-accent)]">
        <AppIcon name={meta.iconName} className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[color:var(--Eulinx-color-text)]">
          {artifact.title}
        </div>
        <div className="truncate text-xs text-[color:var(--Eulinx-color-text-muted)]">
          {meta.label} · {formatRelative(artifact.updatedAt)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(artifact.id)}
        aria-label={`Delete ${artifact.title}`}
        className="opacity-0 transition-opacity group-hover:opacity-100 text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-error)]"
      >
        <Trash2 className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </li>
  )
}

function ArtifactsInner() {
  const { artifacts, addArtifact, removeArtifact } = useArtifacts()
  const [query, setQuery] = useState("")

  const filtered = useMemo<readonly Artifact[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return artifacts
    return artifacts.filter(
      (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q),
    )
  }, [artifacts, query])

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <AppIcon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2.25} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artifacts…"
            aria-label="Search artifacts"
            className="h-9 w-full rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] pl-8 pr-3 text-sm text-[color:var(--Eulinx-color-text)] outline-none placeholder:text-[color:var(--Eulinx-color-text-muted)] focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={() => addArtifact("markdown", "")}
          className="flex h-9 items-center gap-1.5 rounded-[var(--Eulinx-radius-md)] bg-[color:var(--Eulinx-color-accent)] px-3 text-sm font-medium text-[color:var(--Eulinx-color-accent-foreground)] transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          New
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[color:var(--Eulinx-color-text-muted)]">
          {artifacts.length === 0 ? "No artifacts yet." : "No artifacts match your search."}
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-2 overflow-auto">
          {filtered.map((a) => (
            <ArtifactRow key={a.id} artifact={a} onRemove={removeArtifact} />
          ))}
        </ul>
      )}
    </div>
  )
}

export function ArtifactsView() {
  return (
    <ArtifactsProvider>
      <ArtifactsInner />
    </ArtifactsProvider>
  )
}
