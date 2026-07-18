/**
 * P18-UI-ARTBROWSER — Artifact Browser Surface
 *
 * Browse artifacts: code, patches, documents, images.
 * From ArtifactArchitecture-Part01 through Part06.
 */

import { useRuntimeStore } from "@/stores/runtime-store"

export function ArtifactBrowser() {
  const { artifacts } = useRuntimeStore()
  const artifactList = Object.values(artifacts)

  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold">Artifact Browser</h2>

      {artifactList.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No artifacts yet. Artifacts are produced by Workers and verified before merging.
        </div>
      ) : (
        <div className="space-y-2">
          {artifactList.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <span className="rounded bg-muted px-2 py-0.5 text-xs">{a.kind}</span>
                <span className="font-mono text-sm">{a.id}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{a.size.toLocaleString()} bytes</span>
                <span className={`font-medium ${
                  a.state === "merged" ? "text-green-600" :
                  a.state === "verified" ? "text-blue-600" :
                  a.state === "rejected" ? "text-red-600" : "text-muted-foreground"
                }`}>
                  {a.state}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
