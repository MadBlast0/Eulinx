import { useEffect } from "react"
import "./workspace.css"
import { WorkspaceProvider, useWorkspace } from "./use-workspace"
import { TopBar } from "./top-bar"
import { LeftSidebar } from "./left-sidebar"
import { Canvas } from "./canvas"
import { BottomPanel } from "./bottom-panel"
import { RightSidebar } from "./right-sidebar"
import { StatusBar } from "./status-bar"
import { Overlays } from "./overlays"

function WorkspaceShell() {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    setOverlay,
    selectedId,
    removeNode,
  } = useWorkspace()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOverlay("cmd")
        return
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        if (selectedId) {
          e.preventDefault()
          removeNode(selectedId)
        }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [setOverlay, selectedId, removeNode])

  const cols = [
    leftSidebarOpen ? "var(--wsx-left-w)" : "0px",
    "1fr",
    rightSidebarOpen ? "var(--wsx-right-w)" : "0px",
  ].join(" ")

  return (
    <div
      className="wsx grid"
      style={{
        gridTemplateColumns: cols,
        gridTemplateRows: "var(--wsx-topbar-h) 1fr var(--wsx-statusbar-h)",
        gridTemplateAreas: `"topbar topbar topbar" "left center right" "status status status"`,
        height: "100vh",
      }}
    >
      <div style={{ gridArea: "topbar" }}>
        <TopBar />
      </div>

      <div style={{ gridArea: "left", overflow: "hidden" }}>
        {leftSidebarOpen && <LeftSidebar />}
      </div>

      <div
        style={{ gridArea: "center" }}
        className="flex flex-col overflow-hidden"
      >
        <Canvas />
        <BottomPanel />
      </div>

      <div style={{ gridArea: "right", overflow: "hidden" }}>
        {rightSidebarOpen && <RightSidebar />}
      </div>

      <div style={{ gridArea: "status" }}>
        <StatusBar />
      </div>

      <Overlays />
    </div>
  )
}

export function WorkspaceApp() {
  return (
    <WorkspaceProvider>
      <WorkspaceShell />
    </WorkspaceProvider>
  )
}
