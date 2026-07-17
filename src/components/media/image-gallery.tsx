import * as React from "react"
import { cn } from "@/utils/cn"
import { Image } from "./image"

interface GalleryImage {
  src: string
  alt: string
  thumbnail?: string
}

interface ImageGalleryProps {
  images: GalleryImage[]
  columns?: number | { sm?: number; md?: number; lg?: number }
  gap?: "sm" | "md" | "lg"
  lightbox?: boolean
  onImageClick?: (index: number) => void
  className?: string
}

const gapMap: Record<string, string> = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
}

function getColumnsClass(columns: number | { sm?: number; md?: number; lg?: number }): string {
  if (typeof columns === "number") {
    return `grid-cols-${Math.min(columns, 6)}`
  }
  const parts: string[] = []
  if (columns.sm) parts.push(`grid-cols-${columns.sm}`)
  if (columns.md) parts.push(`md:grid-cols-${columns.md}`)
  if (columns.lg) parts.push(`lg:grid-cols-${columns.lg}`)
  if (parts.length === 0) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
  return parts.join(" ")
}

const ImageGallery = React.forwardRef<HTMLDivElement, ImageGalleryProps>(
  (
    {
      images,
      columns = { sm: 2, md: 3, lg: 4 },
      gap = "md",
      lightbox = true,
      onImageClick,
      className,
    },
    ref
  ) => {
    const cols = getColumnsClass(columns)

    return (
      <div
        ref={ref}
        className={cn("grid", cols, gapMap[gap], className)}
      >
        {images.map((img, i) => (
          <button
            key={`${img.src}-${i}`}
            type="button"
            className={cn(
              "group relative overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              lightbox || onImageClick ? "cursor-pointer" : "cursor-default"
            )}
            onClick={() => {
              if (lightbox || onImageClick) onImageClick?.(i)
            }}
            tabIndex={0}
          >
            <Image
              src={img.thumbnail ?? img.src}
              alt={img.alt}
              className="aspect-square h-full w-full transition-transform duration-200 group-hover:scale-105"
              objectFit="cover"
            />
          </button>
        ))}
      </div>
    )
  }
)
ImageGallery.displayName = "ImageGallery"

export { ImageGallery }
export type { GalleryImage }
