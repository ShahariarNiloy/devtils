/**
 * Tiny JSON Schema validator covering the subset our `inferJsonSchema`
 * emits — types, required keys, array items, format hints, oneOf. No
 * external deps; no Ajv-grade error messages, but plenty of detail for a
 * "schema accepts your sample" ✓ pill in the converter UI.
 *
 * Used by the round-trip validation pill in json-schema, json-to-zod,
 * and (where relevant) the inference-side codegen tools. The premise is:
 * if the schema we inferred from the sample DOESN'T validate the same
 * sample, the inference is wrong — surface that instead of pretending
 * everything's fine.
 */

import type { JsonSchema } from "./schema-infer";

export type ValidationOk = { ok: true };
export type ValidationErr = {
  ok: false;
  path: string;
  message: string;
};
export type ValidationResult = ValidationOk | ValidationErr;

function fail(path: string, message: string): ValidationErr {
  return { ok: false, path, message };
}

function checkType(value: unknown, type: string): boolean {
  switch (type) {
    case "null": return value === null;
    case "boolean": return typeof value === "boolean";
    case "integer": return typeof value === "number" && Number.isInteger(value);
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "string": return typeof value === "string";
    case "array": return Array.isArray(value);
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    default: return false;
  }
}

function validate(value: unknown, schema: JsonSchema, path: string): ValidationResult {
  if (schema.oneOf && schema.oneOf.length > 0) {
    // Schema is a union — accept if any variant validates. Report the
    // shortest error from the failed branches so the user gets a hint.
    const errors: ValidationErr[] = [];
    for (const v of schema.oneOf) {
      const r = validate(value, v, path);
      if (r.ok) return r;
      errors.push(r);
    }
    return fail(
      path,
      `none of the ${schema.oneOf.length} schema variants matched — ${errors[0].message}`,
    );
  }

  if (!schema.type) return { ok: true };

  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (!types.some((t) => checkType(value, t))) {
    return fail(path, `expected ${types.join(" | ")}, got ${describe(value)}`);
  }

  if (schema.type === "object" || (Array.isArray(schema.type) && schema.type.includes("object"))) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      for (const required of schema.required ?? []) {
        if (!(required in obj)) {
          return fail(path, `missing required key "${required}"`);
        }
      }
      const props = schema.properties ?? {};
      for (const [k, sub] of Object.entries(props)) {
        if (k in obj) {
          const r = validate(obj[k], sub, path ? `${path}.${k}` : k);
          if (!r.ok) return r;
        }
      }
    }
  }

  if (schema.type === "array" || (Array.isArray(schema.type) && schema.type.includes("array"))) {
    if (Array.isArray(value) && schema.items) {
      for (let i = 0; i < value.length; i++) {
        const r = validate(value[i], schema.items, `${path}[${i}]`);
        if (!r.ok) return r;
      }
    }
  }

  return { ok: true };
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * Returns `{ ok: true }` if the sample validates against the schema; otherwise
 * the first failing path + message. The traversal is depth-first so the
 * reported path is the leftmost error.
 */
export function validateAgainstSchema(value: unknown, schema: JsonSchema): ValidationResult {
  return validate(value, schema, "");
}
