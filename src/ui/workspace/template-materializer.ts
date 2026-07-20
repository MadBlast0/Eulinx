/**
 * P11-TEMPLATE — Template Materializer
 *
 * Turns a gallery `Template` into real workspace artifacts. Kept free of React
 * and DOM so it can be unit-tested directly. Each template produces a small,
 * coherent set of starter files keyed to its capabilities.
 */

import type { ArtifactManager } from "@/artifact/artifact-manager"
import type { ArtifactId } from "@/core/types"
import type { Template } from "@/ui/workspace/templates-store"

// ---------------------------------------------------------------------------
// File blueprint produced for a template
// ---------------------------------------------------------------------------

export interface TemplateFileBlueprint {
  readonly filename: string
  readonly content: string
}

const BLUEPRINTS: Record<string, readonly TemplateFileBlueprint[]> = {
  "code-review": [
    {
      filename: "code-review/prompt.md",
      content:
        "# Code Review Assistant\n\nReviews pull requests: analyzes quality, suggests improvements, flags bugs.\n\n## Steps\n1. Fetch the PR diff.\n2. Analyze for bugs and style issues.\n3. Post a structured review comment.\n",
    },
  ],
  "research-synth": [
    {
      filename: "research/synthesis.md",
      content:
        "# Research Synthesizer\n\nSummarize papers into structured notes: findings, methodology, conclusions.\n",
    },
  ],
  "build-pipeline": [
    {
      filename: "ci/build.sh",
      content: "#!/usr/bin/env bash\nset -euo pipefail\npnpm install\npnpm build\npnpm test\n",
    },
  ],
  "doc-writer": [
    {
      filename: "docs/README.md",
      content:
        "# Documentation Writer\n\nGenerates API docs and READMEs from source code.\n",
    },
  ],
  "bug-hunter": [
    {
      filename: "debug/plan.md",
      content:
        "# Bug Hunter\n\n1. Reproduce from the stack trace.\n2. Locate the faulty pattern.\n3. Propose a minimal fix.\n",
    },
  ],
  "meeting-notes": [
    {
      filename: "notes/meeting.md",
      content:
        "# Meeting Notes\n\nTranscribe + summarize. Action items, decisions, discussion points.\n",
    },
  ],
  "qa-automation": [
    {
      filename: "qa/run-tests.sh",
      content: "#!/usr/bin/env bash\nset -euo pipefail\npnpm test --reporter=json > report.json\n",
    },
  ],
  "data-analyzer": [
    {
      filename: "data/analyze.py",
      content:
        "import pandas as pd\n\ndf = pd.read_csv('input.csv')\nprint(df.describe())\n",
    },
  ],
}

/** Build the file blueprints for a given template (fallback: a single note). */
export function blueprintForTemplate(template: Template): readonly TemplateFileBlueprint[] {
  return (
    BLUEPRINTS[template.id] ?? [
      {
        filename: `${template.id}/README.md`,
        content: `# ${template.title}\n\n${template.description}\n`,
      },
    ]
  )
}

export interface MaterializeResult {
  readonly artifactIds: readonly ArtifactId[]
  readonly filenames: readonly string[]
}

/**
 * Create one artifact per blueprint file in the workspace via the
 * ArtifactManager. Returns the created artifact ids and filenames.
 */
export function materializeTemplate(
  template: Template,
  artifactManager: ArtifactManager,
): MaterializeResult {
  const blueprints = blueprintForTemplate(template)
  const artifactIds: ArtifactId[] = []
  const filenames: string[] = []

  for (const blueprint of blueprints) {
    const created = artifactManager.create({
      workspaceId: artifactManager.workspaceId,
      kind: "file",
      title: blueprint.filename,
      description: `Imported from template: ${template.title}`,
      content: blueprint.content,
      contentType: "text/markdown",
      tags: ["template", template.id, ...template.tags],
      metadata: { templateId: template.id, source: "template_gallery" },
    })
    artifactIds.push(created.artifact.id)
    filenames.push(blueprint.filename)
  }

  return { artifactIds, filenames }
}
