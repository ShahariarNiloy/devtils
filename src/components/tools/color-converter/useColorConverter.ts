"use client";

import { useCallback, useMemo, useState } from "react";
import { hsbToRgb, parseHex, rgbToHex, rgbToHsb, type RGB } from "./color.lib";
import {
  evaluateWcag,
  formatColor,
  generateShades,
  nearestTailwindColor,
} from "./color-converter.lib";
import type {
  Format,
  HistoryEntry,
  ShadeEntry,
  TailwindMatch,
  WcagResult,
} from "./color-converter.types";
import { FORMATS } from "./color-converter.types";

const HISTORY_KEY = "devtils:color-history";
const MAX_HISTORY = 8;

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
  shades: ShadeEntry[];
  bgRgb: RGB;
  setBgRgb: (rgb: RGB) => void;
  wcag: WcagResult;
  history: HistoryEntry[];
  setFromRgb: (rgb: RGB) => void;
  addToHistory: () => void;
  restoreFromHistory: (hex: string) => void;
  clearHistory: () => void;
}

export function useColorConverter(): ColorConverterState {
  const [hue, setHue] = useState(210);
  const [sat, setSat] = useState(65);
  const [bri, setBri] = useState(90);
  const [alpha, setAlpha] = useState(1);
  const [bgRgb, setBgRgb] = useState<RGB>({ r: 255, g: 255, b: 255, a: 1 });
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    } catch { return []; }
  });

  const rgb = useMemo(() => hsbToRgb(hue, sat, bri, alpha), [hue, sat, bri, alpha]);
  const pureHex = useMemo(() => rgbToHex(hsbToRgb(hue, 100, 100, 1)), [hue]);

  const formatted = useMemo<FormattedMap>(
    () => Object.fromEntries(FORMATS.map((f) => [f, formatColor(rgb, f)])) as FormattedMap,
    [rgb],
  );

  const tailwind = useMemo(() => nearestTailwindColor(rgb), [rgb]);
  const shades = useMemo(() => generateShades(hue, sat, bri), [hue, sat, bri]);
  const wcag = useMemo(() => evaluateWcag(rgb, bgRgb), [rgb, bgRgb]);

  const setFromRgb = useCallback((newRgb: RGB) => {
    const hsb = rgbToHsb(newRgb);
    setHue(hsb.h);
    setSat(hsb.s);
    setBri(hsb.b);
    setAlpha(newRgb.a);
  }, []);

  const addToHistory = useCallback(() => {
    const hex = rgbToHex(hsbToRgb(hue, sat, bri, 1));
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

  return {
    hue, sat, bri, alpha,
    setHue, setSat, setBri, setAlpha,
    rgb, pureHex, formatted, tailwind, shades,
    bgRgb, setBgRgb, wcag,
    history,
    setFromRgb,
    addToHistory,
    restoreFromHistory,
    clearHistory,
  };
}
