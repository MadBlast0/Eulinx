import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

export type TemplateCategory = "coding" | "automation" | "research" | "writing" | "testing" | "data"

export interface Template {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly icon: string
  readonly category: TemplateCategory
  readonly tags: readonly string[]
  readonly cost: string
  readonly effort: string
  readonly audience: string
  readonly capabilities: readonly string[]
}

const TEMPLATES: readonly Template[] = [
  {
    id: "code-review",
    title: "Code Review Assistant",
    description: "Reviews pull requests automatically. Analyzes code quality, suggests improvements, and flags potential bugs before merge.",
    icon: "GitPullRequest",
    category: "coding",
    tags: ["review", "pr", "quality"],
    cost: "~$0.50/review",
    effort: "1-2 min/review",
    audience: "Developers",
    capabilities: ["git", "code-analysis"],
  },
  {
    id: "research-synth",
    title: "Research Synthesizer",
    description: "Summarizes research papers and articles. Extracts key findings, methodology, and conclusions into structured notes.",
    icon: "BookOpen",
    category: "research",
    tags: ["papers", "summary", "analysis"],
    cost: "~$1.00/paper",
    effort: "3-5 min/paper",
    audience: "Researchers",
    capabilities: ["web", "files"],
  },
  {
    id: "build-pipeline",
    title: "Build Pipeline",
    description: "Automates the build, test, and deploy process. Runs on every push, reports results, and rolls back on failure.",
    icon: "Boxes",
    category: "automation",
    tags: ["ci", "cd", "deploy"],
    cost: "~$0.10/run",
    effort: "5-10 min setup",
    audience: "DevOps",
    capabilities: ["terminal", "git"],
  },
  {
    id: "doc-writer",
    title: "Documentation Writer",
    description: "Generates comprehensive documentation from source code. Creates API docs, README files, and inline comments.",
    icon: "FileText",
    category: "writing",
    tags: ["docs", "api", "readme"],
    cost: "~$0.30/file",
    effort: "2-3 min/file",
    audience: "Developers",
    capabilities: ["files", "code-analysis"],
  },
  {
    id: "bug-hunter",
    title: "Bug Hunter",
    description: "Systematically finds and fixes bugs. Analyzes stack traces, searches codebase for patterns, and proposes fixes.",
    icon: "Bug",
    category: "coding",
    tags: ["debug", "fix", "analysis"],
    cost: "~$0.75/bug",
    effort: "5-15 min/bug",
    audience: "Developers",
    capabilities: ["terminal", "files", "git"],
  },
  {
    id: "meeting-notes",
    title: "Meeting Notes",
    description: "Transcribes and summarizes meetings from audio. Extracts action items, decisions, and key discussion points.",
    icon: "Mic",
    category: "writing",
    tags: ["transcribe", "summary", "notes"],
    cost: "~$0.40/min",
    effort: "Real-time",
    audience: "Everyone",
    capabilities: ["files", "web"],
  },
  {
    id: "qa-automation",
    title: "QA Automation",
    description: "Runs test suites and reports results. Supports unit, integration, and E2E tests with detailed failure analysis.",
    icon: "CheckCircle2",
    category: "testing",
    tags: ["testing", "qa", "report"],
    cost: "~$0.20/run",
    effort: "2-5 min setup",
    audience: "QA Engineers",
    capabilities: ["terminal", "files"],
  },
  {
    id: "data-analyzer",
    title: "Data Analyzer",
    description: "Analyzes CSV and JSON data files. Generates statistics, visualizations, and insight summaries automatically.",
    icon: "BarChart3",
    category: "data",
    tags: ["csv", "json", "stats", "viz"],
    cost: "~$0.50/file",
    effort: "3-10 min/file",
    audience: "Data Analysts",
    capabilities: ["files", "web"],
  },
]

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  coding: "Coding",
  automation: "Automation",
  research: "Research",
  writing: "Writing",
  testing: "Testing",
  data: "Data",
}

const ALL_CATEGORIES: readonly TemplateCategory[] = ["coding", "automation", "research", "writing", "testing", "data"]

interface TemplatesContextValue {
  readonly templates: readonly Template[]
  readonly categories: readonly TemplateCategory[]
  readonly categoryLabels: Record<TemplateCategory, string>
  readonly search: string
  readonly setSearch: (q: string) => void
  readonly categoryFilter: TemplateCategory | null
  readonly setCategoryFilter: (cat: TemplateCategory | null) => void
  readonly filteredTemplates: readonly Template[]
  readonly useTemplate: (id: string) => void
}

const TemplatesContext = createContext<TemplatesContextValue | null>(null)

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | null>(null)

  const filteredTemplates = useMemo(() => {
    let result = TEMPLATES
    if (categoryFilter !== null) {
      result = result.filter((t) => t.category === categoryFilter)
    }
    if (search.trim() !== "") {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    }
    return result
  }, [categoryFilter, search])

  const useTemplate = useCallback((_id: string) => {
    console.log(`Template ${_id} would be imported into workspace`)
  }, [])

  const value = useMemo<TemplatesContextValue>(
    () => ({
      templates: TEMPLATES,
      categories: ALL_CATEGORIES,
      categoryLabels: CATEGORY_LABELS,
      search,
      setSearch,
      categoryFilter,
      setCategoryFilter,
      filteredTemplates,
      useTemplate,
    }),
    [search, categoryFilter, filteredTemplates, useTemplate],
  )

  return <TemplatesContext.Provider value={value}>{children}</TemplatesContext.Provider>
}

export function useTemplates(): TemplatesContextValue {
  const ctx = useContext(TemplatesContext)
  if (!ctx) {
    throw new Error("useTemplates must be used within a TemplatesProvider")
  }
  return ctx
}
