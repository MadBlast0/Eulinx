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

const SEED_ARTIFACTS: readonly Artifact[] = [
  {
    id: uid(),
    title: "onboarding.md",
    kind: "markdown",
    body: "# Onboarding\n\nWelcome to Eulinx. This artifact is seed data for the canvas surface.",
    updatedAt: Date.now() - 1000 * 60 * 60 * 3,
  },
  {
    id: uid(),
    title: "summarizer.ts",
    kind: "code",
    body: 'export function summarize(text: string): string {\n  return text.slice(0, 280)\n}',
    updatedAt: Date.now() - 1000 * 60 * 60 * 26,
  },
  {
    id: uid(),
    title: "spec-draft.md",
    kind: "markdown",
    body: "## Spec\n\nDesign notes for the registry-driven canvas.",
    updatedAt: Date.now() - 1000 * 60 * 12,
  },
]

interface ArtifactsContextValue {
  readonly artifacts: readonly Artifact[]
  addArtifact(kind: ArtifactKind, title: string): void
  removeArtifact(id: string): void
}

const ArtifactsContext = createContext<ArtifactsContextValue | null>(null)

export function ArtifactsProvider({ children }: { children: ReactNode }) {
  const [artifacts, setArtifacts] = useState<readonly Artifact[]>(SEED_ARTIFACTS)

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

  const value = useMemo<ArtifactsContextValue>(
    () => ({ artifacts, addArtifact, removeArtifact }),
    [artifacts, addArtifact, removeArtifact],
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
