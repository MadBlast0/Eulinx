import * as React from "react"
import { cn } from "@/utils/cn"
import { FormField } from "@/components/forms/form-field"
import { validateFile } from "@/utils/upload"
import { Upload, X, File } from "lucide-react"

export interface FileUploadProps {
  value?: File | File[]
  onChange: (files: File | File[]) => void
  accept?: string
  multiple?: boolean
  maxSize?: number
  label?: string
  error?: string
  disabled?: boolean
  className?: string
}

const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      value,
      onChange,
      accept,
      multiple = false,
      maxSize,
      label,
      error: externalError,
      disabled,
      className,
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const [isDragging, setIsDragging] = React.useState(false)
    const [internalError, setInternalError] = React.useState<string | null>(null)
    const [fileList, setFileList] = React.useState<File[]>(() => {
      if (!value) return []
      return Array.isArray(value) ? value : [value]
    })

    React.useEffect(() => {
      if (value) {
        setFileList(Array.isArray(value) ? value : [value])
      } else {
        setFileList([])
      }
    }, [value])

    const error = externalError ?? internalError ?? undefined

    const acceptedMimeTypes = accept
      ? accept.split(",").map((t) => t.trim())
      : undefined

    const validateFiles = (files: File[]): File[] => {
      setInternalError(null)
      const validFiles: File[] = []

      for (const file of files) {
        const isValid = validateFile(file, {
          maxSize: maxSize ? maxSize * 1024 * 1024 : undefined,
          acceptedTypes: acceptedMimeTypes,
        })

        if (isValid) {
          validFiles.push(file)
        } else {
          if (maxSize && file.size > maxSize * 1024 * 1024) {
            setInternalError(`File "${file.name}" exceeds ${maxSize}MB size limit`)
          } else if (accept) {
            setInternalError(`File "${file.name}" type is not accepted`)
          }
        }
      }

      return validFiles
    }

    const handleFiles = (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const validFiles = validateFiles(fileArray)
      if (validFiles.length === 0) return

      if (multiple) {
        const newFiles = [...fileList, ...validFiles]
        setFileList(newFiles)
        onChange(newFiles)
      } else {
        const file = validFiles[0]
        if (!file) return
        setFileList([file])
        onChange(file)
      }
    }

    const handleRemove = (index: number) => {
      const newFiles = fileList.filter((_, i) => i !== index)
      setFileList(newFiles)
      setInternalError(null)
      if (multiple) {
        onChange(newFiles)
      } else if (newFiles.length > 0) {
        const file = newFiles[0]
        if (file) onChange(file)
      }
      if (inputRef.current) inputRef.current.value = ""
    }

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      if (!disabled && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    }

    const handleClick = () => {
      inputRef.current?.click()
    }

    const formatSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes}B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    }

    return (
      <FormField
        label={label}
        error={error}
        disabled={disabled}
        className={className}
      >
        <div
          ref={ref}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-md border-2 border-dashed border-input px-4 py-8 transition-colors cursor-pointer",
            "hover:border-muted-foreground/50",
            isDragging && "border-primary bg-primary/5",
            disabled && "cursor-not-allowed opacity-50",
            error && "border-destructive"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            className="sr-only"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files)
              }
            }}
            aria-hidden="true"
          />

          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">
            {isDragging ? "Drop files here" : "Drag & drop or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {accept ? `Accepted: ${accept}` : "All files accepted"}
            {maxSize && ` — Max: ${maxSize}MB`}
          </p>
        </div>

        {fileList.length > 0 && (
          <ul className="mt-2 space-y-1">
            {fileList.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-1.5 text-sm"
              >
                <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatSize(file.size)}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(index)
                    }}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </FormField>
    )
  }
)
FileUpload.displayName = "FileUpload"

export { FileUpload }
