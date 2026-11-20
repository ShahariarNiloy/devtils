/**
 * Pure helpers for the YAML → JSON tool (parsing lives in
 * json-converter/reverse-parsers: CORE_SCHEMA + merge keys, multi-document).
 */

/** Recursively sort object keys A → Z (arrays keep their order). */
export function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v !== null && typeof v === "object") {
    const src = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src).sort()) out[k] = sortKeysDeep(src[k]);
    return out;
  }
  return v;
}

export interface YamlToJsonOptions {
  indent: 2 | 4;
  sortKeys: boolean;
}

/** Parsed YAML value → pretty JSON text. */
export function toJsonText(value: unknown, { indent, sortKeys }: YamlToJsonOptions): string {
  return JSON.stringify(sortKeys ? sortKeysDeep(value) : value, null, indent) ?? "null";
}

/** Number of YAML documents (`---` separators at column 0 between content). */
export function countDocuments(yaml: string): number {
  const parts = yaml.split(/^---(?:[ \t].*)?$/m).filter((p) => p.replace(/#.*$/gm, "").trim());
  return Math.max(parts.length, yaml.trim() ? 1 : 0);
}

export const SAMPLE_YAML = [
  "# utilyx config",
  "name: utilyx",
  "version: 2.1",
  "private: true",
  "owner:",
  '  name: "Ada Lovelace"',
  "  email: ada@example.com",
  "tools:",
  "  - name: JSON formatter",
  "    live: true",
  "  - name: PDF merge",
  "    live: false",
  "tags: [json, yaml, offline]",
  "notes: ~",
  "",
].join("\n");
