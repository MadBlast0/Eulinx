/**
 * P15-API-WINDOW — windowService
 *
 * Window chrome operations. Routes to Tauri's window plugin commands in
 * native mode; falls back to browser Fullscreen API / window.close() in
 * the dev server so the buttons are actually usable during development.
 */

import { isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { call } from "../transport"

function isFullscreen(): boolean {
  return !!document.fullscreenElement
}

export const windowService = {
  async drag(): Promise<void> {
    if (isTauri()) {
      await getCurrentWindow().startDragging()
    }
  },

  async close(): Promise<void> {
    if (isTauri()) {
      await call("plugin:window|close")
    } else {
      window.close()
    }
  },

  async minimize(): Promise<void> {
    if (isTauri()) {
      await call("plugin:window|minimize")
    }
  },

  async toggleMaximize(): Promise<void> {
    if (isTauri()) {
      await call("plugin:window|toggle_maximize")
    } else {
      void (isFullscreen()
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen())
    }
  },

  async isMaximized(): Promise<boolean> {
    if (isTauri()) {
      return getCurrentWindow().isMaximized()
    }
    return isFullscreen()
  },
} as const

export type WindowService = typeof windowService
