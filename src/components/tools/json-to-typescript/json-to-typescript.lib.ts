/**
 * Post-processing for the shared TypeScript emitter (pure, no React).
 */

/** A property line inside an interface / object type: `  readonly key?: T;` */
const PROP = /^(\s+)(readonly\s+)?([A-Za-z_$][\w$]*|"(?:[^"\\]|\\.)*")(\??):\s/;

/** Mark every property optional (`key?:`). Already-optional keys are kept. */
export function makeAllOptional(ts: string): string {
  return ts
    .split("\n")
    .map((line) => {
      const m = line.match(PROP);
      if (!m || m[4] === "?") return line;
      const head = `${m[1]}${m[2] ?? ""}${m[3]}`;
      return `${head}?${line.slice(head.length)}`;
    })
    .join("\n");
}

/** Number of top-level declarations (`export interface` / `export type`). */
export function countDeclarations(ts: string): number {
  return (ts.match(/^export (?:interface|type) /gm) ?? []).length;
}
