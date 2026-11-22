"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_CONTEXT,
  LENGTH_UNITS,
  isLengthUnit,
  parseContextNumber,
  type ConversionContext,
  type LengthUnit,
} from "./css-unit-converter.lib";

export type TabKey = "convert" | "bulk" | "clamp";

export interface AliasPair {
  from: LengthUnit;
  to: LengthUnit;
}

/**
 * Parse a tool slug of the form `<from>-to-<to>-converter` (e.g.
 * `px-to-rem-converter`) into a unit pair. Returns null for the canonical
 * `css-unit-converter` slug or anything else that doesn't match.
 *
 * Used to pre-select the input + highlighted output unit so visitors landing
 * via an alias URL see their conversion already solved.
 */
export function parseAliasSlug(slug: string): AliasPair | null {
  const m = /^([a-z]+)-to-([a-z]+)-converter$/.exec(slug);
  if (!m) return null;
  const [, from, to] = m;
  if (!isLengthUnit(from) || !isLengthUnit(to)) return null;
  return { from, to };
}

interface ShareParams {
  base?: number;
  tab?: TabKey;
  value?: string;
  from?: LengthUnit;
}

/**
 * Read share-link params. Client-only (`window.location`), so it runs in a
 * mount effect — never during render — to keep the first client render
 * identical to the server HTML (no hydration mismatch on share links).
 */
function readShareParams(): ShareParams {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const out: ShareParams = {};
  const b = params.get("base");
  if (b) {
    const n = parseFloat(b);
    if (Number.isFinite(n) && n > 0 && n <= 200) out.base = n;
  }
  const t = params.get("tab");
  if (t === "convert" || t === "bulk" || t === "clamp") out.tab = t;
  const v = params.get("v");
  if (v && Number.isFinite(parseFloat(v))) out.value = v;
  const f = params.get("from");
  if (f && isLengthUnit(f)) out.from = f;
  return out;
}

/** Units the v2 workspace shows by default (mockup); print units are opt-in. */
export const CORE_UNITS: readonly LengthUnit[] = ["px", "rem", "em", "%", "vw", "vh", "pt"];
export const PRINT_UNITS: readonly LengthUnit[] = LENGTH_UNITS.filter((u) => !CORE_UNITS.includes(u));

export interface ContextField {
  text: string;
  setText: (s: string) => void;
  /** Text doesn't parse as a usable size; the default is used instead. */
  invalid: boolean;
}

export interface CssUnitConverterState {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  /** Value field text and the unit it's in. */
  valueText: string;
  setValueText: (s: string) => void;
  from: LengthUnit;
  setFrom: (u: LengthUnit) => void;
  /** Shared conversion context — what every panel reads for math. */
  ctx: ConversionContext;
  base: ContextField;
  vw: ContextField;
  vh: ContextField;
  setBaseFontSize: (n: number) => void;
  setPrecision: (n: number) => void;
  /** Alias pair from the slug, or null on the canonical route. */
  alias: AliasPair | null;
  /** Copy a deep-link with the current tab, base, value and unit. */
  copyShareLink: () => void;
}

function useContextField(initial: number, fallback: number, max: number): [ContextField, number, (n: number) => void] {
  const [text, setText] = useState(String(initial));
  const parsed = parseContextNumber(text, max);
  const field: ContextField = { text, setText, invalid: parsed === null };
  const setNumber = useCallback((n: number) => setText(String(n)), []);
  return [field, parsed ?? fallback, setNumber];
}

/**
 * Owns the CSS unit converter state. The Convert workspace reads value,
 * unit and context from here; Bulk and Clamp keep their own inputs and
 * share only the context.
 */
export function useCssUnitConverter(slug: string): CssUnitConverterState {
  const alias = useMemo(() => parseAliasSlug(slug), [slug]);

  const initialFrom = alias?.from ?? "px";
  const [tab, setTab] = useState<TabKey>("convert");
  // Alias pages open on a natural sample (16px, or 1rem / 1em / 1pt);
  // the canonical page opens on the mockup's 24px.
  const sample = alias ? (initialFrom === "px" ? "16" : "1") : "24";
  const [valueText, setValueText] = useState(sample);
  const [from, setFrom] = useState<LengthUnit>(initialFrom);
  const [precision, setPrecision] = useState(DEFAULT_CONTEXT.precision);

  const [base, baseFontSize, setBaseFontSize] = useContextField(
    DEFAULT_CONTEXT.baseFontSize,
    DEFAULT_CONTEXT.baseFontSize,
    200,
  );

  // Apply a share link after hydration (server + first client render both
  // use the defaults above).
  useEffect(() => {
    const shared = readShareParams();
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration of client-only URL state */
    if (shared.tab) setTab(shared.tab);
    if (shared.value !== undefined) setValueText(shared.value);
    if (shared.from) setFrom(shared.from);
    if (shared.base !== undefined) setBaseFontSize(shared.base);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [setBaseFontSize]);
  const [vw, viewportWidth] = useContextField(DEFAULT_CONTEXT.viewportWidth, DEFAULT_CONTEXT.viewportWidth, 100_000);
  const [vh, viewportHeight] = useContextField(DEFAULT_CONTEXT.viewportHeight, DEFAULT_CONTEXT.viewportHeight, 100_000);

  const ctx: ConversionContext = useMemo(
    () => ({ baseFontSize, viewportWidth, viewportHeight, precision }),
    [baseFontSize, viewportWidth, viewportHeight, precision],
  );

  const copyShareLink = useCallback(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams({ tab, base: String(baseFontSize) });
    if (tab === "convert") {
      params.set("v", valueText.trim());
      params.set("from", from);
    }
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    void navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  }, [tab, baseFontSize, valueText, from]);

  return {
    tab,
    setTab,
    valueText,
    setValueText,
    from,
    setFrom,
    ctx,
    base,
    vw,
    vh,
    setBaseFontSize,
    setPrecision,
    alias,
    copyShareLink,
  };
}
