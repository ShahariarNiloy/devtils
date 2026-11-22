"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { hsbToRgb, parseHex, rgbToHex, rgbToHsb, type RGB } from "./color.lib";
import {
  closestNamedColor,
  evaluateWcag,
  formatColor,
  generateShades,
  nearestTailwindColor,
  parseAnyColor,
} from "./color-converter.lib";
import type {
  Format,
  HistoryEntry,
  NamedMatch,
  ShadeEntry,
  TailwindMatch,
  WcagResult,
} from "./color-converter.types";
import { FORMATS } from "./color-converter.types";

const HISTORY_KEY = "utilyx:color-history";
const MAX_HISTORY = 12;

type FormattedMap = Record<Format, string>;

export interface ColorConverterState {
  hue: number; sat: number; bri: number; alpha: number;
  setHue: (v: number) => void;
  setSat: (v: number) => void;
  setBri: (v: number) => void;
  setAlpha: (v: number) => void;
  rgb: RGB;
  pureHex: string;
  formatted: FormattedMap;
  tailwind: TailwindMatch;
  named: NamedMatch;
  shades: ShadeEntry[];
  bgRgb: RGB;
  setBgRgb: (rgb: RGB) => void;
  wcag: WcagResult;
  history: HistoryEntry[];
  setFromRgb: (rgb: RGB) => void;
  addToHistory: (hex?: string) => void;
  restoreFromHistory: (hex: string) => void;
  clearHistory: () => void;
  primaryFormat: Format;
  setPrimaryFormat: (f: Format) => void;
  /** What the colour field shows: the user's text while typing, else HEX. */
  inputValue: string;
  /** Field has text that doesn't parse as a colour. */
  inputInvalid: boolean;
  /** Typing in the field — applies the colour as soon as it parses. */
  setInputText: (text: string) => void;
  /** Leave the field: drop the draft so it shows the canonical HEX. */
  commitInput: () => void;
}

// Mockup sample colour #C58E5E (warm clay) — what the server renders and
// what the first client render must match.
const SAMPLE_HSB = rgbToHsb({ r: 197, g: 142, b: 94, a: 1 });

/** Colour from the URL hash (`#ff0000`, `#rgb(…)`), or null. Client-only. */
function readHashColor(): RGB | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  try {
    return parseAnyColor(decodeURIComponent(hash));
  } catch {
    return null; // malformed %-escape
  }
}

function readStoredHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch { return []; }
}

export function useColorConverter(): ColorConverterState {
  const [hue, setHue] = useState(SAMPLE_HSB.h);
  const [sat, setSat] = useState(SAMPLE_HSB.s);
  const [bri, setBri] = useState(SAMPLE_HSB.b);
  const [alpha, setAlpha] = useState(1);
  const [bgRgb, setBgRgb] = useState<RGB>({ r: 255, g: 255, b: 255, a: 1 });
  const [primaryFormat, setPrimaryFormat] = useState<Format>("hex");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // False for the server render and hydration pass; the URL hash and
  // localStorage are only read after mount so both renders match.
  const [hydrated, setHydrated] = useState(false);

  // Raw text in the colour field while the user is typing; null shows HEX.
  const [draft, setDraft] = useState<string | null>(null);

  const applyRgb = useCallback((newRgb: RGB) => {
    const hsb = rgbToHsb(newRgb);
    // Greys have no hue — keep the last one so the picker doesn't jump.
    if (hsb.s > 0 && hsb.b > 0) setHue(hsb.h);
    setSat(hsb.s);
    setBri(hsb.b);
    setAlpha(newRgb.a);
  }, []);

  /** Any non-typing colour change (picker, scale, history) drops the draft. */
  const setFromRgb = useCallback((newRgb: RGB) => {
    setDraft(null);
    applyRgb(newRgb);
  }, [applyRgb]);

  const setHueV = useCallback((v: number) => { setDraft(null); setHue(v); }, []);
  const setSatV = useCallback((v: number) => { setDraft(null); setSat(v); }, []);
  const setBriV = useCallback((v: number) => { setDraft(null); setBri(v); }, []);
  const setAlphaV = useCallback((v: number) => { setDraft(null); setAlpha(v); }, []);

  useEffect(() => {
    const fromHash = readHashColor();
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration of client-only hash + storage */
    if (fromHash) applyRgb(fromHash);
    setHistory(readStoredHistory());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [applyRgb]);

  const setInputText = useCallback((text: string) => {
    setDraft(text);
    const parsed = parseAnyColor(text);
    if (parsed) applyRgb(parsed);
  }, [applyRgb]);

  const rgb = useMemo(() => hsbToRgb(hue, sat, bri, alpha), [hue, sat, bri, alpha]);
  const pureHex = useMemo(() => rgbToHex(hsbToRgb(hue, 100, 100, 1)), [hue]);

  const formatted = useMemo<FormattedMap>(
    () => Object.fromEntries(FORMATS.map((f) => [f, formatColor(rgb, f)])) as FormattedMap,
    [rgb],
  );

  const tailwind = useMemo(() => nearestTailwindColor(rgb), [rgb]);
  const named = useMemo(() => closestNamedColor(rgb), [rgb]);
  const shades = useMemo(() => generateShades(hue, sat, bri), [hue, sat, bri]);
  const wcag = useMemo(() => evaluateWcag(rgb, bgRgb), [rgb, bgRgb]);

  // Update URL hash so a refresh restores the current color without
  // spamming history.
  useEffect(() => {
    // Don't overwrite a shared hash before it has been read.
    if (!hydrated) return;
    const hex = rgbToHex(rgb).replace("#", "");
    const target = `#${hex}`;
    if (window.location.hash !== target) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${target}`);
    }
  }, [rgb, hydrated]);

  const addToHistory = useCallback((explicitHex?: string) => {
    const hex = explicitHex ?? rgbToHex(hsbToRgb(hue, sat, bri, 1));
    setHistory((prev) => {
      const next = [
        { hex, ts: Date.now() },
        ...prev.filter((e) => e.hex !== hex),
      ].slice(0, MAX_HISTORY);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [hue, sat, bri]);

  const restoreFromHistory = useCallback((hex: string) => {
    const parsed = parseHex(hex);
    if (parsed) setFromRgb({ ...parsed, a: 1 });
  }, [setFromRgb]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  }, []);

  const inputInvalid = draft !== null && draft.trim() !== "" && parseAnyColor(draft) === null;
  const inputValue = draft ?? formatted.hex.toUpperCase();
  const commitInput = useCallback(() => {
    if (draft === null) return;
    setDraft(null);
    if (parseAnyColor(draft)) addToHistory();
  }, [draft, addToHistory]);

  return {
    hue, sat, bri, alpha,
    setHue: setHueV, setSat: setSatV, setBri: setBriV, setAlpha: setAlphaV,
    inputValue, inputInvalid, setInputText, commitInput,
    rgb, pureHex, formatted, tailwind, named, shades,
    bgRgb, setBgRgb, wcag,
    history,
    setFromRgb,
    addToHistory,
    restoreFromHistory,
    clearHistory,
    primaryFormat, setPrimaryFormat,
  };
}
