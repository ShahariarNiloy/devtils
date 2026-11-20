/**
 * Post-processing for the shared Zod emitter (pure, no React).
 */

/** A property line inside `z.object({ … })`: `  key: z.string(),` */
const PROP = /^( {2,})([A-Za-z_$][\w$]*|"(?:[^"\\]|\\.)*"): (.+),$/;

/** Append `.optional()` to every object property that isn't optional yet. */
export function makeAllOptional(zod: string): string {
  return zod
    .split("\n")
    .map((line) => {
      const m = line.match(PROP);
      if (!m || /\.optional\(\)$/.test(m[3])) return line;
      return `${m[1]}${m[2]}: ${m[3]}.optional(),`;
    })
    .join("\n");
}

/** Drop the `export type X = z.infer<typeof XSchema>;` lines. */
export function stripInferredTypes(zod: string): string {
  return zod
    .replace(/^export type \w+ = z\.infer<typeof \w+>;\n?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n+$/, "\n");
}

/** Number of `z.object` schemas. */
export function countSchemas(zod: string): number {
  return (zod.match(/^export const \w+ = z\.object\(/gm) ?? []).length;
}
