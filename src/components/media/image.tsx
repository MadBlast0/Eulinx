import * as React from "react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/utils/cn"
import { Skeleton } from "@/components/ui/skeleton"

interface ImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  fallback?: string
  className?: string
  objectFit?: "cover" | "contain" | "fill"
  onLoad?: () => void
  onError?: () => void
}

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  (
    {
      src,
      alt,
      width,
      height,
      fill = false,
      priority = false,
      fallback,
      objectFit = "cover",
      className,
      onLoad,
      onError,
      ...props
    },
    ref
  ) => {
    const [status, setStatus] = React.useState<"loading" | "loaded" | "error">(
      "loading"
    )
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
      setMounted(true)
    }, [])

    const imgRef = React.useRef<HTMLImageElement | null>(null)
    const mergedRef = React.useCallback(
      (node: HTMLImageElement | null) => {
        imgRef.current = node
        if (typeof ref === "function") ref(node)
        else if (ref) ref.current = node
      },
      [ref]
    )

    const handleLoad = React.useCallback(() => {
      setStatus("loaded")
      onLoad?.()
    }, [onLoad])

    const handleError = React.useCallback(() => {
      setStatus("error")
      onError?.()
    }, [onError])

    const showSkeleton = status === "loading" && mounted
    const showFallbackImg = status === "error" && fallback
    const showErrorIcon = status === "error" && !fallback

    return (
      <div
        className={cn(
          "relative inline-flex overflow-hidden",
          fill ? "h-full w-full" : undefined,
          className
        )}
        style={
          !fill && width && height
            ? { width, height }
            : !fill
              ? undefined
              : undefined
        }
      >
        {showSkeleton && (
          <Skeleton
            variant="rectangular"
            className={cn("absolute inset-0", fill ? "h-full w-full" : undefined)}
            style={
              !fill && width && height
                ? { width, height }
                : undefined
            }
          />
        )}

        {showErrorIcon && (
          <div className="flex h-full w-full items-center justify-center rounded-md bg-muted">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        {(status !== "error" || showFallbackImg) && (
          <img
            ref={mergedRef}
            src={showFallbackImg ? fallback : src}
            alt={alt}
            width={!fill ? width : undefined}
            height={!fill ? height : undefined}
            loading={priority ? "eager" : "lazy"}
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              "rounded-md",
              fill && "h-full w-full",
              objectFit === "cover" && "object-cover",
              objectFit === "contain" && "object-contain",
              objectFit === "fill" && "object-fill",
              status === "loading" && "invisible"
            )}
            {...props}
          />
        )}
      </div>
    )
  }
)
Image.displayName = "Image"

export { Image }
