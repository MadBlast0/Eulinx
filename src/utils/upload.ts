export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
    reader.readAsText(file)
  })
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
    reader.readAsDataURL(file)
  })
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
    reader.readAsArrayBuffer(file)
  })
}

export interface FileValidationOptions {
  maxSize?: number
  acceptedTypes?: string[]
}

export function validateFile(file: File, options: FileValidationOptions): boolean {
  if (options.maxSize !== undefined && file.size > options.maxSize) {
    return false
  }

  if (options.acceptedTypes !== undefined && options.acceptedTypes.length > 0) {
    const fileType = file.type.toLowerCase()
    const extension = file.name.split(".").pop()?.toLowerCase() ?? ""

    return options.acceptedTypes.some((accepted) => {
      const lower = accepted.toLowerCase()
      if (lower.startsWith(".")) {
        return extension === lower.slice(1)
      }
      if (lower.endsWith("/*")) {
        const prefix = lower.slice(0, -1)
        return fileType.startsWith(prefix)
      }
      return fileType === lower
    })
  }

  return true
}
