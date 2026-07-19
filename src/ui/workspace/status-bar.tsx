export function StatusBar() {
  return (
    <div
      className="z-20 flex items-center gap-4 border-t border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-panel)] px-4 text-[11px] text-[color:var(--wsx-text-muted)]"
      style={{ height: "var(--wsx-statusbar-h)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--wsx-green)" }} />
      <span>Eulinx v0.1.0</span>
      <span>|</span>
      <span>5 nodes</span>
      <span>|</span>
      <span>4 connections</span>
      <span className="flex-1" />
      <span>pnpm dev · localhost:1420</span>
      <span>|</span>
      <span>main</span>
    </div>
  )
}
