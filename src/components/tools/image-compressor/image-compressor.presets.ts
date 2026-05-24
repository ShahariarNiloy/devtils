/**
 * Persisted user presets for the image compressor.
 *
 * Stored in localStorage as a versioned blob. We deliberately avoid IDB
 * here: presets are tiny (≈ a few KB max), don't need transactional
 * semantics, and localStorage gives us a synchronous read on mount —
 * which lets the Settings drawer render its list in the first paint.
 *
 * Cross-tab live updates are wired in `SettingsDrawer.tsx`, which listens
 * for the native `storage` event keyed on `STORAGE_KEY` (exported below).
 */

import type { CompressionSettings } from "./image-compressor.types";

/** Exported so the Settings drawer can filter `storage` events to ours. */
export const STORAGE_KEY = "image-compressor:presets:v1";

/** Current on-disk schema version. Bump when `PresetBlob` shape changes
 *  and add a migration entry below. */
const CURRENT_VERSION = 1;

export interface Preset {
  id: string;
  name: string;
  settings: CompressionSettings;
}

interface PresetBlob {
  version: typeof CURRENT_VERSION;
  presets: Preset[];
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Migration map: `migrations[v]` upgrades a blob written under version `v`
 * to `v + 1`. Empty today — the scaffold exists so that when the schema
 * changes to v2 we add a `1: …` entry and old presets survive instead of
 * being silently dropped by the version check.
 */
const migrations: Record<
  number,
  (blob: { presets?: unknown }) => PresetBlob | null
> = {
  // 0 -> 1: (none yet)
};

function isPresetArray(value: unknown): value is Preset[] {
  return Array.isArray(value);
}

function safeParse(raw: string): PresetBlob | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const blob = parsed as { version?: unknown; presets?: unknown };
  const version = typeof blob.version === "number" ? blob.version : 0;

  if (version === CURRENT_VERSION && isPresetArray(blob.presets)) {
    return { version: CURRENT_VERSION, presets: blob.presets };
  }

  // Run forward migrations v -> v+1 until we reach the current version.
  // When a path is missing the presets are dropped — that's the bug this
  // scaffold exists to prevent: on the next schema bump, add the matching
  // `migrations[v]` entry so old presets are upgraded instead of lost.
  // (The project bans console output, so the drop is documented here
  // rather than logged at runtime.)
  if (version < CURRENT_VERSION) {
    let working: { presets?: unknown } | null = blob;
    for (let v = version; v < CURRENT_VERSION && working; v++) {
      const migrate = migrations[v];
      if (!migrate) return null; // no upgrade path → drop (see note above)
      working = migrate(working);
    }
    if (working && isPresetArray(working.presets)) {
      return { version: CURRENT_VERSION, presets: working.presets };
    }
    return null;
  }

  // version > CURRENT_VERSION → written by a newer build. Leave it intact
  // on disk (we don't overwrite on read) and ignore it for this session.
  return null;
}

/** Read all stored presets. Returns an empty array on SSR or fresh users. */
export function loadPresets(): Preset[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return safeParse(raw)?.presets ?? [];
}

/** Persist the preset list. Returns false if the write failed (e.g. the
 *  storage quota is exceeded or storage is disabled) so callers can warn
 *  instead of assuming success. */
function writePresets(presets: Preset[]): boolean {
  if (typeof window === "undefined") return false;
  const blob: PresetBlob = { version: CURRENT_VERSION, presets };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
    return true;
  } catch {
    return false;
  }
}

/**
 * Save (or update) a preset by name. Saving an existing name overwrites
 * its settings in place rather than creating a duplicate. Returns the
 * stored preset, or null if persistence failed.
 */
export function savePreset(
  name: string,
  settings: CompressionSettings,
): Preset | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const presets = loadPresets();
  const existing = presets.find((p) => p.name === trimmed);
  if (existing) {
    existing.settings = settings;
    return writePresets(presets) ? existing : null;
  }
  const preset: Preset = { id: newId(), name: trimmed, settings };
  return writePresets([...presets, preset]) ? preset : null;
}

/** Delete a preset by id. Returns false if persistence failed. */
export function deletePreset(id: string): boolean {
  const next = loadPresets().filter((p) => p.id !== id);
  return writePresets(next);
}
