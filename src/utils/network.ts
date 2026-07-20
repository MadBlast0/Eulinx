type NetworkSubscriber = (online: boolean) => void

let networkSubscribers: Set<NetworkSubscriber> | null = null

function getNetworkType(): string | undefined {
  try {
    const connection = (navigator as { connection?: { effectiveType?: string } }).connection
    return connection?.effectiveType
  } catch {
    console.warn('eulinx: failed to read network connection type')
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
      console.warn('eulinx: network subscriber threw during notification')
    }
  }
}

export function subscribeNetworkStatus(cb: (online: boolean) => void): () => void {
  if (!networkSubscribers) {
    networkSubscribers = new Set()
    window.addEventListener('online', () => notifyNetworkSubscribers(true), { passive: true })
    window.addEventListener('offline', () => notifyNetworkSubscribers(false), { passive: true })
  }

  networkSubscribers.add(cb)

  try {
    cb(navigator.onLine)
  } catch {
    console.warn('eulinx: network subscriber threw during initial callback')
  }

  return () => {
    if (!networkSubscribers) return
    networkSubscribers.delete(cb)
    if (networkSubscribers.size === 0) {
      window.removeEventListener('online', () => notifyNetworkSubscribers(true))
      window.removeEventListener('offline', () => notifyNetworkSubscribers(false))
      networkSubscribers = null
    }
  }
}

