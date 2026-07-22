import { useMemo, useState } from "react"
import { Database, Search, Upload, Link2, FileText, Loader2 } from "lucide-react"
import { Button, Input, Textarea, ScrollArea, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui"
import { ListRow, PanelSurface, StateBadge, Dot } from "../primitives"
import PanelScaffold from "../panels/panel-scaffold"
import { MemoryManager } from "@/memory/memory-manager"
import { brand } from "@/core/types"
import type { WorkspaceId } from "@/core/types"
import type { VectorSearchResult } from "@/memory/memory-vector"

const WORKSPACE = brand<WorkspaceId>("kb-ui")

export default function KnowledgeBasePanel() {
  // Self-contained in-memory manager for this panel surface.
  const manager = useMemo(() => new MemoryManager(), [])
  const [text, setText] = useState("")
  const [url, setUrl] = useState("")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<readonly VectorSearchResult[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [incomplete, setIncomplete] = useState(false)

  const runSearch = async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    const found = await manager.knowledgeBase.search(q, WORKSPACE, 20)
    setResults(found)
  }

  const ingestText = async () => {
    if (!text.trim()) return
    setBusy(true)
    setStatus(null)
    try {
      const res = await manager.ingest("text", text, WORKSPACE)
      setStatus(`Indexed ${res.ids.length} chunk(s) from pasted text.`)
    } finally {
      setBusy(false)
    }
  }

  const ingestUrl = async () => {
    if (!url.trim()) return
    setBusy(true)
    setStatus(null)
    try {
      const res = await manager.ingest("url", url, WORKSPACE)
      setStatus(`Fetched & indexed ${res.ids.length} chunk(s) from ${url}.`)
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setStatus(null)
    setIncomplete(false)
    try {
      if (file.name.toLowerCase().endsWith(".pdf")) {
        const buf = await file.arrayBuffer()
        const res = await manager.ingest("pdf", buf, WORKSPACE, { title: file.name })
        setIncomplete(Boolean(res.incomplete))
        setStatus(`Indexed ${res.ids.length} chunk(s) from PDF (best-effort).`)
      } else {
        const content = await file.text()
        const isMd = /\.(md|markdown|mdx)$/i.test(file.name)
        const res = await manager.ingest(isMd ? "markdown" : "text", content, WORKSPACE, {
          title: file.name,
        })
        setStatus(`Indexed ${res.ids.length} chunk(s) from ${file.name}.`)
      }
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PanelScaffold
      title="Knowledge Base"
      actions={
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              void runSearch(e.target.value)
            }}
            placeholder="Semantic search…"
            aria-label="Semantic search"
            className="h-6 pl-8 text-xs"
          />
        </div>
      }
    >
      <Tabs defaultValue="ingest" className="flex h-full flex-col">
        <div className="px-3 pt-2">
          <TabsList>
            <TabsTrigger value="ingest">
              <Upload className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              Ingest
            </TabsTrigger>
            <TabsTrigger value="browse">
              <Database className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              Chunks ({manager.knowledgeBase.store.count(WORKSPACE)})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="ingest" className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-3">
            <PanelSurface className="flex flex-col gap-2 p-3">
              <label className="flex items-center gap-2 text-xs font-medium text-[color:var(--Eulinx-color-text-secondary)]">
                <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                Paste text or markdown
              </label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste content to index…"
                className="min-h-[120px] bg-[color:var(--Eulinx-color-surface-sunken)]"
                aria-label="Text to ingest"
              />
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={ingestText} disabled={busy || !text.trim()}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Index"}
                </Button>
              </div>
            </PanelSurface>

            <PanelSurface className="flex flex-col gap-2 p-3">
              <label className="flex items-center gap-2 text-xs font-medium text-[color:var(--Eulinx-color-text-secondary)]">
                <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                From URL
              </label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/doc"
                aria-label="URL to ingest"
                className="bg-[color:var(--Eulinx-color-surface-sunken)]"
              />
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={ingestUrl} disabled={busy || !url.trim()}>
                  Fetch & Index
                </Button>
              </div>
            </PanelSurface>

            <PanelSurface className="flex flex-col gap-2 p-3">
              <label className="flex items-center gap-2 text-xs font-medium text-[color:var(--Eulinx-color-text-secondary)]">
                <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                Upload file
              </label>
              <input
                type="file"
                accept=".txt,.md,.markdown,.mdx,.pdf"
                onChange={(e) => void onFile(e.target.files?.[0])}
                className="text-xs text-[color:var(--Eulinx-color-text-muted)]"
              />
              <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                .txt / .md indexed fully. .pdf is best-effort (no PDF parser bundled).
              </span>
            </PanelSurface>

            {status ? (
              <div className="flex items-start gap-2 px-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                <Dot tone={incomplete ? "warning" : "success"} />
                <span>{status}</span>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="browse" className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col divide-y divide-[color:var(--Eulinx-color-border)]">
              {results.length > 0 ? (
                results.map((r) => (
                  <ListRow key={r.record.id} className="flex-col items-start gap-1 px-3 py-2">
                    <span className="flex w-full items-center justify-between">
                      <span className="font-mono text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                        {r.record.vectorRef}
                      </span>
                      <StateBadge tone={r.matchType === "semantic" ? "info" : "neutral"}>
                        {r.matchType} · {r.score.toFixed(3)}
                      </StateBadge>
                    </span>
                    <span className="text-[12px] leading-snug text-[color:var(--Eulinx-color-text)]">
                      {r.record.chunkText}
                    </span>
                  </ListRow>
                ))
              ) : query.trim() ? (
                <div className="px-3 py-10 text-center text-xs text-[color:var(--Eulinx-color-text-muted)]">
                  No semantic matches.
                </div>
              ) : (
                <div className="px-3 py-10 text-center text-xs text-[color:var(--Eulinx-color-text-muted)]">
                  Run a semantic search above to see ranked chunks.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </PanelScaffold>
  )
}
