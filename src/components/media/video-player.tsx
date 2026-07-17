import * as React from "react"
import { Play, Loader2 } from "lucide-react"
import { cn } from "@/utils/cn"
import { Skeleton } from "@/components/ui/skeleton"

interface VideoPlayerProps {
  src: string
  poster?: string
  controls?: boolean
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  width?: number | string
  height?: number | string
  className?: string
  onEnded?: () => void
}

const VideoPlayer = React.forwardRef<HTMLVideoElement, VideoPlayerProps>(
  (
    {
      src,
      poster,
      controls = true,
      autoPlay = false,
      loop = false,
      muted = false,
      width,
      height,
      className,
      onEnded,
    },
    ref
  ) => {
    const videoRef = React.useRef<HTMLVideoElement | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [showOverlay, setShowOverlay] = React.useState(!autoPlay)

    const handleRef = React.useCallback(
      (node: HTMLVideoElement | null) => {
        videoRef.current = node
        if (typeof ref === "function") ref(node)
        else if (ref) ref.current = node
      },
      [ref]
    )

    const handlePlay = React.useCallback(() => {
      setShowOverlay(false)
      videoRef.current?.play()
    }, [])

    const handlePause = React.useCallback(() => {
      if (!controls) setShowOverlay(true)
    }, [controls])

    const handleClick = React.useCallback(() => {
      if (controls) return
      const video = videoRef.current
      if (!video) return
      if (video.paused) {
        video.play()
        setShowOverlay(false)
      } else {
        video.pause()
        setShowOverlay(true)
      }
    }, [controls])

    return (
      <div
        className={cn(
          "group relative inline-flex overflow-hidden rounded-lg bg-black",
          className
        )}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: typeof height === "number" ? `${height}px` : height,
        }}
      >
        {loading && (
          <Skeleton
            variant="rectangular"
            className="absolute inset-0 z-10 h-full w-full"
          />
        )}

        <video
          ref={handleRef}
          src={src}
          poster={poster}
          controls={controls}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          className="h-full w-full object-contain"
          onLoadedData={() => setLoading(false)}
          onEnded={onEnded}
          onPause={handlePause}
          onClick={handleClick}
        />

        {!controls && showOverlay && (
          <button
            type="button"
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity hover:bg-black/30"
            aria-label="Play video"
          >
            {loading ? (
              <Loader2 className="h-12 w-12 animate-spin text-white" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <Play className="ml-0.5 h-8 w-8 text-foreground" />
              </div>
            )}
          </button>
        )}

        {!controls && !showOverlay && loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          </div>
        )}
      </div>
    )
  }
)
VideoPlayer.displayName = "VideoPlayer"

export { VideoPlayer }
