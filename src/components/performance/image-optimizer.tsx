import * as React from "react"
import { cn } from "@/utils/cn"

interface ImageOptimizerProps {
  src: string
  alt: string
  sizes?: string
  width?: number
  height?: number
  quality?: number
  format?: "webp" | "avif" | "auto"
  lazy?: boolean
  placeholder?: "blur" | "empty"
  className?: string
  priority?: boolean
}

const BREAKPOINTS = [640, 768, 1024, 1280, 1536]
const DEFAULT_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"

function generateSrcSet(src: string, _imgWidth: number, q: number): string {
  return BREAKPOINTS.map(
    (w) =>
      `${src}?w=${w}&q=${q} ${w}w`
  ).join(", ")
}

function ImageOptimizer({
  src,
  alt,
  sizes,
  width,
  height,
  quality = 75,
  format: _format,
  lazy = true,
  placeholder = "empty",
  className,
  priority = false,
}: ImageOptimizerProps) {
  const [loaded, setLoaded] = React.useState(false)
  const [error, setError] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)
  const [blurVisible, setBlurVisible] = React.useState(placeholder === "blur")

  const imgSizes = sizes ?? DEFAULT_SIZES
  const srcSet = React.useMemo(
    () => generateSrcSet(src, width ?? 1200, quality),
    [src, width, quality]
  )

  function handleLoad() {
    setLoaded(true)
    setBlurVisible(false)
  }

  function handleError() {
    setError(true)
    setBlurVisible(false)
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 opacity-50"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    )
  }

  return (
    <div
      className={cn("relative overflow-hidden bg-muted", className)}
      style={{ width, height }}
    >
      {blurVisible && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-xl scale-110"
          style={{ backgroundImage: `url(${src})` }}
          aria-hidden="true"
        />
      )}

      <img
        ref={imgRef}
        src={src}
        alt={alt}
        srcSet={srcSet}
        sizes={imgSizes}
        width={width}
        height={height}
        loading={priority ? "eager" : lazy ? "lazy" : "eager"}
        decoding={priority ? "sync" : "async"}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          placeholder === "blur" && !loaded ? "opacity-0" : "opacity-100"
        )}
      />
    </div>
  )
}

export { ImageOptimizer }
export type { ImageOptimizerProps }
