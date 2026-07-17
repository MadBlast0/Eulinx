import * as React from "react"
import { cn } from "@/utils/cn"
import { useViewportContext } from "@/providers/ViewportProvider"
import { useScrollLock } from "@/hooks/useScrollLock"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { X } from "lucide-react"

type ModalSize = "sm" | "md" | "lg" | "xl" | "full"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: ModalSize
  preventScroll?: boolean
  closeOnEscape?: boolean
  closeOnOutsideClick?: boolean
  className?: string
}

const sizeWidthMap: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  full: "sm:max-w-[calc(100vw-2rem)] sm:max-h-[calc(100vh-2rem)]",
}

function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  preventScroll = true,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  className,
}: ModalProps) {
  const viewport = useViewportContext()
  const isMobile = viewport.isMobile
  const contentRef = React.useRef<HTMLDivElement>(null)

  useScrollLock(open && (preventScroll ?? true))
  useFocusTrap(contentRef as React.RefObject<HTMLElement | null>, open)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogPortal>
        <DialogOverlay
          onClick={closeOnOutsideClick ? undefined : (e) => e.preventDefault()}
        />
        <DialogContent
          ref={contentRef}
          onEscapeKeyDown={closeOnEscape ? undefined : (e) => e.preventDefault()}
          showClose={false}
          className={cn(
            "flex flex-col gap-0 p-0",
            isMobile
              ? "fixed inset-0 z-50 max-w-none rounded-none border-0 sm:max-w-none"
              : sizeWidthMap[size],
            className
          )}
        >
          <DialogHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
            <div className="flex-1">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1">{description}</DialogDescription>
              )}
            </div>
            <DialogClose
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

Modal.displayName = "Modal"

export { Modal }
export type { ModalProps, ModalSize }
