/**
 * P15-API-DIALOG — dialogService
 *
 * Wraps native file dialogs (open, save) via the DialogManager trait.
 * Falls back to browser-native file input/download in non-Tauri environments.
 */

import { call } from "../transport"

export const dialogService = {
  openFile(filter?: string): Promise<string | null> {
    return call<string | null>("dialog_open_file", { filter })
  },

  saveFile(defaultName: string): Promise<string | null> {
    return call<string | null>("dialog_save_file", { defaultName })
  },
} as const

export type DialogService = typeof dialogService
