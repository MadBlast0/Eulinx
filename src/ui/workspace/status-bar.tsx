import { GitBranch, Cpu, MemoryStick } from "lucide-react"

function StatusItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-full cursor-default items-center gap-1.5 px-2 text-[11px] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]">
      {children}
    </span>
  )
}

export function StatusBar() {
  return (
    <div
      className="z-20 flex items-center border-t border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-toolbar)] text-[11px] text-[color:var(--Eulinx-color-text-muted)]"
      style={{ height: "var(--wsx-statusbar-h)" }}
    >
      <StatusItem>
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--Eulinx-color-success)]" />
        Connected
      </StatusItem>
      <StatusItem>
        <GitBranch className="h-3 w-3" strokeWidth={1.5} />
        Personal / Eulinx
      </StatusItem>
      <StatusItem>
        <GitBranch className="h-3 w-3" strokeWidth={1.5} />
        main · ↑2 ↓0
      </StatusItem>
      <StatusItem>5 nodes</StatusItem>
      <span className="flex-1" />
      <StatusItem>100%</StatusItem>
      <StatusItem>
        <Cpu className="h-3 w-3" strokeWidth={1.5} />
        CPU 12%
      </StatusItem>
      <StatusItem>
        <MemoryStick className="h-3 w-3" strokeWidth={1.5} />
        MEM 3.1 GB
      </StatusItem>
      <StatusItem>--:--</StatusItem>
    </div>
  )
}
