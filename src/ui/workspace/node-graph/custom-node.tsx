import { memo, type ReactNode } from "react"
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import { cn } from "@/utils/cn"
import { StateBadge } from "../primitives"
import type { Tone } from "../state"
import { getStateSignal, type WorkerState } from "../a11y/state-signals"
import { getNodeTypeMeta, type EulinxNodeKind } from "./node-types"
import { TONE_FG } from "../state"

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
  { id: "in", position: Position.Left, type: "target" },
  { id: "out", position: Position.Right, type: "source" },
]

function CustomNodeImpl({ data, selected }: NodeProps<CustomNodeType>) {
  const meta = getNodeTypeMeta(data.kind)
  const IconComp = meta.icon
  const ports = data.ports ?? DEFAULT_PORTS
  const signal = data.status ? getStateSignal(data.status) : null

  return (
    <div
      className={cn(
        "flex w-[260px] min-w-[220px] max-w-[420px] select-none flex-col rounded-[var(--Eulinx-radius-lg)] border bg-[color:var(--Eulinx-color-surface)] p-4 transition-[border-color,box-shadow] duration-[160ms]",
        selected
          ? "border-[color:var(--Eulinx-color-accent)] shadow-[0_0_0_1px_var(--Eulinx-color-accent)]"
          : "border-[color:var(--Eulinx-color-border)] hover:border-[color:var(--Eulinx-color-border-strong)]",
      )}
    >
      {ports.map((port) => (
        <Handle
          key={port.id}
          id={port.id}
          type={port.type}
          position={port.position}
          className="!h-2.5 !w-2.5 !border-2 !border-[color:var(--Eulinx-color-border)] !bg-[color:var(--Eulinx-color-surface)] hover:!border-[color:var(--Eulinx-color-accent)] hover:!bg-[color:var(--Eulinx-color-accent)]"
        />
      ))}

      <div className="flex cursor-grab items-center gap-2">
        <span
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)]"
          style={{ color: meta.accentVar }}
        >
          <IconComp className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
        <span
          title={data.label}
          className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-[color:var(--Eulinx-color-text)]"
        >
          {data.label}
        </span>
        {signal && (
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{
              background: TONE_FG[signal.tone as Tone],
              boxShadow: `0 0 6px ${TONE_FG[signal.tone as Tone]}`,
            }}
            title={signal.label}
          />
        )}
      </div>

      {(signal || data.children) && (
        <div className="mt-2.5 flex min-h-[36px] flex-col gap-2 text-xs text-[color:var(--Eulinx-color-text-secondary)]">
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
  )
}

export const CustomNode = memo(CustomNodeImpl)
