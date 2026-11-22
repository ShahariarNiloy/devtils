"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { checkAgainstSchema, type SchemaCheckResult } from "../schema-check";

interface Checked {
  schema: string;
  value: unknown;
  result: SchemaCheckResult;
}

/**
 * Validate `value` against `schemaText`. Lives above the toolbar so the
 * Schema button can show the outcome (✓ / N issues) while the sheet is
 * closed. Ajv is only imported once there's a schema, so the formatter never
 * pays for it otherwise. Results are tagged with their inputs and only
 * returned while those still match — a stale answer never shows for newer
 * text.
 */
export function useSchemaCheck(value: unknown, isValid: boolean, schemaText: string): SchemaCheckResult | null {
  const schema = useDeferredValue(schemaText);
  const [checked, setChecked] = useState<Checked | null>(null);

  useEffect(() => {
    if (!schema.trim() || !isValid) return;
    let cancelled = false;
    void checkAgainstSchema(value, schema).then((result) => {
      if (!cancelled) setChecked({ schema, value, result });
    });
    return () => {
      cancelled = true;
    };
  }, [schema, value, isValid]);

  return checked && checked.schema === schema && checked.value === value ? checked.result : null;
}
