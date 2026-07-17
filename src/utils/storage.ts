function isStorageAvailable(): boolean {
  try {
    const key = "__eulinx_storage_test__"
    localStorage.setItem(key, "1")
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function getItem<T>(key: string, fallback: T): T {
  if (!isStorageAvailable()) return fallback

  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback

    const parsed = JSON.parse(raw) as T
    return parsed
  } catch {
    return fallback
  }
}

export function setItem<T>(key: string, value: T): void {
  if (!isStorageAvailable()) return

  try {
    const serialized = JSON.stringify(value)
    localStorage.setItem(key, serialized)
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      console.warn("eulinx: localStorage quota exceeded")
    } else if (err instanceof TypeError) {
      console.warn("eulinx: circular reference in storage value")
    }
  }
}

export function removeItem(key: string): void {
  if (!isStorageAvailable()) return

  try {
    localStorage.removeItem(key)
  } catch {
    /* storage unavailable */
  }
}

export function clear(): void {
  if (!isStorageAvailable()) return

  try {
    localStorage.clear()
  } catch {
    /* storage unavailable */
  }
}
