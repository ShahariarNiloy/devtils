import type { Base64Variant, Direction } from "../base64.types";

const HISTORY_KEY = "devtils_base64_history";
const HISTORY_MAX = 5;

export function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export function saveHistory(items: string[]) {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

export const HISTORY_MAX_EXPORT = HISTORY_MAX;

interface HydratedParams {
  input: string;
  direction: Direction;
  variant: Base64Variant;
}

export function readUrlParams(): HydratedParams {
  if (typeof window === "undefined") return { input: "", direction: "encode", variant: "standard" };
  const params = new URLSearchParams(window.location.search);
  const inParam   = params.get("in") ?? "";
  const modeParam = params.get("mode");
  const vParam    = params.get("v");
  const direction: Direction =
    modeParam === "encode" || modeParam === "decode" ? modeParam : "encode";
  const variant: Base64Variant =
    vParam === "standard" || vParam === "url-safe" || vParam === "mime" || vParam === "pem"
      ? vParam : "standard";
  return { input: inParam, direction, variant };
}
