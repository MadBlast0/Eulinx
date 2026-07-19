import { ContextMenu } from "./context-menu"
import { NodeGraph } from "./node-graph"
import { useWorkspace } from "./use-workspace"

export function Canvas() {
  const { openContextMenu } = useWorkspace()

  return (
    <div
      className="relative flex-1 overflow-hidden bg-[color:var(--Eulinx-color-background)]"
      onContextMenu={(e) => {
        e.preventDefault()
        openContextMenu({ x: e.clientX, y: e.clientY })
      }}
    >
      <NodeGraph />
      <ContextMenu />
    </div>
  )
}
