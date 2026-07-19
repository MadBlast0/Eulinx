import { memo, type ReactNode } from "react"
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import { cn } from "@/utils/cn"
import { StateBadge } from "../primitives"
import type { Tone } from "../state"
import { getStateSignal, type WorkerState } from "../a11y/state-signals"
import { getNodeTypeMeta, type EulinxNodeKind } from "./node-types"

export interface CustomNodePort {
  readonly id: string
  readonly position: Position
  readonly type: "source" | "target"
}

export interface CustomNodeData extends Record<string, unknown> {
  readonly kind: EulinxNodeKind
  readonly label: string
  readonly status?: WorkerState
  readonly ports?: readonly CustomNodePort[]
  readonly children?: ReactNode
}

export type CustomNodeType = Node<CustomNodeData, "eulinx">

const DEFAULT_PORTS: readonly CustomNodePort[] = [
  { id: "in", position: Position.Top, type: "target" },
  { id: "out", position: Position.Bottom, type: "source" },
]

function CustomNodeImpl({ data, selected }: NodeProps<CustomNodeType>) {
  const meta = getNodeTypeMeta(data.kind)
  const IconComp = meta.icon
  const ports = data.ports ?? DEFAULT_PORTS
  const signal = data.status ? getStateSignal(data.status) : null

  return (
    <div
      className={cn(
        "flex min-w-[160px] max-w-[280px] select-none overflow-hidden rounded-[var(--Eulinx-radius-lg)] border bg-[color:var(--Eulinx-color-surface)] transition-colors",
        selected
          ? "border-[color:var(--Eulinx-color-accent)] ring-1 ring-[color:var(--Eulinx-color-ring)]"
          : "border-[color:var(--Eulinx-color-border)] hover:border-[color:var(--Eulinx-color-border-strong)]",
      )}
      style={{
        boxShadow: selected
          ? "var(--Eulinx-elev-md)"
          : "var(--Eulinx-elev-sm)",
      }}
    >
      {ports.map((port) => (
        <Handle
          key={port.id}
          id={port.id}
          type={port.type}
          position={port.position}
          className="!h-2 !w-2 !border !border-[color:var(--Eulinx-color-border-strong)] !bg-[color:var(--Eulinx-color-surface)]"
        />
      ))}

      <div
        className="w-[3px] shrink-0"
        style={{ background: meta.accentVar }}
        aria-hidden="true"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-toolbar)] px-3 py-2 text-xs font-medium">
          <span
            className="flex h-4 w-4 items-center justify-center"
            style={{ color: meta.accentVar }}
          >
            <IconComp className="h-3.5 w-3.5" strokeWidth={1.5} />
          </span>
          <span
            title={data.label}
            className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[color:var(--Eulinx-color-text)]"
          >
            {data.label}
          </span>
        </div>

        {(signal || data.children) && (
          <div className="flex min-h-[36px] flex-col gap-2 px-3 py-2 text-xs text-[color:var(--Eulinx-color-text-secondary)]">
            {signal && (
              <StateBadge tone={signal.tone as Tone} className="self-start">
                <signal.icon className="h-3 w-3" strokeWidth={1.5} />
                {signal.label}
              </StateBadge>
            )}
            {data.children}
          </div>
        )}
      </div>
    </div>
  )
}

export const CustomNode = memo(CustomNodeImpl)
