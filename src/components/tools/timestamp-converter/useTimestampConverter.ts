"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import {
  formatAll,
  getTimezoneView,
  isInDstTransition,
  parseInput,
} from "./timestamp-converter.lib";
import {
  DEFAULT_CUSTOM_FORMAT,
  DEFAULT_SECONDARY_TZ,
  DST_WARN_WINDOW_HOURS,
  MAX_HISTORY_ITEMS,
  resolveDefaultPrimaryTz,
  SUPPORTED_LANGUAGES,
} from "./timestamp-converter.constants";
import type {
  DetectedFormat,
  FormatOutputs,
  ParseResult,
  TimezoneView,
  ToolMode,
} from "./timestamp-converter.types";

interface HistoryEntry {
  raw: string;
  format: DetectedFormat;
  at: number;
}
interface PinnedEntry {
  label: string;
  raw: string;
  instant: string;
}

export interface UseTimestampConverter {
  rawInput: string;
  setRawInput: (s: string) => void;
  parseResult: ParseResult;
  overrideFormat: (fmt: DetectedFormat) => void;

  primaryTz: string;
  secondaryTz: string;
  setPrimaryTz: (tz: string) => void;
  setSecondaryTz: (tz: string) => void;
  swapTimezones: () => void;

  customFormat: string;
  setCustomFormat: (s: string) => void;

  primaryView: TimezoneView | null;
  secondaryView: TimezoneView | null;
  formats: FormatOutputs | null;
  dstWarning: { tz: string; transitionAt: string } | null;

  mode: ToolMode;
  setMode: (m: ToolMode) => void;

  /** Compare-mode zones — persisted across mode switches. */
  compareZones: string[];
  addCompareZone: (tz: string) => void;
  removeCompareZone: (tz: string) => void;
  moveCompareZone: (tz: string, dir: -1 | 1) => void;

  history: HistoryEntry[];
  clearHistory: () => void;

  pinned: PinnedEntry[];
  pin: (label: string, raw: string) => void;
  unpin: (raw: string) => void;

  activeLanguage: string;
  setActiveLanguage: (id: string) => void;

  nowUnix: number;

  useNow: () => void;
  clear: () => void;
  copyPermalink: () => Promise<void>;

  loadFromUrlState: () => void;
}

const EXCEL_EPOCH_MS = Temporal.Instant.from(
  "1899-12-30T00:00:00Z",
).epochMilliseconds;

