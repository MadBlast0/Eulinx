/**
 * Custom Eulinx icons (Icons-Part01 §Definition: source "Eulinx").
 *
 * These are Eulinx-authored glyphs that Lucide does not provide. They are
 * authored on the SAME 24x24 grid with a 2px optical stroke as Lucide, so they
 * are indistinguishable from library icons next to each other in a dense list
 * (Icons-Part02 §The 24 Grid). They use `currentColor` only — no hardcoded
 * color — so they theme correctly in light and dark.
 *
 * The Icons spec describes a vite-plugin-svgr build pipeline that turns
 * `src/ui/icons/Eulinx/*.svg?react` into components. This module provides the
 * equivalent React components directly so the "Eulinx" render path works
 * without touching the build config (which is out of this task's scope). If the
 * SVGR pipeline is enabled later, each component below can be replaced by its
 * generated `*.svg?react` import; the registry key stays the same.
 *
 * To ADD a custom Eulinx icon:
 *   1. Author a 24x24 SVG with `fill="none" stroke="currentColor"`
 *      `stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`.
 *   2. Add a component here named `Eulinx<Name>` returning that <svg>.
 *   3. Add a registry entry with `key: "domain.whatever"`
 *      and `lucideName: "Eulinx<Name>"` (the registry treats a name not in
 *      LUCIDE_COMPONENTS as a custom component lookup here).
 *   4. Ensure the glyph is distinct from every other entry (assertDistinct-
 *      LucideNames checks lucide names; custom names live in this module and
 *      must also be unique).
 */

import type { ReactElement, SVGProps } from "react";

export type EulinxIconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

export const EulinxArtifactStack = ((props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    shapeRendering="geometricPrecision"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
    <path d="M3 12.5 12 17l9-4.5" />
    <path d="M3 17.5 12 22l9-4.5" />
  </svg>
)) as EulinxIconComponent;

export const EulinxWorkflowOrchestrator = ((props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    shapeRendering="geometricPrecision"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <circle cx="5" cy="6" r="2" />
    <circle cx="5" cy="18" r="2" />
    <circle cx="19" cy="12" r="2" />
    <path d="M7 6h5a3 3 0 0 1 3 3v0M7 18h5a3 3 0 0 0 3-3v0" />
  </svg>
)) as EulinxIconComponent;

export const EulinxMemoryCell = ((props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    shapeRendering="geometricPrecision"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 8v8M12 8v8M17 8v8" />
  </svg>
)) as EulinxIconComponent;

/** All custom Eulinx components, keyed by the name used in the registry. */
export const EULINX_COMPONENTS = {
  EulinxArtifactStack,
  EulinxWorkflowOrchestrator,
  EulinxMemoryCell,
} as const;

export type EulinxIconName = keyof typeof EULINX_COMPONENTS;
