import { useState } from "react"
import { FolderPlus, Folder, Globe, Plus, X } from "lucide-react"
import { appConfigDir } from "@tauri-apps/api/path"
import { isTauri } from "@tauri-apps/api/core"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fsService } from "@/api/services"
import type { ProjectDoc } from "./project-types"

interface AddProjectDialogProps {
  projects: readonly ProjectDoc[]
  onAddProject: () => Promise<void>
  onCreateProject: (name: string, path: string) => void
  trigger?: React.ReactNode
}

export function AddProjectDialog({ projects, onAddProject, onCreateProject, trigger }: AddProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [host, setHost] = useState("local-windows")
  const [cloneUrl, setCloneUrl] = useState("")
  const [showCloneInput, setShowCloneInput] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBrowseFolder = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await onAddProject()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add project")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNewProject = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const name = `Project ${projects.length + 1}`

      if (isTauri()) {
        const appDir = await appConfigDir()
        const projectsDir = `${appDir}eulinx/projects/`
        const projectPath = `${projectsDir}${name}/`

        try {
          await fsService.createDir(projectsDir)
        } catch {
          // Directory might already exist
        }

        await fsService.createDir(projectPath)
        onCreateProject(name, projectPath)
      } else {
        onCreateProject(name, `local:/${name}`)
      }
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloneFromUrl = async () => {
    if (!cloneUrl.trim()) {
      setError("Please enter a valid URL")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const urlParts = cloneUrl.trim().split("/")
      const repoName = urlParts[urlParts.length - 1]?.replace(".git", "") || "cloned-project"

      if (isTauri()) {
        const appDir = await appConfigDir()
        const projectsDir = `${appDir}eulinx/projects/`
        const projectPath = `${projectsDir}${repoName}/`

        try {
          await fsService.createDir(projectsDir)
        } catch {
          // Directory might already exist
        }

        await fsService.createDir(projectPath)
        onCreateProject(repoName, projectPath)
      } else {
        onCreateProject(repoName, `local:/${repoName}`)
      }

      setCloneUrl("")
      setShowCloneInput(false)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clone repository")
    } finally {
      setIsLoading(false)
    }
  }

  const resetDialog = () => {
    setOpen(false)
    setCloneUrl("")
    setShowCloneInput(false)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetDialog()
      setOpen(newOpen)
    }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Add project"
            title="Add project"
            className="h-5 w-5 text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text-secondary)]"
          >
            <FolderPlus className="h-3.5 w-3.5" strokeWidth={2} />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-[580px] gap-0 p-0" showClose={false} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
          <DialogTitle className="text-lg font-semibold">Add a project</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              resetDialog()
            }}
            disabled={isLoading}
            className="h-6 w-6 text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </Button>
        </div>

        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/30 p-3 text-[12px] text-red-500">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-[12px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)] mb-2">
              Host
            </label>
            <Select value={host} onValueChange={setHost} disabled={isLoading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select host" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local-windows">Local Windows</SelectItem>
                <SelectItem value="local-mac">Local Mac</SelectItem>
                <SelectItem value="local-linux">Local Linux</SelectItem>
                <SelectItem value="remote-ssh">Remote (SSH)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void handleBrowseFolder()
            }}
            disabled={isLoading}
            className="w-full flex items-start gap-4 rounded-lg border-2 border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] p-4 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:not-disabled:border-[color:var(--Eulinx-color-info)]/50 hover:not-disabled:bg-[color:var(--Eulinx-color-surface-raised)] focus:outline-none focus:ring-2 focus:ring-[color:var(--Eulinx-color-info)]/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[color:var(--Eulinx-color-info)]/10 flex-shrink-0">
              <Folder className="h-5 w-5 text-[color:var(--Eulinx-color-info)]" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[color:var(--Eulinx-color-text)]">
                Browse folder
              </div>
              <div className="text-[12px] text-[color:var(--Eulinx-color-text-secondary)] mt-1">
                Local project, Git repo, or folder with many repos
              </div>
            </div>
          </button>

          <div className="mt-6 pt-6 border-t border-[color:var(--Eulinx-color-border)]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)] mb-3">
              Other ways to add
            </div>

            <div className="space-y-2">
              <div>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!isLoading) setShowCloneInput(!showCloneInput)
                  }}
                  disabled={isLoading}
                  className="w-full flex items-start gap-3 rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] p-3 text-left transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:not-disabled:bg-[color:var(--Eulinx-color-surface-raised)] focus:outline-none focus:ring-2 focus:ring-[color:var(--Eulinx-color-info)]/30"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--Eulinx-color-surface-raised)] text-[color:var(--Eulinx-color-text-secondary)] flex-shrink-0 mt-0.5">
                    <Globe className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[color:var(--Eulinx-color-text)]">
                      Clone from URL
                    </div>
                    <div className="text-[11px] text-[color:var(--Eulinx-color-text-secondary)]">
                      Clone a remote Git repository
                    </div>
                  </div>
                </button>

                {showCloneInput && (
                  <div className="mt-2 flex gap-2 items-end">
                    <input
                      type="text"
                      placeholder="https://github.com/user/repo.git"
                      value={cloneUrl}
                      onChange={(e) => setCloneUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isLoading) {
                          handleCloneFromUrl()
                        }
                      }}
                      disabled={isLoading}
                      className="flex-1 rounded-md border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-3 py-2 text-[12px] text-[color:var(--Eulinx-color-text)] placeholder-[color:var(--Eulinx-color-text-muted)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--Eulinx-color-info)]/30"
                    />
                    <Button
                      onClick={handleCloneFromUrl}
                      disabled={!cloneUrl.trim() || isLoading}
                      className="h-8 px-3 text-[12px]"
                    >
                      {isLoading ? "Cloning..." : "Clone"}
                    </Button>
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleCreateNewProject()
                }}
                disabled={isLoading}
                className="w-full flex items-start gap-3 rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] p-3 text-left transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:not-disabled:bg-[color:var(--Eulinx-color-surface-raised)] focus:outline-none focus:ring-2 focus:ring-[color:var(--Eulinx-color-info)]/30"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--Eulinx-color-surface-raised)] text-[color:var(--Eulinx-color-text-secondary)] flex-shrink-0 mt-0.5">
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[color:var(--Eulinx-color-text)]">
                    Create new project
                  </div>
                  <div className="text-[11px] text-[color:var(--Eulinx-color-text-secondary)]">
                    Start from an empty folder
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
