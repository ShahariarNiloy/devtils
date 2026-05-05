/**
 * Pure case-conversion helpers. The strategy is to first split arbitrary
 * input into "words" — tokenizing on word breaks, camelHumps, and existing
 * separators — then re-emit those words in the requested casing.
 */

export type CaseId =
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "camel"
  | "pascal"
  | "snake"
  | "kebab"
  | "screamingSnake"
  | "dot";

export interface CaseDef {
  id: CaseId;
  label: string;
  example: string;
  convert: (input: string) => string;
}

/** Split arbitrary text into a list of lower-cased word tokens. */
export function tokenize(input: string): string[] {
  return (
    input
      .replace(/[_\-.\s/]+/g, " ")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.toLowerCase()) || []
  );
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const join = (sep: string) => (input: string) => tokenize(input).join(sep);
const camelLike = (firstLower: boolean) => (input: string) =>
  tokenize(input)
    .map((w, i) => (i === 0 && firstLower ? w : cap(w)))
    .join("");

export const cases: CaseDef[] = [
  {
    id: "upper",
    label: "UPPER",
    example: "HELLO WORLD",
    convert: (s) => s.toUpperCase(),
  },
  {
    id: "lower",
    label: "lower",
    example: "hello world",
    convert: (s) => s.toLowerCase(),
  },
  {
    id: "title",
    label: "Title Case",
    example: "Hello World",
    convert: (s) => tokenize(s).map(cap).join(" "),
  },
  {
    id: "sentence",
    label: "Sentence case",
    example: "Hello world",
    convert: (s) => {
      const words = tokenize(s);
      if (!words.length) return "";
      return cap(words.join(" "));
    },
  },
  {
    id: "camel",
    label: "camelCase",
    example: "helloWorld",
    convert: camelLike(true),
  },
  {
    id: "pascal",
    label: "PascalCase",
    example: "HelloWorld",
    convert: camelLike(false),
  },
  {
    id: "snake",
    label: "snake_case",
    example: "hello_world",
    convert: join("_"),
  },
  {
    id: "kebab",
    label: "kebab-case",
    example: "hello-world",
    convert: join("-"),
  },
  {
    id: "screamingSnake",
    label: "SCREAMING_SNAKE_CASE",
    example: "HELLO_WORLD",
    convert: (s) => tokenize(s).join("_").toUpperCase(),
  },
  {
    id: "dot",
    label: "dot.case",
    example: "hello.world",
    convert: join("."),
  },
];
