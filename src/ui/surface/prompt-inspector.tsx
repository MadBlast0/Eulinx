/**
 * P18-UI-PROMPTINSPECT — Prompt Inspector Surface
 *
 * Inspect and manage prompts: templates, profiles, cache.
 * From PromptOptimization-Part01 through Part06.
 */

export function PromptInspector() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold">Prompt Inspector</h2>

      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Inspect prompt templates, profiles, and optimization metrics.
      </div>
    </div>
  )
}
