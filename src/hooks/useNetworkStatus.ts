import { useEffect, useState } from "react"
import { getNetworkStatus, subscribeNetworkStatus } from "@/utils/network"

export function useNetworkStatus(): { online: boolean; type?: string } {
  const [status, setStatus] = useState(getNetworkStatus)

  useEffect(() => {
    const unsubscribe = subscribeNetworkStatus((online) => {
      setStatus((prev) => ({ ...prev, online }))
    })

    const connection = (navigator as { connection?: EventTarget }).connection

    const handleConnectionChange = () => {
      setStatus(getNetworkStatus())
    }

    if (connection) {
      connection.addEventListener("change", handleConnectionChange)
    }

    return () => {
      unsubscribe()
      if (connection) {
        connection.removeEventListener("change", handleConnectionChange)
      }
    }
  }, [])

  return status
}
