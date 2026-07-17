type NetworkSubscriber = (online: boolean) => void

let networkSubscribers: Set<NetworkSubscriber> | null = null

function getNetworkType(): string | undefined {
  try {
    const connection = (navigator as { connection?: { effectiveType?: string } }).connection
    return connection?.effectiveType
  } catch {
    return undefined
  }
}

export function getNetworkStatus(): { online: boolean; type?: string } {
  return {
    online: navigator.onLine,
    type: getNetworkType(),
  }
}

function notifyNetworkSubscribers(online: boolean): void {
  if (!networkSubscribers) return
  for (const cb of networkSubscribers) {
    try {
      cb(online)
    } catch {
      /* swallow */
    }
  }
}

export function subscribeNetworkStatus(cb: (online: boolean) => void): () => void {
  if (!networkSubscribers) {
    networkSubscribers = new Set()
    window.addEventListener("online", () => notifyNetworkSubscribers(true), { passive: true })
    window.addEventListener("offline", () => notifyNetworkSubscribers(false), { passive: true })
  }

  networkSubscribers.add(cb)

  try {
    cb(navigator.onLine)
  } catch {
    /* swallow */
  }

  return () => {
    if (!networkSubscribers) return
    networkSubscribers.delete(cb)
    if (networkSubscribers.size === 0) {
      window.removeEventListener("online", () => notifyNetworkSubscribers(true))
      window.removeEventListener("offline", () => notifyNetworkSubscribers(false))
      networkSubscribers = null
    }
  }
}
