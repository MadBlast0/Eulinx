import { useState, useCallback } from "react"
import { getItem, setItem } from "@/utils/storage"

type SetValue<T> = T | ((prev: T) => T)

function isFunctionalUpdate<T>(value: SetValue<T>): value is (prev: T) => T {
  return typeof value === "function"
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => getItem(key, initialValue))

  const setValue = useCallback(
    (value: SetValue<T>) => {
      setStoredValue((prev) => {
        const nextValue = isFunctionalUpdate(value) ? value(prev) : value
        setItem(key, nextValue)
        return nextValue
      })
    },
    [key]
  )

  return [storedValue, setValue]
}
