import { useState, useCallback } from "react"

export interface DisclosureState {
  open: boolean
  onOpen: () => void
  onClose: () => void
  onToggle: () => void
}

export function useDisclosure(initial = false): DisclosureState {
  const [open, setOpen] = useState(initial)

  const onOpen = useCallback(() => setOpen(true), [])
  const onClose = useCallback(() => setOpen(false), [])
  const onToggle = useCallback(() => setOpen((prev) => !prev), [])

  return { open, onOpen, onClose, onToggle }
}
