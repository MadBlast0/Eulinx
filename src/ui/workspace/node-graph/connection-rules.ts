import type { EulinxNodeKind } from "./node-types"
import type { EdgeKind } from "../types"

/** Node kinds that cannot have incoming edges */
const NO_INCOMING: readonly EulinxNodeKind[] = [
  "input", "webhook_trigger", "schedule_trigger",
]

/** Node kinds that cannot have outgoing edges */
const NO_OUTGOING: readonly EulinxNodeKind[] = [
  "output",
]

/** Validate whether a connection is allowed */
export function validateConnection(
  sourceKind: EulinxNodeKind,
  targetKind: EulinxNodeKind,
): { valid: boolean; reason?: string } {
  // Triggers and input cannot receive incoming edges
  if (NO_INCOMING.includes(targetKind)) {
    return { valid: false, reason: `${targetKind} nodes cannot receive incoming connections` }
  }

  // Output cannot have outgoing edges
  if (NO_OUTGOING.includes(sourceKind)) {
    return { valid: false, reason: `${sourceKind} nodes cannot have outgoing connections` }
  }

  // Output cannot connect to output
  if (sourceKind === "output" && targetKind === "output") {
    return { valid: false, reason: "Cannot connect output to output" }
  }

  return { valid: true }
}

/** Get the default edge kind for a connection between two node kinds */
export function getDefaultEdgeKind(
  sourceKind: EulinxNodeKind,
  targetKind: EulinxNodeKind,
): EdgeKind {
  // Trigger -> input = control
  if (sourceKind === "webhook_trigger" || sourceKind === "schedule_trigger") return "control"

  // Builder -> Verifier = artifact
  if (sourceKind === "builder" && targetKind === "verifier") return "artifact"

  // Memory connections = memory
  if (sourceKind === "memory" || targetKind === "memory") return "memory"

  // Loop back edges
  if (targetKind === "loop") return "loop_back"

  // Default = control
  return "control"
}
