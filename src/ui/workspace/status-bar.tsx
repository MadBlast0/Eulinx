import { Dot } from "./primitives"

function StatusItem({ children }: { children: React.ReactNode }) {
  return <span className="shrink-0">{children}</span>
}

export function StatusBar() {
  const sep = <span className="text-[color:var(--Eulinx-color-text-muted)] opacity-40">|</span>

  return (
    <div
      className="z-20 flex items-center gap-3 border-t border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-toolbar)] px-4 text-[11px] text-[color:var(--Eulinx-color-text-muted)]"
      style={{ height: "var(--wsx-statusbar-h)" }}
    >
      <StatusItem>
        <span className="flex items-center gap-1.5">
          <Dot tone="success" />
          <span className="text-[color:var(--Eulinx-color-text-secondary)]">Eulinx v0.1.0</span>
        </span>
      </StatusItem>
      {sep}
      <StatusItem>
        <span className="flex items-center gap-1.5">
          <Dot tone="accent" />
          5 nodes
        </span>
      </StatusItem>
      {sep}
      <StatusItem>
        <span className="flex items-center gap-1.5">
          <Dot tone="info" />
          4 connections
        </span>
      </StatusItem>
      <span className="flex-1" />
      <StatusItem>
        <span className="flex items-center gap-1.5">
          <Dot tone="success" />
          pnpm dev · localhost:1420
        </span>
      </StatusItem>
      {sep}
      <StatusItem>
        <span className="flex items-center gap-1.5">
          <Dot tone="warning" />
          main
        </span>
      </StatusItem>
    </div>
  )
}
