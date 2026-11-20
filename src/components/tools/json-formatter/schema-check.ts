/**
 * Validate a JSON value against a user-supplied JSON Schema with Ajv.
 *
 * Unlike `schema-validate.ts` (a tiny checker for the subset our own
 * inference emits), this is full-spec: $ref, anyOf/allOf/not, enum, pattern,
 * formats, if/then/else, etc. Ajv is loaded lazily so it costs nothing until
 * the schema panel is opened.
 *
 * No React, no DOM.
 */

import type { ErrorObject } from "ajv";

export interface SchemaIssue {
  /** `$`-style path into the document, e.g. `$.users[0].email`. */
  path: string;
  message: string;
}

export type SchemaCheckResult =
  | { status: "valid"; draft: string }
  | { status: "invalid"; draft: string; issues: SchemaIssue[]; total: number }
  | { status: "schema-error"; message: string };

/** Cap the rendered list; the total is still reported honestly. */
const MAX_ISSUES = 200;

type Draft = "draft-07" | "2019-09" | "2020-12";

function detectDraft(schema: unknown): Draft | { unsupported: string } {
  const id =
    schema !== null && typeof schema === "object" && "$schema" in schema
      ? String(schema.$schema)
      : "";
  if (id.includes("2020-12")) return "2020-12";
  if (id.includes("2019-09")) return "2019-09";
  if (id.includes("draft-04") || id.includes("draft-03")) {
    return { unsupported: id.includes("draft-04") ? "draft-04" : "draft-03" };
  }
  // draft-06 / draft-07 / no $schema → draft-07 (a superset of draft-06).
  return "draft-07";
}

/** JSON Pointer (`/users/0/e~1mail`) → `$.users[0]["e/mail"]`. */
export function pointerToPath(pointer: string): string {
  if (!pointer) return "$";
  return (
    "$" +
    pointer
      .slice(1)
      .split("/")
      .map((seg) => seg.replace(/~1/g, "/").replace(/~0/g, "~"))
      .map((seg) => {
        if (/^\d+$/.test(seg)) return `[${seg}]`;
        if (/^[A-Za-z_$][\w$]*$/.test(seg)) return `.${seg}`;
        return `[${JSON.stringify(seg)}]`;
      })
      .join("")
  );
}

function describe(err: ErrorObject): string {
  const p = err.params as Record<string, unknown>;
  switch (err.keyword) {
    case "additionalProperties":
      return `unexpected property "${String(p.additionalProperty)}"`;
    case "required":
      return `missing required property "${String(p.missingProperty)}"`;
    case "enum": {
      const allowed = Array.isArray(p.allowedValues) ? p.allowedValues : [];
      const shown = allowed.slice(0, 6).map((v) => JSON.stringify(v)).join(", ");
      return `must be one of ${shown}${allowed.length > 6 ? ", …" : ""}`;
    }
    case "const":
      return `must equal ${JSON.stringify(p.allowedValue)}`;
    default:
      return err.message ?? `fails "${err.keyword}"`;
  }
}

async function loadAjv(draft: Draft) {
  if (draft === "2020-12") return (await import("ajv/dist/2020")).default;
  if (draft === "2019-09") return (await import("ajv/dist/2019")).default;
  return (await import("ajv")).default;
}

type Validate =((data: unknown) => boolean) & { errors?: ErrorObject[] | null };

// One-entry compile cache: the document changes far more often than the
// schema, so re-validating on every edit shouldn't re-compile.
let cached: { key: string; validate: Validate; draft: Draft } | null = null;

async function compile(schemaText: string, schema: unknown): Promise<{ validate: Validate; draft: Draft }> {
  if (cached?.key === schemaText) return cached;
  const draft = detectDraft(schema);
  if (typeof draft !== "string") {
    throw new Error(
      `${draft.unsupported} schemas aren't supported. Most work unchanged as draft-07 — ` +
        `change "$schema" to "http://json-schema.org/draft-07/schema#".`,
    );
  }
  const [{ default: addFormats }, AjvClass] = await Promise.all([import("ajv-formats"), loadAjv(draft)]);
  // A fresh instance per schema: re-adding a schema with the same $id to a
  // shared instance throws.
  const ajv = new AjvClass({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate: Validate = ajv.compile(schema as object);
  cached = { key: schemaText, validate, draft };
  return cached;
}

/**
 * Validate `value` against the schema in `schemaText`. Never throws: a bad
 * schema (unparseable, unresolvable $ref, unsupported draft) comes back as
 * `schema-error` so the UI can say exactly what's wrong.
 */
export async function checkAgainstSchema(value: unknown, schemaText: string): Promise<SchemaCheckResult> {
  let schema: unknown;
  try {
    schema = JSON.parse(schemaText);
  } catch (err) {
    return { status: "schema-error", message: `Schema isn't valid JSON: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (typeof schema !== "boolean" && (schema === null || typeof schema !== "object" || Array.isArray(schema))) {
    return { status: "schema-error", message: "A JSON Schema must be an object (or true / false)." };
  }

  let compiled: { validate: Validate; draft: Draft };
  try {
    compiled = await compile(schemaText, schema);
  } catch (err) {
    return { status: "schema-error", message: err instanceof Error ? err.message : String(err) };
  }

  const ok = compiled.validate(value);
  if (ok) return { status: "valid", draft: compiled.draft };
  const errors = compiled.validate.errors ?? [];
  const issues = errors.slice(0, MAX_ISSUES).map((e) => ({
    path: pointerToPath(e.instancePath),
    message: describe(e),
  }));
  return { status: "invalid", draft: compiled.draft, issues, total: errors.length };
}
