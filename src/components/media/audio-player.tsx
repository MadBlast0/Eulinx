import * as React from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react"
import { cn } from "@/utils/cn"

interface AudioPlayerProps {
  src: string
  title?: string
  autoPlay?: boolean
  loop?: boolean
  className?: string
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

const AudioPlayer = React.forwardRef<HTMLDivElement, AudioPlayerProps>(
  ({ src, title, autoPlay = false, loop = false, className }, ref) => {
    const audioRef = React.useRef<HTMLAudioElement | null>(null)
    const [playing, setPlaying] = React.useState(autoPlay)
    const [loading, setLoading] = React.useState(true)
    const [currentTime, setCurrentTime] = React.useState(0)
    const [duration, setDuration] = React.useState(0)
    const [muted, setMuted] = React.useState(false)
    const [volume, setVolume] = React.useState(1)

    React.useEffect(() => {
      const audio = audioRef.current
      if (!audio) return

      const onTimeUpdate = () => setCurrentTime(audio.currentTime)
      const onLoadedMetadata = () => {
        setDuration(audio.duration)
        setLoading(false)
      }
      const onEnded = () => {
        setPlaying(false)
        setCurrentTime(0)
      }
      const onCanPlay = () => setLoading(false)

      audio.addEventListener("timeupdate", onTimeUpdate)
      audio.addEventListener("loadedmetadata", onLoadedMetadata)
      audio.addEventListener("ended", onEnded)
      audio.addEventListener("canplay", onCanPlay)

      if (autoPlay) {
        audio.play().catch(() => setPlaying(false))
      }

      return () => {
        audio.removeEventListener("timeupdate", onTimeUpdate)
        audio.removeEventListener("loadedmetadata", onLoadedMetadata)
        audio.removeEventListener("ended", onEnded)
        audio.removeEventListener("canplay", onCanPlay)
      }
    }, [autoPlay])

    const togglePlay = React.useCallback(() => {
      const audio = audioRef.current
      if (!audio) return
      if (audio.paused) {
        audio.play().catch(() => {})
        setPlaying(true)
      } else {
        audio.pause()
        setPlaying(false)
      }
    }, [])

    const handleSeek = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value)
        if (audioRef.current) {
          audioRef.current.currentTime = time
        }
        setCurrentTime(time)
      },
      []
    )

    const handleVolumeChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = Number(e.target.value)
        setVolume(vol)
        if (audioRef.current) {
          audioRef.current.volume = vol
          audioRef.current.muted = vol === 0
        }
        if (vol === 0) setMuted(true)
        else setMuted(false)
      },
      []
    )

    const toggleMute = React.useCallback(() => {
      if (audioRef.current) {
        audioRef.current.muted = !audioRef.current.muted
        setMuted((p) => !p)
      }
    }, [])

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3 rounded-lg border bg-card p-3 text-sm",
          className
        )}
      >
        <audio
          ref={audioRef}
          src={src}
          loop={loop}
          preload="metadata"
        />

        <button
          type="button"
          onClick={togglePlay}
          disabled={loading}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          aria-label={playing ? "Pause" : "Play"}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>

        {title && (
          <span className="min-w-0 truncate text-xs text-muted-foreground max-w-[100px]">
            {title}
          </span>
        )}

        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {formatTime(currentTime)}
        </span>

        <div className="relative flex flex-1 items-center">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
            aria-label="Seek"
          />
          <div
            className="pointer-events-none absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatTime(duration)}
        </span>

        <button
          type="button"
          onClick={toggleMute}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-accent hover:text-accent-foreground"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
          aria-label="Volume"
        />
      </div>
    )
  }
)
AudioPlayer.displayName = "AudioPlayer"

export { AudioPlayer }
