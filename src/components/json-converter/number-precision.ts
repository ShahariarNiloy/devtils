/**
 * Detect numbers the converters can't carry through unchanged. Inputs are
 * parsed into JS numbers (IEEE-754 doubles), so integers beyond 2^53 are
 * rounded (12345678901234567890 → 12345678901234567000), long decimals lose
 * digits, and non-finite values (YAML `.inf`, JSON `1e400`) have no JSON
 * spelling at all. Same idea as the JSON formatter's `scanJsonText`, but it
 * keeps the offending tokens so the warning can name them.
 * No React, no DOM.
 */

export interface LossyNumber {
  /** The number as written in the source. */
  raw: string;
  /** What it became after parsing. */
  value: number;
}

/** Sign + significant digits + exponent for a decimal token; null if not decimal. */
function canonicalDecimal(tok: string): string | null {
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(tok);
  if (!m || (m[2] === "" && !m[3])) return null;
  const frac = m[3] ?? "";
  let digits = (m[2] + frac).replace(/^0+/, "");
  if (digits === "") return "0";
  let exp = Number(m[4] ?? 0) - frac.length;
  const trimmed = digits.replace(/0+$/, "");
  exp += digits.length - trimmed.length;
  digits = trimmed;
  return `${m[1] === "-" ? "-" : ""}${digits}e${exp}`;
}

/**
 * True when `value` (parsed from `raw`) doesn't represent `raw` exactly.
 * Handles decimal, `0x` / `0o` / `0b` integers and `_` digit separators
 * (YAML); unknown spellings fall back to "integer beyond the safe range".
 */
export function numberTokenLoses(raw: string, value: number): boolean {
  if (!Number.isFinite(value)) return true;
  const tok = raw.replace(/_/g, "");
  try {
    const radix = /^([+-]?)0([xob])([0-9a-f]+)$/i.exec(tok);
    if (radix) {
      const big = BigInt(`0${radix[2].toLowerCase()}${radix[3]}`);
      return (radix[1] === "-" ? -big : big) !== BigInt(value);
    }
    if (/^[+-]?\d+$/.test(tok)) return BigInt(tok) !== BigInt(value);
  } catch {
    // Not a spelling BigInt understands — fall through to the heuristic.
  }
  const canon = canonicalDecimal(tok);
  if (canon !== null) return canon !== canonicalDecimal(String(value).replace("e+", "e"));
  return Number.isInteger(value) && !Number.isSafeInteger(value);
}

function isNumberChar(c: number): boolean {
  // 0-9 . - + e E
  return (c >= 48 && c <= 57) || c === 46 || c === 45 || c === 43 || c === 101 || c === 69;
}

/** Number tokens in (valid) JSON text that JSON.parse can't keep exactly. */
export function findLossyJsonNumbers(raw: string): LossyNumber[] {
  const out: LossyNumber[] = [];
  const n = raw.length;
  let i = 0;
  while (i < n) {
    const c = raw.charCodeAt(i);
    if (c === 34 /* " */) {
      i++;
      while (i < n) {
        const d = raw.charCodeAt(i);
        if (d === 92 /* \ */) i += 2;
        else if (d === 34) break;
        else i++;
      }
      i++;
      continue;
    }
    if (c === 45 || (c >= 48 && c <= 57)) {
      const start = i;
      while (i < n && isNumberChar(raw.charCodeAt(i))) i++;
      const tok = raw.slice(start, i);
      const value = Number(tok);
      // Fast path: the common case round-trips verbatim.
      if (String(value) !== tok && numberTokenLoses(tok, value)) out.push({ raw: tok, value });
      continue;
    }
    i++;
  }
  return out;
}

/** How a parsed number is spelled in the tool's output. */
export type NumberSpelling = (value: number) => string;

/** JSON output: non-finite numbers serialise as `null`. */
export const jsonSpelling: NumberSpelling = (v) => JSON.stringify(v);

/** YAML output: js-yaml writes `.inf` / `-.inf` / `.nan`. */
export const yamlSpelling: NumberSpelling = (v) => {
  if (Number.isNaN(v)) return ".nan";
  if (v === Infinity) return ".inf";
  if (v === -Infinity) return "-.inf";
  return String(v);
};

/** One-line, user-facing warning, or null when nothing was lost. */
export function precisionWarning(
  lossy: readonly LossyNumber[],
  spell: NumberSpelling = jsonSpelling,
): string | null {
  if (lossy.length === 0) return null;
  const shown = lossy.slice(0, 3).map((l) => `${l.raw} → ${spell(l.value)}`);
  const more = lossy.length > 3 ? ` and ${(lossy.length - 3).toLocaleString()} more` : "";
  const count = lossy.length === 1 ? "1 number" : `${lossy.length.toLocaleString()} numbers`;
  return (
    `${count} can't be represented exactly and ${lossy.length === 1 ? "changes" : "change"} ` +
    `in the output: ${shown.join(", ")}${more}. Quote ${lossy.length === 1 ? "it" : "them"} ` +
    `as ${lossy.length === 1 ? "a string" : "strings"} to keep the exact value.`
  );
}
