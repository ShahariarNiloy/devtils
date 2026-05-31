"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_CONTEXT,
  LENGTH_UNITS,
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
 * Used to pre-select the input + primary output unit so visitors landing
 * via an alias URL see their conversion already solved.
 */
export function parseAliasSlug(slug: string): AliasPair | null {
  const m = /^([a-z]+)-to-([a-z]+)-converter$/.exec(slug);
  if (!m) return null;
  const validUnits = new Set(LENGTH_UNITS as readonly string[]);
  const from = m[1];
  const to = m[2];
  if (!validUnits.has(from) || !validUnits.has(to)) return null;
  return { from: from as LengthUnit, to: to as LengthUnit };
}

/**
 * Read share-link params once at initial render. Used as a `useMemo`
 * initializer so SSR HTML matches what we'd render after hydration and we
 * avoid the setState-in-useEffect pattern the React rules-of-hooks lint
 * flags.
 */
function readShareParams(): { base?: number; tab?: TabKey } {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const out: { base?: number; tab?: TabKey } = {};
  const b = params.get("base");
  if (b) {
    const n = parseFloat(b);
    if (Number.isFinite(n) && n > 0 && n <= 200) out.base = n;
  }
  const t = params.get("tab");
  if (t === "convert" || t === "bulk" || t === "clamp") out.tab = t;
  return out;
}

export interface CssUnitConverterState {
  /** Active tab. */
  tab: TabKey;
  setTab: (t: TabKey) => void;
  /** Shared conversion context — what the three panels read for math. */
  ctx: ConversionContext;
  /** Individual setters, exposed for the popovers. */
  baseFontSize: number;
  setBaseFontSize: (n: number) => void;
  viewportWidth: number;
  setViewportWidth: (n: number) => void;
  viewportHeight: number;
  setViewportHeight: (n: number) => void;
  precision: number;
  setPrecision: (n: number) => void;
  /** Alias pair from the slug, or null on the canonical route. */
  alias: AliasPair | null;
  /** Copy a deep-link with the current tab + base to the clipboard. */
  copyShareLink: () => void;
}

/**
 * Owns the cross-panel state for the CSS unit converter. The three panels
 * (Convert / Bulk / Clamp) each hold their own input state internally; only
 * settings shared across tabs live here.
 */
export function useCssUnitConverter(slug: string): CssUnitConverterState {
  const initial = useMemo(() => readShareParams(), []);
  const alias = useMemo(() => parseAliasSlug(slug), [slug]);

  const [tab, setTab] = useState<TabKey>(initial.tab ?? "convert");
  const [baseFontSize, setBaseFontSize] = useState(
    initial.base ?? DEFAULT_CONTEXT.baseFontSize,
  );
  const [viewportWidth, setViewportWidth] = useState(DEFAULT_CONTEXT.viewportWidth);
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_CONTEXT.viewportHeight);
  const [precision, setPrecision] = useState(DEFAULT_CONTEXT.precision);

  const ctx: ConversionContext = useMemo(
    () => ({ baseFontSize, viewportWidth, viewportHeight, precision }),
    [baseFontSize, viewportWidth, viewportHeight, precision],
  );

  const copyShareLink = useCallback(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams({ tab, base: String(baseFontSize) });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    void navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  }, [tab, baseFontSize]);

  return {
    tab,
    setTab,
    ctx,
    baseFontSize,
    setBaseFontSize,
    viewportWidth,
    setViewportWidth,
    viewportHeight,
    setViewportHeight,
    precision,
    setPrecision,
    alias,
    copyShareLink,
  };
}
