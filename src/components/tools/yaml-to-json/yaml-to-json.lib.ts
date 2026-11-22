/**
 * Pure helpers for the YAML → JSON tool (parsing lives in
 * json-converter/reverse-parsers: CORE_SCHEMA + merge keys, multi-document).
 */

import { CORE_SCHEMA, loadAll } from "js-yaml";

/** Recursively sort object keys A → Z (arrays keep their order). */
export function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v !== null && typeof v === "object") {
    const src = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src).sort()) {
      // defineProperty so a "__proto__" key is kept, not turned into the prototype.
      Object.defineProperty(out, k, { value: sortKeysDeep(src[k]), enumerable: true, writable: true, configurable: true });
    }
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

/**
 * Number of YAML documents — counted by the YAML parser itself so it always
 * matches the converted output (an empty document between `---` markers is
 * still a document: it becomes `null` in the JSON array).
 */
export function countDocuments(yaml: string): number {
  if (!yaml.trim()) return 0;
  try {
    let n = 0;
    loadAll(yaml, () => void n++, { schema: CORE_SCHEMA });
    return Math.max(n, 1);
  } catch {
    return 1;
  }
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
