import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { projectStorage } from "./project-storage"
import type {
  CanvasView,
  CanvasViewKind,
  GraphEdge,
  GraphNode,
  NodeGraphDoc,
  ProjectDoc,
  WorkspaceDoc,
} from "./project-types"
import type { EulinxNodeKind } from "./node-graph/node-types"

let idCounter = 0
function uid(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`
}

export function createNodeGraphDoc(name: string): NodeGraphDoc {
  const id = uid("graph")
  return { id, name, nodes: [], edges: [], updatedAt: Date.now() }
}

export function createDefaultViews(): { views: CanvasView[]; graphs: Record<string, NodeGraphDoc> } {
  const graph = createNodeGraphDoc("Main Graph")
  const main: CanvasView = { id: uid("view"), kind: "node-graph", name: graph.name, graphId: graph.id }
  return {
    views: [main],
    graphs: { [graph.id]: graph },
  }
}

export function createProjectDoc(name: string, path: string): ProjectDoc {
  const { views, graphs } = createDefaultViews()
  return { id: uid("project"), name, path, views, graphs }
}

export function DEFAULT_SEEDED_WORKSPACE(): WorkspaceDoc {
  const project = createProjectDoc("Eulinx", "")
  return { version: 1, projects: [project], activeProjectId: project.id }
}

interface ProjectsContextValue {
  readonly workspace: WorkspaceDoc
  readonly projects: readonly ProjectDoc[]
  readonly activeProjectId: string | undefined
  readonly activeProject: ProjectDoc | null
  readonly activeView: CanvasView | null
  readonly graph: NodeGraphDoc | null

  selectProject(id: string): void
  addProject(path: string, name: string): string
  removeProject(id: string): void

  selectView(viewId: string): void
  addView(kind: CanvasViewKind, name: string): void
  removeView(viewId: string): void

  setGraphNodes(nodes: GraphNode[]): void
  setGraphEdges(edges: GraphEdge[]): void
  addNode(node: GraphNode): void
  removeNode(nodeId: string): void
  moveNode(nodeId: string, x: number, y: number): void
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null)

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceDoc>(() => DEFAULT_SEEDED_WORKSPACE())
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    void projectStorage.loadWorkspace().then((doc) => {
      if (cancelled) return
      if (doc && doc.projects.length > 0) {
        setWorkspace(doc)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback((doc: WorkspaceDoc): void => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void projectStorage.saveWorkspace(doc)
    }, 300)
  }, [])

  const commit = useCallback(
    (updater: (prev: WorkspaceDoc) => WorkspaceDoc): void => {
      setWorkspace((prev) => {
        const next = updater(prev)
        persist(next)
        return next
      })
    },
    [persist],
  )

  const activeProject = useMemo<ProjectDoc | null>(() => {
    return (
      workspace.projects.find((p) => p.id === workspace.activeProjectId) ??
      workspace.projects[0] ??
      null
    )
  }, [workspace.projects, workspace.activeProjectId])

  const activeView = useMemo<CanvasView | null>(() => {
    if (!activeProject) return null
    return (
      activeProject.views.find((v) => v.id === activeProject.activeViewId) ??
      null
    )
  }, [activeProject])

  const graph = useMemo<NodeGraphDoc | null>(() => {
    if (!activeProject || !activeView || activeView.kind !== "node-graph" || !activeView.graphId) {
      return null
    }
    return activeProject.graphs?.[activeView.graphId] ?? null
  }, [activeProject, activeView])

  const selectProject = useCallback(
    (id: string): void => {
      commit((prev) => ({
        ...prev,
        activeProjectId: id,
        projects: prev.projects.map((p) =>
          p.id === id ? { ...p, activeViewId: undefined } : p,
        ),
      }))
    },
    [commit],
  )

  const addProject = useCallback(
    (path: string, name: string): string => {
      const doc = createProjectDoc(name, path)
      commit((prev) => ({ ...prev, projects: [...prev.projects, doc], activeProjectId: doc.id }))
      return doc.id
    },
    [commit],
  )

  const removeProject = useCallback(
    (id: string): void => {
      commit((prev) => {
        const projects = prev.projects.filter((p) => p.id !== id)
        const activeProjectId =
          prev.activeProjectId === id ? projects[0]?.id : prev.activeProjectId
        return { ...prev, projects, activeProjectId }
      })
    },
    [commit],
  )

  const selectView = useCallback(
    (viewId: string): void => {
      commit((prev) => {
        const owner = prev.projects.find((p) => p.views.some((v) => v.id === viewId))
        if (!owner) return prev
        return {
          ...prev,
          activeProjectId: owner.id,
          projects: prev.projects.map((p) => {
            if (p.id === owner.id) return { ...p, activeViewId: viewId }
            if (p.id === prev.activeProjectId) return { ...p, activeViewId: undefined }
            return p
          }),
        }
      })
    },
    [commit],
  )

  const addView = useCallback(
    (kind: CanvasViewKind, name: string): void => {
      commit((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== prev.activeProjectId) return p
          const view: CanvasView = { id: uid("view"), kind, name }
          const graphs = { ...(p.graphs ?? {}) }
          if (kind === "node-graph") {
            const g = createNodeGraphDoc(name)
            view.graphId = g.id
            graphs[g.id] = g
          }
          return { ...p, views: [...p.views, view], activeViewId: view.id, graphs }
        }),
      }))
    },
    [commit],
  )

  const removeView = useCallback(
    (viewId: string): void => {
      commit((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== prev.activeProjectId) return p
          const removed = p.views.find((v) => v.id === viewId)
          const views = p.views.filter((v) => v.id !== viewId)
          const graphs = { ...(p.graphs ?? {}) }
          if (removed?.graphId) { const { [removed.graphId]: _, ...rest } = graphs; Object.assign(graphs, rest) }
          const activeViewId =
            p.activeViewId === viewId ? views[0]?.id : p.activeViewId
          return { ...p, views, graphs, activeViewId }
        }),
      }))
    },
    [commit],
  )

  const withActiveGraph = useCallback(
    (mutate: (g: NodeGraphDoc) => NodeGraphDoc): void => {
      if (!activeView || activeView.kind !== "node-graph" || !activeView.graphId) return
      const graphId = activeView.graphId
      commit((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== prev.activeProjectId || !p.graphs?.[graphId]) return p
          const nextGraph = mutate(p.graphs[graphId])
          return { ...p, graphs: { ...p.graphs, [graphId]: nextGraph } }
        }),
      }))
    },
    [commit, activeView],
  )

  const setGraphNodes = useCallback(
    (nodes: GraphNode[]): void => {
      withActiveGraph((g) => ({ ...g, nodes, updatedAt: Date.now() }))
    },
    [withActiveGraph],
  )

  const setGraphEdges = useCallback(
    (edges: GraphEdge[]): void => {
      withActiveGraph((g) => ({ ...g, edges, updatedAt: Date.now() }))
    },
    [withActiveGraph],
  )

  const addNode = useCallback(
    (node: GraphNode): void => {
      withActiveGraph((g) => ({ ...g, nodes: [...g.nodes, node], updatedAt: Date.now() }))
    },
    [withActiveGraph],
  )

  const removeNode = useCallback(
    (nodeId: string): void => {
      withActiveGraph((g) => ({
        ...g,
        nodes: g.nodes.filter((n) => n.id !== nodeId),
        edges: g.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
        updatedAt: Date.now(),
      }))
    },
    [withActiveGraph],
  )

  const moveNode = useCallback(
    (nodeId: string, x: number, y: number): void => {
      withActiveGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
        updatedAt: Date.now(),
      }))
    },
    [withActiveGraph],
  )

  const value = useMemo<ProjectsContextValue>(
    () => ({
      workspace,
      projects: workspace.projects,
      activeProjectId: workspace.activeProjectId,
      activeProject,
      activeView,
      graph,
      selectProject,
      addProject,
      removeProject,
      selectView,
      addView,
      removeView,
      setGraphNodes,
      setGraphEdges,
      addNode,
      removeNode,
      moveNode,
    }),
    [
      workspace,
      activeProject,
      activeView,
      graph,
      selectProject,
      addProject,
      removeProject,
      selectView,
      addView,
      removeView,
      setGraphNodes,
      setGraphEdges,
      addNode,
      removeNode,
      moveNode,
    ],
  )

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext)
  if (!ctx) {
    throw new Error("useProjects must be used within ProjectsProvider")
  }
  return ctx
}

export type { EulinxNodeKind }
