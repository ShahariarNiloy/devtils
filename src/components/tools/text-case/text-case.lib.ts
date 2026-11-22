/**
 * Pure case-conversion helpers. The strategy is to first split arbitrary
 * input into "words" — tokenizing on punctuation, whitespace, existing
 * separators and camelCase humps — then re-emit those words in the
 * requested casing. Multi-line input is converted one line at a time.
 */

export type CaseId =
  | "camel"
  | "pascal"
  | "snake"
  | "screamingSnake"
  | "kebab"
  | "title"
  | "sentence"
  | "lower"
  | "upper"
  | "dot"
  | "train"
  | "cobol"
  | "path"
  | "toggle"
  | "alternating";

export interface CaseDef {
  id: CaseId;
  label: string;
  example: string;
  /** Shown by default; the rest sit behind "Show more formats". */
  primary: boolean;
  /** Converts a single line. */
  convert: (line: string) => string;
}

/**
 * Split one line into lower-cased word tokens. Splits on anything that
 * isn't a letter or digit, plus camelCase boundaries — so `APIResponse`
 * becomes `api` + `response` and `isVisibleOnMobile` four words. Digits
 * stay attached to the word they touch (`version2Beta` → `version2`, `beta`).
 */
export function tokenize(input: string): string[] {
  return input
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, "$1 $2")
    // Apostrophes inside a word don't split it: don't → dont, not don + t.
    .replace(/(\p{L})['\u2019](?=\p{L})/gu, "$1")
    // \p{M}: combining marks (Indic vowel signs, viramas, decomposed
    // accents) belong to the letter before them, never a word break.
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

// Code-point aware so a word starting with an astral letter still capitalises.
const cap = (s: string) => {
  const first = s.codePointAt(0);
  if (first === undefined) return s;
  const head = String.fromCodePoint(first);
  return head.toUpperCase() + s.slice(head.length);
};

const join = (sep: string) => (line: string) => tokenize(line).join(sep);
const camelLike = (firstLower: boolean) => (line: string) =>
  tokenize(line)
    .map((w, i) => (i === 0 && firstLower ? w : cap(w)))
    .join("");

export const cases: CaseDef[] = [
  { id: "camel", label: "camelCase", example: "userProfileSettings", primary: true, convert: camelLike(true) },
  { id: "pascal", label: "PascalCase", example: "UserProfileSettings", primary: true, convert: camelLike(false) },
  { id: "snake", label: "snake_case", example: "user_profile_settings", primary: true, convert: join("_") },
  {
    id: "screamingSnake",
    label: "CONSTANT_CASE",
    example: "USER_PROFILE_SETTINGS",
    primary: true,
    convert: (s) => tokenize(s).join("_").toUpperCase(),
  },
  { id: "kebab", label: "kebab-case", example: "user-profile-settings", primary: true, convert: join("-") },
  {
    id: "title",
    label: "Title Case",
    example: "User Profile Settings",
    primary: true,
    convert: (s) => tokenize(s).map(cap).join(" "),
  },
  {
    id: "sentence",
    label: "Sentence case",
    example: "User profile settings",
    primary: true,
    convert: (s) => cap(tokenize(s).join(" ")),
  },
  // lower / UPPER keep the line's punctuation — they only change letters.
  { id: "lower", label: "lower case", example: "user profile settings", primary: true, convert: (s) => s.toLowerCase() },
  { id: "upper", label: "UPPER CASE", example: "USER PROFILE SETTINGS", primary: true, convert: (s) => s.toUpperCase() },
  { id: "dot", label: "dot.case", example: "user.profile.settings", primary: true, convert: join(".") },
  {
    id: "train",
    label: "Train-Case",
    example: "User-Profile-Settings",
    primary: false,
    convert: (s) => tokenize(s).map(cap).join("-"),
  },
  {
    id: "cobol",
    label: "COBOL-CASE",
    example: "USER-PROFILE-SETTINGS",
    primary: false,
    convert: (s) => tokenize(s).join("-").toUpperCase(),
  },
  { id: "path", label: "path/case", example: "user/profile/settings", primary: false, convert: join("/") },
  {
    id: "toggle",
    label: "tOGGLE cASE",
    example: "uSER pROFILE sETTINGS",
    primary: false,
    convert: (s) => s.replace(/\p{L}/gu, (ch) => (ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase())),
  },
  {
    id: "alternating",
    label: "aLtErNaTiNg",
    example: "uSeR PrOfIlE SeTtInGs",
    primary: false,
    convert: (s) => {
      let i = 0;
      return s.replace(/\p{L}/gu, (ch) => (i++ % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase()));
    },
  },
];

export function splitLines(input: string): string[] {
  return input.split(/\r\n|\r|\n/);
}

/** Convert every line of `input` with `def`, keeping line breaks. */
export function convertLines(def: CaseDef, input: string): string {
  return splitLines(input).map(def.convert).join("\n");
}

export interface TextStats {
  /** Non-blank lines. */
  lines: number;
  /** Total lines, blank included. */
  totalLines: number;
  words: number;
}

export function textStats(input: string): TextStats {
  const all = splitLines(input);
  let words = 0;
  let lines = 0;
  for (const l of all) {
    if (l.trim()) lines++;
    words += tokenize(l).length;
  }
  return { lines, totalLines: input ? all.length : 0, words };
}

export const SAMPLE_INPUT = "user profile settings\nAPI response handler\nlast_login_at\nisVisibleOnMobile";
