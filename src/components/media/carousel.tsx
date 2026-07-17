import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/utils/cn"
import { useSwipe } from "@/hooks"

interface CarouselProps {
  items: React.ReactNode[]
  autoPlay?: boolean
  interval?: number
  showArrows?: boolean
  showDots?: boolean
  infinite?: boolean
  className?: string
}

const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  (
    {
      items,
      autoPlay = false,
      interval = 4000,
      showArrows = true,
      showDots = true,
      infinite = true,
      className,
    },
    ref
  ) => {
    const [current, setCurrent] = React.useState(0)
    const [paused, setPaused] = React.useState(false)
    const containerRef = useSwipe<HTMLDivElement>({
      onSwipeLeft: () => next(),
      onSwipeRight: () => prev(),
    })

    const total = items.length

    const next = React.useCallback(() => {
      setCurrent((p) => (p >= total - 1 ? (infinite ? 0 : p) : p + 1))
    }, [total, infinite])

    const prev = React.useCallback(() => {
      setCurrent((p) => (p <= 0 ? (infinite ? total - 1 : p) : p - 1))
    }, [total, infinite])

    React.useEffect(() => {
      if (!autoPlay || paused || total <= 1) return
      const id = setInterval(next, interval)
      return () => clearInterval(id)
    }, [autoPlay, paused, total, interval, next])

    if (total === 0) return null

    return (
      <div
        ref={(node) => {
          if (typeof ref === "function") ref(node)
          else if (ref) ref.current = node;
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        className={cn("relative overflow-hidden", className)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        role="region"
        aria-roledescription="carousel"
        aria-label="Image carousel"
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="min-w-0 shrink-0 basis-full"
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${i + 1} of ${total}`}
            >
              {item}
            </div>
          ))}
        </div>

        {showArrows && total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 text-foreground shadow transition-opacity hover:bg-background"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 text-foreground shadow transition-opacity hover:bg-background"
              aria-label="Next slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {showDots && total > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === current
                    ? "w-6 bg-primary"
                    : "w-2 bg-background/60 hover:bg-background/80"
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
)
Carousel.displayName = "Carousel"

export { Carousel }
