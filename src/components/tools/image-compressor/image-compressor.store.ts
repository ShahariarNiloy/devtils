import { create } from "zustand";
import type { CompressionError } from "./image-compressor.errors";
import { createDefaultSettings } from "./image-compressor.lib";
import { effectiveSettings } from "./image-compressor.overrides";
import type {
  CandidateSummary,
  CompressionResult,
  CompressionSettings,
  FileStatus,
  ImageFile,
  OutputFormat,
} from "./image-compressor.types";

/**
 * A settings change should re-run a file that already has a result *or*
 * that failed / was cancelled — new settings (resize, another format) are
 * often exactly what fixes a failure, and there's otherwise no way back.
 */
const needsRerun = (f: ImageFile): boolean => f.result !== null || f.status === "error";

/** "Show what changed" map for one result. */
export type DiffState =
  | { status: "loading"; result: CompressionResult }
  | { status: "ready"; result: CompressionResult; url: string; width: number; height: number; mean: number; changedShare: number }
  | { status: "error"; result: CompressionResult };

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
  /** Settings the files are compressed with ("applied"). */
  globalSettings: CompressionSettings;
  /** What the settings column shows. Equal to globalSettings while
   *  "Update automatically" is on; ahead of it until Compress when off. */
  draftSettings: CompressionSettings;
  autoUpdate: boolean;
  diffs: Record<string, DiffState>;
  /** "Apply to all images" next to the format bars (session only). */
  convertAll: boolean;
  /** Manual mode: a global Format pick is pending and will clear the
   *  per-image overrides when applied. */
  pendingFormatReset: boolean;

  // ── Actions ──
  appendFiles: (files: ImageFile[]) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  setExpanded: (id: string | null) => void;
  /** Edit the settings column; applies at once while autoUpdate is on. */
  editSettings: (patch: Partial<CompressionSettings>) => void;
  /** Give one image its own format (null = follow the global one). */
  setFormatOverride: (id: string, override: OutputFormat | null) => void;
  /** Clear every per-image format (they follow the global Format). */
  clearFormatOverrides: () => void;
  /** Undo a clear: restore id → format. */
  restoreFormatOverrides: (overrides: ReadonlyMap<string, OutputFormat>) => void;
  setConvertAll: (on: boolean) => void;
  /** Apply the draft (the "Compress N images" button). */
  applyDraft: () => void;
  setAutoUpdate: (on: boolean) => void;
  setGlobalSettings: (settings: CompressionSettings) => void;
  setDisplayName: (id: string, displayName: string | null) => void;
  setProbes: (id: string, probes: { key: string; candidates: CandidateSummary[] }) => void;
  setDiff: (id: string, diff: DiffState | null) => void;
  markPending: (ids: string[]) => void;
  setStatus: (id: string, status: FileStatus) => void;
  setResult: (
    id: string,
    result: CompressionResult,
    settingsUsed: CompressionSettings,
  ) => void;
  setError: (id: string, error: CompressionError) => void;
  setHasIcc: (id: string, hasIcc: boolean) => void;
  /** ICC presence + EXIF facts from the head scan, in one update. */
  setSourceFacts: (id: string, hasIcc: boolean, meta: ImageFile["meta"]) => void;
  setPreviewUrl: (id: string, previewUrl: string) => void;
  setThumbUrl: (id: string, thumbUrl: string) => void;
  /** Discard all state — used on unmount to match the old per-mount hook. */
  reset: () => void;
}

function freshState() {
  const settings = createDefaultSettings();
  return {
    files: [] as ImageFile[],
    expandedFileId: null as string | null,
    globalSettings: settings,
    draftSettings: settings,
    autoUpdate: true,
    diffs: {} as Record<string, DiffState>,
    convertAll: false,
    pendingFormatReset: false,
  };
}

/** Propagate new applied settings to every file (re-run the finished
 *  ones), keeping each file's own format unless `clearOverrides`. */
function applySettings(files: ImageFile[], settings: CompressionSettings, clearOverrides = false): ImageFile[] {
  return files.map((f) => {
    const formatOverride = clearOverrides ? null : f.formatOverride;
    return { ...f, formatOverride, settings: effectiveSettings(settings, formatOverride), settingsDirty: needsRerun(f) };
  });
}

