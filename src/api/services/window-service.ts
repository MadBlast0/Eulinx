/**
 * P15-API-WINDOW — windowService
 *
 * Window chrome operations. Routes to Tauri's window plugin commands in
 * native mode; falls back to browser Fullscreen API / window.close() in
 * the dev server so the buttons are actually usable during development.
 */

import { isTauri } from "@tauri-apps/api/core"
import { call } from "../transport"

function isFullscreen(): boolean {
  return !!document.fullscreenElement
}

export const windowService = {
  close(): void {
    if (isTauri()) {
      void call("plugin:window|close")
    } else {
      window.close()
    }
  },

  minimize(): void {
    if (isTauri()) {
      void call("plugin:window|minimize")
    }
  },

  toggleMaximize(): void {
    if (isTauri()) {
      void call("plugin:window|toggle_maximize")
    } else {
      void (isFullscreen()
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen())
    }
  },
} as const

export type WindowService = typeof windowService
