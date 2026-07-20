function isStorageAvailable(): boolean {
  try {
    const key = "__eulinx_storage_test__"
    localStorage.setItem(key, "1")
    localStorage.removeItem(key)
    return true
  } catch {
    // localStorage unavailable (e.g. incognito, SSR) — expected, not an error
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
    console.warn("eulinx: failed to parse stored value for key '" + key + "', using fallback")
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
    } else {
      console.warn("eulinx: failed to set localStorage item '" + key + "'", err)
    }
  }
}

export function removeItem(key: string): void {
  if (!isStorageAvailable()) return

  try {
    localStorage.removeItem(key)
  } catch {
    console.warn("eulinx: failed to remove localStorage item '" + key + "'")
  }
}

export function clear(): void {
  if (!isStorageAvailable()) return

  try {
    localStorage.clear()
  } catch {
    console.warn("eulinx: failed to clear localStorage")
  }
}
