/**
 * Panels — shared built-in scaffold.
 *
 * A built-in panel is a *view* (Part 01 philosophy): it renders backend truth
 * and records intent, never mutating trusted state. Each built-in below is a
 * minimal, self-contained view with an explicit empty/error state, styled only
 * with `var(--Eulinx-*)` tokens and typography role classes.
 */

import type { ReactNode } from "react"
import { Icon } from "@/ui/icons"
import type { PanelErrorState } from "../panels-registry"

export interface ScaffoldProps {
  readonly icon: string
  readonly title: string
  readonly error: PanelErrorState | null
  readonly empty: boolean
  readonly emptyPrimary: string
  readonly emptySecondary?: string
  readonly children?: ReactNode
}

/** Consistent container padding + typography for every built-in body. */
export function PanelScaffold({
  icon,
  title,
  error,
  empty,
  emptyPrimary,
  emptySecondary,
  children,
}: ScaffoldProps): ReactNode {
  if (error) {
    return (
      <div
        role="alert"
        className="text-role-body"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--Eulinx-space-2)",
          padding: "var(--Eulinx-space-6)",
          height: "100%",
          color: "var(--Eulinx-color-danger)",
          textAlign: "center",
        }}
      >
        <Icon name="status.error" size="lg" label="Error" />
        <span>{error.message}</span>
      </div>
    )
  }

  if (empty) {
    return (
      <div
        className="text-role-body"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--Eulinx-space-1)",
          padding: "var(--Eulinx-space-6)",
          height: "100%",
          color: "var(--Eulinx-color-text-muted)",
          textAlign: "center",
        }}
      >
        <Icon name={icon} size="lg" label={title} />
        <span style={{ color: "var(--Eulinx-color-text-primary)" }}>{emptyPrimary}</span>
        {emptySecondary ? <span className="text-role-caption">{emptySecondary}</span> : null}
      </div>
    )
  }

  return (
    <div
      style={{
        padding: "var(--Eulinx-space-3)",
        height: "100%",
        overflow: "auto",
        color: "var(--Eulinx-color-text-primary)",
      }}
    >
      {children}
    </div>
  )
}
