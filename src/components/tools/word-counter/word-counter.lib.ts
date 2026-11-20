/**
 * Word / character counter — pure logic. Uses Intl.Segmenter when the
 * runtime has it (correct for emoji, accents and CJK) and falls back to
 * Unicode-aware regexes otherwise.
 */

export const READ_WPM = 230;
export const SPEAK_WPM = 130;

/** Short, common English words left out of the keyword list. */
export const STOP_WORDS: ReadonlySet<string> = new Set(
  "a an and are as at be but by for from has have i in is it its of on or that the this to was were will with you your we our not can".split(" "),
);

export interface LimitCheck {
  label: string;
  count: number;
  max: number;
  /** 0-100, capped. */
  pct: number;
  tone: "ok" | "near" | "over";
}

export interface Keyword {
  word: string;
  count: number;
  /** Share of all words, as a percentage. */
  density: number;
  /** Bar width relative to the top keyword, 0-100. */
  pct: number;
}

export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  readSeconds: number;
  speakSeconds: number;
  limits: LimitCheck[];
  keywords: Keyword[];
}

/** Intl.Segmenter is missing on some older runtimes — check before use. */
const hasSegmenter = () => typeof Intl !== "undefined" && typeof Intl.Segmenter === "function";

const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

/** Word tokens in reading order. */
export function wordList(text: string): string[] {
  if (!hasSegmenter()) return text.match(WORD_RE) ?? [];
  const out: string[] = [];
  for (const s of new Intl.Segmenter(undefined, { granularity: "word" }).segment(text)) {
    if (s.isWordLike) out.push(s.segment);
  }
  return out;
}

/** User-perceived characters: 👍🏽 and é count once. */
export function countGraphemes(text: string): number {
  if (!hasSegmenter()) return Array.from(text).length;
  // Fast path: pure ASCII has one grapheme per code unit (CRLF aside).
  if (/^[\x00-\x7f]*$/.test(text)) return text.length - (text.match(/\r\n/g)?.length ?? 0);
  let n = 0;
  const it = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)[Symbol.iterator]();
  while (!it.next().done) n++;
  return n;
}

export function countSentences(text: string): number {
  if (!text.trim()) return 0;
  if (hasSegmenter()) {
    let n = 0;
    for (const s of new Intl.Segmenter(undefined, { granularity: "sentence" }).segment(text)) {
      if (/[\p{L}\p{N}]/u.test(s.segment)) n++;
    }
    return n;
  }
  return (text.match(/[^.!?]+[.!?]+/g) ?? []).length || 1;
}

export function countParagraphs(text: string): number {
  return text.split(/\n\s*\n/).filter((p) => p.trim()).length;
}

function toneFor(count: number, max: number): LimitCheck["tone"] {
  if (count > max) return "over";
  return count > max * 0.9 ? "near" : "ok";
}

function limit(label: string, count: number, max: number): LimitCheck {
  return {
    label,
    count,
    max,
    pct: Math.min(100, Math.round((count / max) * 100)),
    tone: toneFor(count, max),
  };
}

export function topKeywords(words: readonly string[], take = 6): Keyword[] {
  const freq = new Map<string, number>();
  for (const w of words) {
    const k = w.toLocaleLowerCase();
    if (Array.from(k).length > 2 && !STOP_WORDS.has(k) && !/^\p{N}+$/u.test(k)) freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, take);
  const max = top[0]?.[1] ?? 1;
  const total = Math.max(1, words.length);
  return top.map(([word, count]) => ({
    word,
    count,
    density: (count / total) * 100,
    pct: Math.round((count / max) * 100),
  }));
}

export function analyzeText(text: string): TextStats {
  const words = wordList(text);
  const characters = countGraphemes(text);
  const firstLine = text.split("\n")[0] ?? "";
  return {
    words: words.length,
    characters,
    charactersNoSpaces: countGraphemes(text.replace(/\s/g, "")),
    sentences: countSentences(text),
    paragraphs: countParagraphs(text),
    lines: text ? text.split("\n").length : 0,
    readSeconds: (words.length / READ_WPM) * 60,
    speakSeconds: (words.length / SPEAK_WPM) * 60,
    limits: [
      limit("SEO title", countGraphemes(firstLine), 60),
      limit("Meta description", characters, 160),
      limit("Post on X", characters, 280),
      limit("LinkedIn post", characters, 3000),
    ],
    keywords: topKeywords(words),
  };
}

/** "45 sec", "3 min", "1 h 12 min". Zero words → "0 sec". */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0 sec";
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

export const SAMPLE_TEXT =
  "Fast, private developer tools that run in your browser.\n\nutilyx formats JSON, tests regex, decodes JWTs and converts colours without sending a single byte to a server. Every tool runs locally, and the everyday ones are free. Developers use utilyx tools daily because the tools are fast and private.";
