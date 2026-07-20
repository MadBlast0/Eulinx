/**
 * P15-API-FS — fsService
 *
 * Wraps the native FS bridge (`fs_read_text`, `fs_write_text`, `fs_exists`,
 * `fs_list_dir`) and the native folder picker (`dialog_pick_folder`). All paths
 * are scoped by the active workspace root on the caller side. This is the single
 * gateway for filesystem access (FrontendAPI-Part01 §Service Modules).
 */

import { call } from "../transport"

export interface FileEntry {
  readonly name: string
  readonly path: string
  readonly isDir: boolean
  readonly size?: number
}

export interface RawFileEntry {
  readonly name: string
  readonly path: string
  readonly is_dir: boolean
  readonly size: number | null
}

export const fsService = {
  readText(path: string): Promise<string> {
    return call<string>("fs_read_text", { path })
  },

  writeText(path: string, contents: string): Promise<void> {
    return call<void>("fs_write_text", { path, contents })
  },

  exists(path: string): Promise<boolean> {
    return call<boolean>("fs_exists", { path })
  },

  listDir(path: string): Promise<FileEntry[]> {
    return call<RawFileEntry[]>("fs_list_dir", { path }).then((raw) =>
      raw.map((e) => ({
        name: e.name,
        path: e.path,
        isDir: e.is_dir,
        size: e.size ?? undefined,
      })),
    )
  },

  pickFolder(): Promise<string | null> {
    return call<string | null>("dialog_pick_folder")
  },
} as const

export type FsService = typeof fsService
