const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "details",
  "summary",
  "[contenteditable]",
].join(", ")

let liveRegion: HTMLDivElement | null = null
let announceTimeout: ReturnType<typeof setTimeout> | null = null

function getLiveRegion(): HTMLDivElement {
  if (!liveRegion) {
    liveRegion = document.createElement("div")
    liveRegion.setAttribute("aria-live", "polite")
    liveRegion.setAttribute("aria-atomic", "true")
    liveRegion.style.cssText =
      "position: absolute; width: 1px; height: 1px; margin: -1px; border: 0; padding: 0; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; word-wrap: normal;"
    document.body.appendChild(liveRegion)
  }
  return liveRegion
}

export function announceToScreenReader(message: string, priority: "polite" | "assertive" = "polite"): void {
  if (typeof document === "undefined") return

  const region = getLiveRegion()
  region.setAttribute("aria-live", priority)

  if (announceTimeout !== null) {
    clearTimeout(announceTimeout)
  }

  region.textContent = ""

  announceTimeout = setTimeout(() => {
    region.textContent = message
    announceTimeout = null
  }, 50)
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  try {
    const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    return Array.from(elements).filter((el) => {
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
  } catch {
    console.warn("eulinx: getFocusableElements failed — invalid container or query")
    return []
  }
}

export function focusFirstElement(container: HTMLElement): void {
  const elements = getFocusableElements(container)
  if (elements.length > 0) {
    elements[0]?.focus()
  }
}

export function focusLastElement(container: HTMLElement): void {
  const elements = getFocusableElements(container)
  if (elements.length > 0) {
    elements[elements.length - 1]?.focus()
  }
}

export function getNextFocusable(current: HTMLElement, container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container)
  const index = elements.indexOf(current)
  if (index === -1 || index >= elements.length - 1) return null
  return elements[index + 1] ?? null
}

export function getPreviousFocusable(current: HTMLElement, container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container)
  const index = elements.indexOf(current)
  if (index <= 0) return null
  return elements[index - 1] ?? null
}
