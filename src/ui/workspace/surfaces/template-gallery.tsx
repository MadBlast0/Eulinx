import { useState } from "react"
import {
  BookOpen,
  Boxes,
  Bug,
  CheckCircle2,
  FileText,
  GitPullRequest,
  Mic,
  Search,
  BarChart3,
  Sparkles,
  ArrowRight,
  Tag,
  Clock,
  DollarSign,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { Button, Input, Badge, ScrollArea } from "@/components/ui"
import { PanelSurface } from "../primitives"
import { useTemplates, type Template, type TemplateCategory } from "../templates-store"
import { TONE_FG } from "../state"

const ICON_MAP: Record<string, React.ReactNode> = {
  GitPullRequest: <GitPullRequest className="h-5 w-5" strokeWidth={1.5} />,
  BookOpen: <BookOpen className="h-5 w-5" strokeWidth={1.5} />,
  Boxes: <Boxes className="h-5 w-5" strokeWidth={1.5} />,
  FileText: <FileText className="h-5 w-5" strokeWidth={1.5} />,
  Bug: <Bug className="h-5 w-5" strokeWidth={1.5} />,
  Mic: <Mic className="h-5 w-5" strokeWidth={1.5} />,
  CheckCircle2: <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />,
  BarChart3: <BarChart3 className="h-5 w-5" strokeWidth={1.5} />,
}

const CATEGORY_ICONS: Record<TemplateCategory, React.ReactNode> = {
  coding: <GitPullRequest className="h-3.5 w-3.5" strokeWidth={1.5} />,
  automation: <Boxes className="h-3.5 w-3.5" strokeWidth={1.5} />,
  research: <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />,
  writing: <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />,
  testing: <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />,
  data: <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} />,
}

function TemplateCard({
  template,
  onUse,
}: {
  template: Template
  onUse: (id: string) => void
}) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <PanelSurface
      className={cn(
        "flex cursor-pointer flex-col gap-3 p-4 transition-all hover:border-[color:var(--Eulinx-color-accent)]",
        showDetail && "border-[color:var(--Eulinx-color-accent)]",
      )}
      onClick={() => setShowDetail((v) => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          setShowDetail((v) => !v)
        }
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--Eulinx-radius-md)]"
          style={{
            background: `color-mix(in srgb, ${TONE_FG.accent} 14%, transparent)`,
            color: TONE_FG.accent,
          }}
        >
          {ICON_MAP[template.icon] ?? <Sparkles className="h-5 w-5" strokeWidth={1.5} />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[color:var(--Eulinx-color-text)]">
            {template.title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--Eulinx-color-text-secondary)]">
            {template.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {template.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] font-normal text-[color:var(--Eulinx-color-text-muted)]"
              >
                <Tag className="mr-0.5 h-2.5 w-2.5" strokeWidth={1.5} />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
          onClick={(e) => {
            e.stopPropagation()
            setShowDetail((v) => !v)
          }}
        >
          <ArrowRight
            className={cn("h-4 w-4 transition-transform", showDetail && "rotate-90")}
            strokeWidth={1.5}
          />
        </span>
      </div>

      {showDetail && (
        <div className="space-y-3 border-t border-[color:var(--Eulinx-color-border)] pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface-sunken)] px-3 py-2">
              <DollarSign className="h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
              <div>
                <div className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">Cost</div>
                <div className="text-xs font-medium text-[color:var(--Eulinx-color-text)]">{template.cost}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface-sunken)] px-3 py-2">
              <Clock className="h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
              <div>
                <div className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">Effort</div>
                <div className="text-xs font-medium text-[color:var(--Eulinx-color-text)]">{template.effort}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-medium text-[color:var(--Eulinx-color-text-muted)]">Requires:</span>
            {template.capabilities.map((cap) => (
              <Badge key={cap} className="text-[10px] font-normal" style={{ background: `color-mix(in srgb, ${TONE_FG.info} 14%, transparent)`, color: TONE_FG.info }}>
                {cap}
              </Badge>
            ))}
          </div>

          <Button
            className="w-full"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onUse(template.id)
            }}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
            Use Template
          </Button>
        </div>
      )}
    </PanelSurface>
  )
}

export default function TemplateGallery() {
  const { filteredTemplates, search, setSearch, categoryFilter, setCategoryFilter, categories, categoryLabels, useTemplate } = useTemplates()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Template Gallery</h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
            Pre-built workflows to jumpstart your work
          </p>
        </div>
      </div>

      <div className="border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="h-8 bg-[color:var(--Eulinx-color-surface-sunken)] pl-8 text-xs"
            />
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-[var(--Eulinx-radius-sm)] px-2.5 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                categoryFilter === null
                  ? "bg-[color:var(--Eulinx-color-accent)] text-[color:var(--Eulinx-color-background)]"
                  : "text-[color:var(--Eulinx-color-text-secondary)] hover:bg-[color:var(--Eulinx-color-hover)]",
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-[var(--Eulinx-radius-sm)] px-2.5 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  categoryFilter === cat
                    ? "bg-[color:var(--Eulinx-color-accent)] text-[color:var(--Eulinx-color-background)]"
                    : "text-[color:var(--Eulinx-color-text-secondary)] hover:bg-[color:var(--Eulinx-color-hover)]",
                )}
              >
                <span className={cn(categoryFilter === cat ? "text-inherit" : "text-[color:var(--Eulinx-color-text-muted)]")}>
                  {CATEGORY_ICONS[cat]}
                </span>
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="mb-3 h-8 w-8 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
              <p className="text-sm text-[color:var(--Eulinx-color-text-secondary)]">No templates found</p>
              <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
                Try a different search or category filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredTemplates.map((t) => (
                <TemplateCard key={t.id} template={t} onUse={useTemplate} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
