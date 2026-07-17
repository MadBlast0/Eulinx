import * as React from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/utils/cn"
import { useSwipe, useScrollLock, useKeyboard } from "@/hooks"

interface LightboxImage {
  src: string
  alt: string
}

interface LightboxProps {
  images: LightboxImage[]
  initialIndex?: number
  open: boolean
  onClose: () => void
  className?: string
}

const Lightbox = React.forwardRef<HTMLDivElement, LightboxProps>(
  ({ images, initialIndex = 0, open, onClose, className }, ref) => {
    const [index, setIndex] = React.useState(initialIndex)
    const [scale, setScale] = React.useState(1)
    const swipeRef = useSwipe<HTMLDivElement>({
      onSwipeLeft: () => next(),
      onSwipeRight: () => prev(),
    })

    useScrollLock(open)

    React.useEffect(() => {
      if (open) setIndex(initialIndex)
    }, [open, initialIndex])

    React.useEffect(() => {
      setScale(1)
    }, [index])

    useKeyboard("Escape", onClose, { enabled: open })
    useKeyboard("ArrowLeft", () => prev(), { enabled: open })
    useKeyboard("ArrowRight", () => next(), { enabled: open })

    const next = React.useCallback(() => {
      setIndex((p) => (p < images.length - 1 ? p + 1 : p))
    }, [images.length])

    const prev = React.useCallback(() => {
      setIndex((p) => (p > 0 ? p - 1 : p))
    }, [])

    const hasPrev = index > 0
    const hasNext = index < images.length - 1

    if (!open) return null

    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-[100] flex items-center justify-center bg-black/90",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Image lightbox"
        onClick={onClose}
      >
        <div ref={swipeRef as React.RefObject<HTMLDivElement | null>} className="flex h-full w-full items-center justify-center">
          {images[index] && (
            <img
              src={images[index].src}
              alt={images[index].alt}
              className="max-h-[90vh] max-w-[90vw] select-none object-contain transition-transform duration-200"
              style={{ transform: `scale(${scale})` }}
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => {
                e.preventDefault()
                setScale((s) =>
                  Math.max(0.5, Math.min(5, s - e.deltaY * 0.005))
                )
              }}
              draggable={false}
            />
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
          aria-label="Close lightbox"
        >
          <X className="h-6 w-6" />
        </button>

        {hasPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {hasNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
            {index + 1} / {images.length}
          </div>
        )}
      </div>
    )
  }
)
Lightbox.displayName = "Lightbox"

export { Lightbox }
export type { LightboxImage }
