import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Z_INDEX } from "@/constants"

export interface ModalOptions {
  closeOnEscape?: boolean
  closeOnBackdrop?: boolean
  preventScroll?: boolean
}

interface ModalEntry {
  id: string
  component: React.ReactNode
  options?: ModalOptions
}

interface ModalContextValue {
  open: (id: string, component: React.ReactNode, options?: ModalOptions) => void
  close: (id: string) => void
  closeAll: () => void
  isOpen: (id: string) => boolean
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = useState<ModalEntry[]>([])
  const modalsRef = useRef<ModalEntry[]>(modals)
  const prevOverflowRef = useRef<string>("")

  modalsRef.current = modals

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Escape") return
    setModals((prev) => {
      if (prev.length === 0) return prev
      const last = prev.slice(-1)[0]
      if (last === undefined) return prev
      if (last.options?.closeOnEscape !== false) {
        return prev.slice(0, -1)
      }
      return prev
    })
  }, [])

  useEffect(() => {
    if (modals.length === 0) return

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [modals.length, handleKeyDown])

  useEffect(() => {
    if (modals.length === 0) {
      document.body.style.overflow = prevOverflowRef.current
      return
    }

    const last = modals.slice(-1)[0]
    if (last === undefined) return
    if (last.options?.preventScroll !== false) {
      prevOverflowRef.current = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prevOverflowRef.current
      }
    }
  }, [modals])

  const open = useCallback((id: string, component: React.ReactNode, options?: ModalOptions) => {
    setModals((prev) => [...prev, { id, component, options }])
  }, [])

  const close = useCallback((id: string) => {
    setModals((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const closeAll = useCallback(() => {
    setModals([])
  }, [])

  const isOpen = useCallback((id: string): boolean => {
    return modalsRef.current.some((m) => m.id === id)
  }, [])

  return (
    <ModalContext.Provider value={{ open, close, closeAll, isOpen }}>
      {children}
      {modals.length > 0 &&
        createPortal(
          modals.map((modal, index) => (
            <div
              key={modal.id}
              onClick={(e) => {
                if (e.target === e.currentTarget && modal.options?.closeOnBackdrop !== false) {
                  close(modal.id)
                }
              }}
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: Z_INDEX.modal + index,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 0, 0, 0.5)",
              }}
            >
              {modal.component}
            </div>
          )),
          document.body,
        )}
    </ModalContext.Provider>
  )
}

export function useModalContext(): ModalContextValue {
  const ctx = useContext(ModalContext)
  if (ctx === null) {
    throw new Error("useModalContext must be used within a ModalProvider")
  }
  return ctx
}
