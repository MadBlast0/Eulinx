export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    console.warn("eulinx: clipboard writeText failed, trying fallback")
  }

  return copyToClipboardFallback(text)
}

export async function readFromClipboard(): Promise<string | null> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
      const text = await navigator.clipboard.readText()
      return text
    }
  } catch {
    console.warn("eulinx: clipboard readText failed (permission denied or unavailable)")
  }
  return null
}

export function copyToClipboardFallback(text: string): boolean {
  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    textarea.style.pointerEvents = "none"
    textarea.style.left = "-9999px"
    textarea.style.top = "-9999px"
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()

    let success = false
    try {
      success = document.execCommand("copy")
    } catch {
      console.warn("eulinx: execCommand copy failed")
      success = false
    }

    document.body.removeChild(textarea)
    return success
  } catch {
    console.warn("eulinx: clipboard fallback mechanism failed")
    return false
  }
}
