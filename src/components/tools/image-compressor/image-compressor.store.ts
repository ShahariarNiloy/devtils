import { create } from "zustand";
import type { CompressionError } from "./image-compressor.errors";
import { createDefaultSettings } from "./image-compressor.lib";
import type {
  CompressionResult,
  CompressionSettings,
  FileStatus,
  ImageFile,
  QualityMode,
} from "./image-compressor.types";

export type SortMode = "upload" | "name" | "size-desc" | "savings-desc";

/**
 * Single Zustand store for the image compressor.
 *
 * Replaces the previous `useReducer` + manually-synced `stateRef` pattern:
 * because `set` is synchronous, `useCompressorStore.getState()` always
 * returns the live state inside worker callbacks, drag handlers, and the
 * queue loop — no ref to keep in sync, and no render-lag race (that's why
 * the old `pendingFilesRef` double-drop guard is gone). Components
 * subscribe to slices via the `useCompressorStore(selector)` hook.
 *
 * The actions below are 1:1 ports of the old reducer cases — same state
 * transitions, just expressed as `set((s) => …)` updaters.
 */

export function mergeSettings(
  current: CompressionSettings,
  patch: Partial<CompressionSettings>,
): CompressionSettings {
  return {
    ...current,
    ...patch,
    resize: patch.resize
      ? { ...current.resize, ...patch.resize }
      : current.resize,
  };
}

interface CompressorState {
  files: ImageFile[];
  expandedFileId: string | null;
  globalSettings: CompressionSettings;
  sortMode: SortMode;

  // ── Actions (ported from the old reducer) ──
  appendFiles: (files: ImageFile[]) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  setExpanded: (id: string | null) => void;
  updateSettings: (id: string, settings: Partial<CompressionSettings>) => void;
  setGlobalSettings: (settings: CompressionSettings) => void;
  resetSettings: (id: string) => void;
  bulkQuality: (mode: QualityMode) => void;
  setDisplayName: (id: string, displayName: string | null) => void;
  setSortMode: (mode: SortMode) => void;
  markPending: (ids: string[]) => void;
  setStatus: (id: string, status: FileStatus) => void;
  setResult: (
    id: string,
    result: CompressionResult,
    settingsUsed: CompressionSettings,
  ) => void;
  setError: (id: string, error: CompressionError) => void;
  setHasIcc: (id: string, hasIcc: boolean) => void;
  /** Discard all state — used on unmount to match the old per-mount hook. */
  reset: () => void;
}

function freshState() {
  return {
    files: [] as ImageFile[],
    expandedFileId: null as string | null,
    globalSettings: createDefaultSettings(),
    sortMode: "upload" as SortMode,
  };
}

export const useCompressorStore = create<CompressorState>((set) => ({
  ...freshState(),

  appendFiles: (files) =>
    set((s) => ({ files: [...s.files, ...files] })),

  removeFile: (id) =>
    set((s) => ({
      files: s.files.filter((f) => f.id !== id),
      expandedFileId: s.expandedFileId === id ? null : s.expandedFileId,
    })),

  clearAll: () => set({ files: [], expandedFileId: null }),

  setExpanded: (id) => set({ expandedFileId: id }),

  updateSettings: (id, settings) =>
    set((s) => ({
      files: s.files.map((f) =>
        f.id === id
          ? {
              ...f,
              settings: mergeSettings(f.settings, settings),
              settingsDirty: f.result !== null,
              // Explicit per-file edit — protect this file from
              // subsequent global Settings drawer pushes.
              settingsTouched: true,
            }
          : f,
      ),
    })),

  setGlobalSettings: (settings) =>
    set((s) => ({
      // Only propagate to files the user hasn't customized. Touched
      // files keep their per-file settings — that's the contract of
      // "click a row to override the global".
      files: s.files.map((f) =>
        f.settingsTouched
          ? f
          : { ...f, settings, settingsDirty: f.result !== null },
      ),
      globalSettings: settings,
    })),

  resetSettings: (id) =>
    set((s) => ({
      // Drop a file's per-file overrides and snap it back to the current
      // global settings. Marked dirty (when there's a result) so the user
      // can re-compress under the restored global settings.
      files: s.files.map((f) =>
        f.id === id
          ? {
              ...f,
              settings: s.globalSettings,
              settingsTouched: false,
              settingsDirty: f.result !== null,
            }
          : f,
      ),
    })),

  bulkQuality: (mode) =>
    set((s) => ({
      // "Set all to <mode>" is an explicit per-file action — set
      // settingsTouched so the file participates in global-override
      // protection just like a manual edit would.
      files: s.files.map((f) => ({
        ...f,
        settings: mergeSettings(f.settings, { qualityMode: mode }),
        settingsDirty: f.result !== null,
        settingsTouched: true,
      })),
    })),

  setDisplayName: (id, displayName) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, displayName } : f)),
    })),

  setSortMode: (mode) => set({ sortMode: mode }),

  markPending: (ids) =>
    set((s) => {
      const idSet = new Set(ids);
      return {
        files: s.files.map((f) =>
          idSet.has(f.id)
            ? { ...f, status: "idle" as const, error: null, settingsDirty: false }
            : f,
        ),
      };
    }),

  setStatus: (id, status) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, status } : f)),
    })),

  setResult: (id, result, settingsUsed) =>
    set((s) => {
      // Was this file's first successful result? Used below to decide
      // whether to auto-expand the row (only for the single-file case).
      const target = s.files.find((f) => f.id === id);
      const isFirstResultForFile = target?.result === null;

      const files = s.files.map((f) => {
        if (f.id !== id) return f;
        // If settings changed between compression start and completion,
        // the result no longer matches current settings — mark dirty so
        // the user knows they need to re-trigger. Reference equality is
        // sufficient because every settings update returns a new object
        // from mergeSettings().
        const stillFresh = f.settings === settingsUsed;
        return {
          ...f,
          status: "done" as const,
          result,
          error: null,
          settingsDirty: !stillFresh,
        };
      });

      // Onboarding hint: when the *first uploaded file* finishes its
      // first compression and the user hasn't opened anything yet,
      // auto-expand it so the Edit & Preview panel is visible without
      // needing to discover the button. We gate on `files[0]` (not
      // "whichever file finishes first") so batch uploads don't pop open
      // an arbitrary winner-of-the-race row.
      let expandedFileId = s.expandedFileId;
      if (
        isFirstResultForFile &&
        s.files.length > 0 &&
        s.files[0].id === id &&
        s.expandedFileId === null
      ) {
        expandedFileId = id;
      }

      return { files, expandedFileId };
    }),

  setError: (id, error) =>
    set((s) => ({
      files: s.files.map((f) =>
        f.id === id ? { ...f, status: "error" as const, error } : f,
      ),
    })),

  setHasIcc: (id, hasIcc) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, hasIcc } : f)),
    })),

  reset: () => set(freshState()),
}));
