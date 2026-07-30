import { useMemo, useState, useCallback } from "react"
import { Search, Folder, ArrowRight } from "lucide-react"
import { AppIcon } from "./app-icon"
import { Button } from "@/components/ui/button"
import { useProjects } from "./use-projects"
import { projectStorage } from "./project-storage"
import { AddProjectDialog } from "./add-project-dialog"
import type { ProjectDoc } from "./project-types"

function folderName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "")
  const segment = trimmed.split(/[\\/]/).pop()
  return segment && segment.length > 0 ? segment : trimmed
}

export function WelcomeScreen() {
  const { projects, selectProject, addProject } = useProjects()
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return projects
    const q = search.toLowerCase()
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q),
    )
  }, [projects, search])

  const handleAddProject = useCallback(async (): Promise<void> => {
    const picked = await projectStorage.pickFolder()
    if (picked === null) return
    if (picked.length > 0) {
      addProject(picked, folderName(picked))
      return
    }
    const name = `Project ${projects.length + 1}`
    addProject(`local:/${name}`, name)
  }, [projects.length, addProject])

  const handleOpenProject = useCallback(
    (project: ProjectDoc) => {
      selectProject(project.id)
    },
    [selectProject],
  )

  return (
    <div className="flex flex-1 flex-col bg-[color:var(--Eulinx-color-background)]">
      <div className="flex flex-1 flex-col items-center px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--Eulinx-color-surface)]">
            <AppIcon
              name="projects"
              className="h-7 w-7 text-[color:var(--Eulinx-color-text-muted)]"
              strokeWidth={1.75}
            />
          </div>
          <h1 className="text-xl font-semibold text-[color:var(--Eulinx-color-text)]">
            Welcome to Eulinx
          </h1>
          <p className="mt-1 text-sm text-[color:var(--Eulinx-color-text-muted)]">
            Select a project to get started, or add a new one.
          </p>
        </div>

        {/* Search + Add Project row */}
        <div className="mb-6 flex w-full max-w-md items-center gap-3">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]"
              strokeWidth={2}
            />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] pl-9 pr-3 text-sm text-[color:var(--Eulinx-color-text)] placeholder-[color:var(--Eulinx-color-text-muted)] outline-none transition-colors focus:border-[color:var(--Eulinx-color-info)] focus:ring-1 focus:ring-[color:var(--Eulinx-color-info)]/30"
            />
          </div>
          <AddProjectDialog
            projects={projects}
            onAddProject={handleAddProject}
            onCreateProject={(name, path) => addProject(path, name)}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-2 text-[13px]"
              >
                <AppIcon
                  name="projects"
                  className="h-4 w-4"
                  strokeWidth={2.25}
                />
                Add Project
              </Button>
            }
          />
        </div>

        {/* Project list */}
        <div className="w-full max-w-md">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[color:var(--Eulinx-color-border)] py-16 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--Eulinx-color-surface-alt)]">
                <Folder
                  className="h-5 w-5 text-[color:var(--Eulinx-color-text-muted)]"
                  strokeWidth={2}
                />
              </div>
              <p className="text-sm font-medium text-[color:var(--Eulinx-color-text)]">
                No projects yet
              </p>
              <p className="mt-1 text-xs text-[color:var(--Eulinx-color-text-muted)]">
                Add a project to start working.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-[color:var(--Eulinx-color-text-muted)]">
              No projects match "{search}"
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleOpenProject(project)}
                  className="group flex items-center gap-3 rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-4 py-3 text-left transition-all duration-150 hover:border-[color:var(--Eulinx-color-info)]/40 hover:bg-[color:var(--Eulinx-color-surface-alt)]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--Eulinx-color-surface-alt)] transition-colors group-hover:bg-[color:var(--Eulinx-color-info)]/10">
                    <AppIcon
                      name="projects"
                      className="h-4 w-4 text-[color:var(--Eulinx-color-text-muted)] transition-colors group-hover:text-[color:var(--Eulinx-color-info)]"
                      strokeWidth={2.25}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[color:var(--Eulinx-color-text)] truncate">
                      {project.name}
                    </div>
                    {project.path && !project.path.startsWith("local:") && (
                      <div className="text-xs text-[color:var(--Eulinx-color-text-muted)] truncate">
                        {project.path}
                      </div>
                    )}
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-[color:var(--Eulinx-color-text-muted)] opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-[color:var(--Eulinx-color-info)]"
                    strokeWidth={2}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
