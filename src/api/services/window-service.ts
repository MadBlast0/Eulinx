/**
 * P15-API-WINDOW — windowService
 *
 * Window chrome operations. These route to Tauri's window plugin commands;
 * in the browser they are no-ops. This replaces the direct `invoke` calls that
 * previously lived in `top-bar.tsx`.
 */

import { isTauri } from "@tauri-apps/api/core"
import { call } from "../transport"

export const windowService = {
  close(): void {
    if (isTauri()) void call("plugin:window|close")
  },

  minimize(): void {
    if (isTauri()) void call("plugin:window|minimize")
  },

  toggleMaximize(): void {
    if (isTauri()) void call("plugin:window|toggle_maximize")
  },
} as const

export type WindowService = typeof windowService
