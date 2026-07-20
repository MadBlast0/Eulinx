import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type ArtifactKind = "code" | "markdown" | "image" | "document"

export interface Artifact {
  readonly id: string
  readonly title: string
  readonly kind: ArtifactKind
  readonly body: string
  readonly updatedAt: number
}

let counter = 0
function uid(): string {
  counter += 1
  return `artifact-${Date.now().toString(36)}-${counter.toString(36)}`
}

const EMPTY_ARTIFACTS: readonly Artifact[] = []

interface ArtifactsContextValue {
  readonly artifacts: readonly Artifact[]
  addArtifact(kind: ArtifactKind, title: string): void
  removeArtifact(id: string): void
  setArtifacts(artifacts: readonly Artifact[]): void
}

const ArtifactsContext = createContext<ArtifactsContextValue | null>(null)

export function ArtifactsProvider({ children }: { children: ReactNode }) {
  const [artifacts, setArtifacts] = useState<readonly Artifact[]>(EMPTY_ARTIFACTS)

  const addArtifact = useCallback((kind: ArtifactKind, title: string): void => {
    const artifact: Artifact = {
      id: uid(),
      title: title.trim().length > 0 ? title.trim() : `untitled.${kind}`,
      kind,
      body: "",
      updatedAt: Date.now(),
    }
    setArtifacts((prev) => [artifact, ...prev])
  }, [])

  const removeArtifact = useCallback((id: string): void => {
    setArtifacts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const setArtifactsCallback = useCallback((artifacts: readonly Artifact[]): void => {
    setArtifacts(artifacts)
  }, [])

  const value = useMemo<ArtifactsContextValue>(
    () => ({ artifacts, addArtifact, removeArtifact, setArtifacts: setArtifactsCallback }),
    [artifacts, addArtifact, removeArtifact, setArtifactsCallback],
  )

  return <ArtifactsContext.Provider value={value}>{children}</ArtifactsContext.Provider>
}

export function useArtifacts(): ArtifactsContextValue {
  const ctx = useContext(ArtifactsContext)
  if (!ctx) {
    throw new Error("useArtifacts must be used within ArtifactsProvider")
  }
  return ctx
}