/** Re-interpret raw input as a forced format (used by the format chip). */
function parseWithOverride(
  raw: string,
  override: DetectedFormat | null,
): ParseResult {
  const base = parseInput(raw);
  if (!override) return base;
  const trimmed = raw.trim().replace(/^["'`]|["'`]$/g, "");

  try {
    if (/^[+-]?\d+$/.test(trimmed)) {
      let instant: Temporal.Instant | null = null;
      if (override === "unix-s") {
        instant = Temporal.Instant.fromEpochMilliseconds(Number(trimmed) * 1000);
      } else if (override === "unix-ms") {
        instant = Temporal.Instant.fromEpochMilliseconds(Number(trimmed));
      } else if (override === "unix-us") {
        instant = Temporal.Instant.fromEpochNanoseconds(
          BigInt(trimmed) * BigInt(1000),
        );
      } else if (override === "unix-ns") {
        instant = Temporal.Instant.fromEpochNanoseconds(BigInt(trimmed));
      } else if (override === "excel-serial") {
        instant = Temporal.Instant.fromEpochMilliseconds(
          EXCEL_EPOCH_MS + Math.round(Number(trimmed) * 86_400_000),
        );
      }
      if (instant) {
        return { ok: true, instant, detectedFormat: override, rawInput: raw };
      }
    }
    if (override === "excel-serial" && /^\d+(\.\d+)?$/.test(trimmed)) {
      return {
        ok: true,
        instant: Temporal.Instant.fromEpochMilliseconds(
          EXCEL_EPOCH_MS + Math.round(Number(trimmed) * 86_400_000),
        ),
        detectedFormat: "excel-serial",
        rawInput: raw,
      };
    }
  } catch {
    return base;
  }
  return base;
}

function readUrlState(): {
  raw?: string;
  pTz?: string;
  sTz?: string;
  fmt?: string;
  mode?: ToolMode;
} {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const t = p.get("t");
  const modeParam = p.get("mode");
  const validMode: ToolMode[] = ["single", "compare", "arithmetic", "batch"];
  return {
    raw: t ?? undefined,
    pTz: p.get("pTz") ?? undefined,
    sTz: p.get("sTz") ?? undefined,
    fmt: p.get("fmt") ?? undefined,
    mode:
      modeParam && validMode.includes(modeParam as ToolMode)
        ? (modeParam as ToolMode)
        : undefined,
  };
}

/**
 * Owns the entire Timestamp-converter state. Components consume this and hold
 * only render logic. Derived values (parse, views, formats) are memoized;
 * the live clock ticks on a cleaned-up interval.
 *
 * @returns The full tool state + actions.
 */
export function useTimestampConverter(): UseTimestampConverter {
  const pathname = usePathname();

  const [rawInput, setRawInput] = useState("");
  const [formatOverride, setFormatOverride] = useState<DetectedFormat | null>(
    null,
  );
  const [primaryTz, setPrimaryTz] = useState(resolveDefaultPrimaryTz());
  const [secondaryTz, setSecondaryTz] = useState(DEFAULT_SECONDARY_TZ);
  const [customFormat, setCustomFormat] = useState(DEFAULT_CUSTOM_FORMAT);
  const [mode, setMode] = useState<ToolMode>("single");
  const [compareZones, setCompareZones] = useState<string[]>(() => [
    resolveDefaultPrimaryTz(),
    "UTC",
  ]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pinned, setPinned] = useState<PinnedEntry[]>([]);
  const [activeLanguage, setActiveLanguage] = useState(
    SUPPORTED_LANGUAGES[0].id,
  );
  const [nowUnix, setNowUnix] = useState(() =>
    Math.floor(Date.now() / 1000),
  );

  // ── Permalink hydration (client-only, once) ───────────────────────────────
  const loadFromUrlState = useCallback(() => {
    const s = readUrlState();
    if (s.raw !== undefined) setRawInput(s.raw);
    if (s.pTz) setPrimaryTz(s.pTz);
    if (s.sTz) setSecondaryTz(s.sTz);
    if (s.fmt) setCustomFormat(s.fmt);
    if (s.mode) setMode(s.mode);
  }, []);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    loadFromUrlState();
  }, [loadFromUrlState]);

  // ── Live clock ────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(
      () => setNowUnix(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const parseResult = useMemo(
    () => parseWithOverride(rawInput, formatOverride),
    [rawInput, formatOverride],
  );

  const formats = useMemo<FormatOutputs | null>(
    () =>
      parseResult.ok && parseResult.instant
        ? formatAll(parseResult.instant, primaryTz, customFormat)
        : null,
    [parseResult, primaryTz, customFormat],
  );

  const primaryView = useMemo<TimezoneView | null>(
    () =>
      parseResult.ok && parseResult.instant
        ? getTimezoneView(parseResult.instant, primaryTz)
        : null,
    [parseResult, primaryTz],
  );

  const secondaryView = useMemo<TimezoneView | null>(
    () =>
      parseResult.ok && parseResult.instant
        ? getTimezoneView(parseResult.instant, secondaryTz)
        : null,
    [parseResult, secondaryTz],
  );

  const dstWarning = useMemo<{ tz: string; transitionAt: string } | null>(() => {
    if (!parseResult.ok || !parseResult.instant) return null;
    const inst = parseResult.instant;
    for (const tz of [primaryTz, secondaryTz]) {
      if (isInDstTransition(inst, tz, DST_WARN_WINDOW_HOURS)) {
        const zdt = inst.toZonedDateTimeISO(tz);
        const next = zdt.getTimeZoneTransition("next");
        const prev = zdt.getTimeZoneTransition("previous");
        const pick =
          next &&
          Math.abs(
            next.toInstant().epochMilliseconds - inst.epochMilliseconds,
          ) <=
            DST_WARN_WINDOW_HOURS * 3_600_000
            ? next
            : prev;
        return {
          tz,
          transitionAt: pick
            ? pick.toString({ timeZoneName: "never" })
            : zdt.toString({ timeZoneName: "never" }),
        };
      }
    }
    return null;
  }, [parseResult, primaryTz, secondaryTz]);

  // ── History (debounced, de-duped, capped) ─────────────────────────────────
  useEffect(() => {
    if (!parseResult.ok || !rawInput.trim()) return;
    const fmt = parseResult.detectedFormat;
    const id = setTimeout(() => {
      setHistory((prev) => {
        if (prev[0]?.raw === rawInput) return prev;
        return [
          { raw: rawInput, format: fmt, at: Date.now() },
          ...prev,
        ].slice(0, MAX_HISTORY_ITEMS);
      });
    }, 800);
    return () => clearTimeout(id);
  }, [rawInput, parseResult.ok, parseResult.detectedFormat]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const overrideFormat = useCallback(
    (fmt: DetectedFormat) => setFormatOverride(fmt),
    [],
  );

  const swapTimezones = useCallback(() => {
    setPrimaryTz(secondaryTz);
    setSecondaryTz(primaryTz);
  }, [primaryTz, secondaryTz]);

  const clearHistory = useCallback(() => setHistory([]), []);

  const addCompareZone = useCallback((tz: string) => {
    setCompareZones((prev) =>
      prev.includes(tz) || prev.length >= 6 ? prev : [...prev, tz],
    );
  }, []);
  const removeCompareZone = useCallback((tz: string) => {
    setCompareZones((prev) =>
      prev.length <= 1 ? prev : prev.filter((z) => z !== tz),
    );
  }, []);
  const moveCompareZone = useCallback((tz: string, dir: -1 | 1) => {
    setCompareZones((prev) => {
      const i = prev.indexOf(tz);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const pin = useCallback((label: string, raw: string) => {
    const pr = parseInput(raw);
    setPinned((prev) =>
      prev.some((x) => x.raw === raw)
        ? prev
        : [
            ...prev,
            {
              label,
              raw,
              instant: pr.ok && pr.instant ? pr.instant.toString() : "",
            },
          ],
    );
  }, []);

  const unpin = useCallback(
    (raw: string) =>
      setPinned((prev) => prev.filter((x) => x.raw !== raw)),
    [],
  );

  const useNow = useCallback(
    () => setRawInput(String(Math.floor(Date.now() / 1000))),
    [],
  );

  const clear = useCallback(() => {
    setRawInput("");
    setFormatOverride(null);
  }, []);

  const copyPermalink = useCallback(async () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (parseResult.ok && parseResult.instant) {
      params.set(
        "t",
        (
          parseResult.instant.epochNanoseconds / BigInt(1_000_000_000)
        ).toString(),
      );
    }
    params.set("pTz", primaryTz);
    params.set("sTz", secondaryTz);
    params.set("fmt", customFormat);
    params.set("mode", mode);
    const url = `${window.location.origin}${pathname}?${params.toString()}`;
    window.history.replaceState(null, "", url);
    await navigator.clipboard.writeText(url);
  }, [parseResult, primaryTz, secondaryTz, customFormat, mode, pathname]);

  return {
    rawInput,
    setRawInput,
    parseResult,
    overrideFormat,
    primaryTz,
    secondaryTz,
    setPrimaryTz,
    setSecondaryTz,
    swapTimezones,
    customFormat,
    setCustomFormat,
    primaryView,
    secondaryView,
    formats,
    dstWarning,
    mode,
    setMode,
    compareZones,
    addCompareZone,
    removeCompareZone,
    moveCompareZone,
    history,
    clearHistory,
    pinned,
    pin,
    unpin,
    activeLanguage,
    setActiveLanguage,
    nowUnix,
    useNow,
    clear,
    copyPermalink,
    loadFromUrlState,
  };
}
