/**
 * Password + passphrase generation with honest entropy. Pure: randomness
 * comes from an injectable `fill` (defaults to crypto.getRandomValues).
 *
 * Passwords are drawn uniformly from the strings that contain at least one
 * character of every enabled set (rejection sampling), so the entropy shown
 * is exact: log2 of the number of such strings (inclusion–exclusion).
 */
import { WORDS } from "./password-generator.words";

export type PasswordMode = "chars" | "phrase";

export interface PasswordOptions {
  mode: PasswordMode;
  length: number;
  words: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  noSimilar: boolean;
  capitalize: boolean;
  addNumber: boolean;
}

export const DEFAULT_OPTIONS: PasswordOptions = {
  mode: "chars",
  length: 20,
  words: 5,
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  noSimilar: true,
  capitalize: true,
  addNumber: true,
};

export const LENGTH_RANGE = { min: 8, max: 64 } as const;
export const WORDS_RANGE = { min: 3, max: 10 } as const;
export const WORD_LIST_SIZE = WORDS.length;

export type FillRandom = (buf: Uint8Array) => void;

const defaultFill: FillRandom = (buf) => {
  globalThis.crypto.getRandomValues(buf);
};

/** Uniform integer in [0, max) — rejection sampling, no modulo bias. */
export function randomInt(max: number, fill: FillRandom = defaultFill): number {
  if (max <= 1) return 0;
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const b = new Uint8Array(4);
  for (;;) {
    fill(b);
    const x = ((b[0] << 24) >>> 0) + (b[1] << 16) + (b[2] << 8) + b[3];
    if (x < limit) return x % max;
  }
}

const SYMBOLS = "!@#$%^&*-_=+?";

/** The enabled character sets; never empty (falls back to lowercase). */
export function charSets(o: PasswordOptions): string[] {
  const sets: string[] = [];
  if (o.upper) sets.push(o.noSimilar ? "ABCDEFGHJKLMNPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  if (o.lower) sets.push(o.noSimilar ? "abcdefghijkmnopqrstuvwxyz" : "abcdefghijklmnopqrstuvwxyz");
  if (o.digits) sets.push(o.noSimilar ? "23456789" : "0123456789");
  if (o.symbols) sets.push(SYMBOLS);
  if (!sets.length) sets.push(o.noSimilar ? "abcdefghijkmnopqrstuvwxyz" : "abcdefghijklmnopqrstuvwxyz");
  return sets;
}

/** How many character sets are switched on (the UI keeps at least one). */
export function enabledSetCount(o: PasswordOptions): number {
  return [o.upper, o.lower, o.digits, o.symbols].filter(Boolean).length;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export function generatePassword(o: PasswordOptions, fill: FillRandom = defaultFill): string {
  const sets = charSets(o);
  const pool = sets.join("");
  const len = clamp(o.length, LENGTH_RANGE.min, LENGTH_RANGE.max);
  // With ≥8 chars and ≤4 sets acceptance is high (worst case ~70%); the cap is a safety net.
  for (let attempt = 0; attempt < 1000; attempt++) {
    let out = "";
    for (let i = 0; i < len; i++) out += pool[randomInt(pool.length, fill)];
    if (sets.every((s) => [...out].some((ch) => s.includes(ch)))) return out;
  }
  // Unreachable in practice; still return something valid.
  const chars = sets.map((s) => s[randomInt(s.length, fill)]);
  while (chars.length < len) chars.push(pool[randomInt(pool.length, fill)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, fill);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function generatePassphrase(o: PasswordOptions, fill: FillRandom = defaultFill): string {
  const n = clamp(o.words, WORDS_RANGE.min, WORDS_RANGE.max);
  const words: string[] = [];
  for (let i = 0; i < n; i++) {
    const w = WORDS[randomInt(WORDS.length, fill)];
    words.push(o.capitalize ? w.charAt(0).toUpperCase() + w.slice(1) : w);
  }
  if (o.addNumber) {
    const k = randomInt(words.length, fill);
    words[k] += String(randomInt(10, fill));
  }
  return words.join("-");
}

export function generate(o: PasswordOptions, fill: FillRandom = defaultFill): string {
  return o.mode === "phrase" ? generatePassphrase(o, fill) : generatePassword(o, fill);
}

/**
 * Bits of entropy of the generator (not of the particular output).
 * Passwords: log2(#strings of length L over the pool containing every set).
 * Passphrases: words × log2(list size) + log2(10) for the digit; the digit's
 * position isn't counted, so this slightly under-reports.
 */
export function entropyBits(o: PasswordOptions): number {
  if (o.mode === "phrase") {
    const n = clamp(o.words, WORDS_RANGE.min, WORDS_RANGE.max);
    return n * Math.log2(WORDS.length) + (o.addNumber ? Math.log2(10) : 0);
  }
  const sets = charSets(o);
  const p = sets.reduce((a, s) => a + s.length, 0);
  const L = clamp(o.length, LENGTH_RANGE.min, LENGTH_RANGE.max);
  // N / p^L = Σ over subsets S of sets: (-1)^|S| ((p - |∪S|)/p)^L
  let ratio = 0;
  const k = sets.length;
  for (let mask = 0; mask < 1 << k; mask++) {
    let size = 0;
    let bitsOn = 0;
    for (let i = 0; i < k; i++) {
      if (mask & (1 << i)) {
        size += sets[i].length;
        bitsOn++;
      }
    }
    ratio += (bitsOn % 2 ? -1 : 1) * Math.pow((p - size) / p, L);
  }
  return L * Math.log2(p) + Math.log2(ratio);
}

export type StrengthLevel = 0 | 1 | 2 | 3;

export const STRENGTH_LABEL: Record<StrengthLevel, string> = {
  0: "Weak",
  1: "Fair",
  2: "Strong",
  3: "Very strong",
};

export function strengthLevel(bits: number): StrengthLevel {
  if (bits < 40) return 0;
  if (bits < 60) return 1;
  if (bits < 80) return 2;
  return 3;
}

/** Guesses per second assumed for an offline attack on a fast hash. */
export const GUESSES_PER_SECOND = 1e10;

/** Average time to guess (half the space) at GUESSES_PER_SECOND, in words. */
export function crackTime(bits: number): string {
  const secs = Math.pow(2, bits) / 2 / GUESSES_PER_SECOND;
  const YEAR = 31_557_600;
  if (secs < 1) return "guessable almost instantly";
  const about = (n: number, unit: string) => `about ${n.toLocaleString("en")} ${unit}${n === 1 ? "" : "s"} to guess`;
  if (secs < 3600) return about(Math.max(1, Math.round(secs / 60)), "minute");
  if (secs < 86400) return about(Math.round(secs / 3600), "hour");
  if (secs < 86400 * 365) return about(Math.round(secs / 86400), "day");
  // Universe ≈ 13.8 billion years.
  if (secs < 1.38e10 * YEAR) return about(Math.round(secs / YEAR), "year");
  return "longer than the age of the universe to guess";
}

export type CharClass = "letter" | "digit" | "symbol" | "separator";

/** `-` is a word separator in passphrases but a real symbol in passwords. */
export function charClass(ch: string, mode: PasswordMode): CharClass {
  if (/[0-9]/.test(ch)) return "digit";
  if (/[A-Za-z]/.test(ch)) return "letter";
  if (mode === "phrase" && (ch === "-" || /\s/.test(ch))) return "separator";
  return "symbol";
}