/** Re-point some files at new effective settings (only those re-run). */
function withOverrides(files: ImageFile[], global: CompressionSettings, next: (f: ImageFile) => OutputFormat | null): ImageFile[] {
  return files.map((f) => {
    const formatOverride = next(f);
    if (formatOverride === f.formatOverride) return f;
    return { ...f, formatOverride, settings: effectiveSettings(global, formatOverride), settingsDirty: needsRerun(f) };
  });
}

function revokeDiff(d: DiffState | undefined) {
  if (d?.status === "ready") URL.revokeObjectURL(d.url);
}

export const useCompressorStore = create<CompressorState>((set, get) => ({
  ...freshState(),

  editSettings: (patch) =>
    set((s) => {
      const draft = mergeSettings(s.draftSettings, patch);
      // A global Format pick means "every image uses this".
      const reset = patch.outputFormat !== undefined;
      return s.autoUpdate
        ? { draftSettings: draft, globalSettings: draft, files: applySettings(s.files, draft, reset) }
        : { draftSettings: draft, pendingFormatReset: s.pendingFormatReset || reset };
    }),

  applyDraft: () =>
    set((s) =>
      s.draftSettings === s.globalSettings && !s.pendingFormatReset
        ? {}
        : {
            globalSettings: s.draftSettings,
            files: applySettings(s.files, s.draftSettings, s.pendingFormatReset),
            pendingFormatReset: false,
          },
    ),

  setFormatOverride: (id, override) =>
    set((s) => ({ files: withOverrides(s.files, s.globalSettings, (f) => (f.id === id ? override : f.formatOverride)) })),

  clearFormatOverrides: () => set((s) => ({ files: withOverrides(s.files, s.globalSettings, () => null) })),

  restoreFormatOverrides: (overrides) =>
    set((s) => ({ files: withOverrides(s.files, s.globalSettings, (f) => overrides.get(f.id) ?? f.formatOverride) })),

  setConvertAll: (on) => set({ convertAll: on }),

  setAutoUpdate: (on) => {
    set({ autoUpdate: on });
    // Turning it back on applies whatever is pending, like the design.
    if (on) get().applyDraft();
  },

  setProbes: (id, probes) =>
    set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, probes } : f)) })),

  setDiff: (id, diff) =>
    set((s) => {
      const prev = s.diffs[id];
      if (prev && prev !== diff) revokeDiff(prev);
      const diffs = { ...s.diffs };
      if (diff) diffs[id] = diff;
      else delete diffs[id];
      return { diffs };
    }),

  appendFiles: (files) =>
    set((s) => ({ files: [...s.files, ...files] })),

  removeFile: (id) =>
    set((s) => {
      revokeDiff(s.diffs[id]);
      const diffs = { ...s.diffs };
      delete diffs[id];
      return {
        files: s.files.filter((f) => f.id !== id),
        expandedFileId: s.expandedFileId === id ? null : s.expandedFileId,
        diffs,
      };
    }),

  clearAll: () =>
    set((s) => {
      for (const d of Object.values(s.diffs)) revokeDiff(d);
      return { files: [], expandedFileId: null, diffs: {} };
    }),

  setExpanded: (id) => set({ expandedFileId: id }),

  setGlobalSettings: (settings) =>
    set((s) => ({ files: applySettings(s.files, settings), globalSettings: settings, draftSettings: settings })),

  setDisplayName: (id, displayName) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, displayName } : f)),
    })),

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

  setPreviewUrl: (id, previewUrl) =>
    set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, previewUrl } : f)) })),
  setThumbUrl: (id, thumbUrl) =>
    set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, thumbUrl } : f)) })),

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

  setSourceFacts: (id, hasIcc, meta) =>
    set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, hasIcc, meta } : f)) })),

  setHasIcc: (id, hasIcc) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, hasIcc } : f)),
    })),

  reset: () => {
    for (const d of Object.values(get().diffs)) revokeDiff(d);
    set(freshState());
  },
}));
