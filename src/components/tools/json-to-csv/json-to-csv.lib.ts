/**
 * Pure helpers for the JSON → CSV tool.
 */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * "Flatten nested" off: nested objects stay in one cell as JSON instead of
 * expanding into `a.b` columns. Applied to each row before the CSV emitter
 * (which flattens anything that is still an object).
 */
export function keepNestedAsJson(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((row) => {
    if (!isPlainObject(row)) return row;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) out[k] = isPlainObject(v) ? JSON.stringify(v) : v;
    return out;
  });
}

/**
 * Pull a table-shaped array out of a sample: the value itself when it's an
 * array, else its first array property, else the value wrapped in one.
 */
export function rowsFromSample(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (isPlainObject(v)) {
    const firstArr = Object.values(v).find(Array.isArray);
    if (firstArr) return firstArr;
  }
  return [v];
}
