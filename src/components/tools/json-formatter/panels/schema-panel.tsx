"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { CircleCheck, CircleX, Wand2, X } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Textarea } from "@/components/primitives/textarea";
import { inferJsonSchema } from "../schema-infer";
import { checkAgainstSchema, type SchemaCheckResult } from "../schema-check";

interface SchemaPanelProps {
  /** The parsed input document. */
  value: unknown;
  /** Whether `value` came from valid JSON (`null` is a legal document). */
  isValid: boolean;
  schemaText: string;
  onSchemaTextChange: (text: string) => void;
  onClose: () => void;
}

interface CheckedResult {
  schema: string;
  value: unknown;
  result: SchemaCheckResult;
}

export function SchemaPanel({ value, isValid, schemaText, onSchemaTextChange, onClose }: SchemaPanelProps) {
  const deferredSchema = useDeferredValue(schemaText);
  const [checked, setChecked] = useState<CheckedResult | null>(null);

  // Ajv is lazy-loaded and async, so validation lives in an effect. Results
  // are tagged with their inputs and only shown while those still match —
  // a stale answer never flashes for newer text.
  useEffect(() => {
    if (!deferredSchema.trim() || !isValid) return;
    let cancelled = false;
    void checkAgainstSchema(value, deferredSchema).then((result) => {
      if (!cancelled) setChecked({ schema: deferredSchema, value, result });
    });
    return () => {
      cancelled = true;
    };
  }, [deferredSchema, value, isValid]);

  const current =
    checked && checked.schema === deferredSchema && checked.value === value ? checked.result : null;

  const inferFromInput = () => {
    if (!isValid) return;
    onSchemaTextChange(JSON.stringify(inferJsonSchema(value), null, 2));
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-card">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        <span className="flex-1 text-sm font-semibold text-text">Validate against JSON Schema</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={inferFromInput}
          disabled={!isValid}
          className="gap-1.5 shrink-0"
        >
          <Wand2 size={12} />
          Infer from input
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors shrink-0"
          aria-label="Close schema panel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid gap-px bg-border-subtle md:grid-cols-2">
        <div className="bg-surface p-3">
          <Textarea
            value={schemaText}
            onChange={(e) => onSchemaTextChange(e.target.value)}
            placeholder={'Paste a JSON Schema, e.g.\n{\n  "type": "object",\n  "required": ["id"]\n}'}
            aria-label="JSON Schema"
            className="h-48 rounded-lg px-3 py-2 text-[12.5px] leading-[1.65]"
          />
        </div>
        <div className="bg-surface p-3 max-h-[14.5rem] overflow-auto text-[13px]">
          <SchemaResult hasSchema={schemaText.trim().length > 0} isValid={isValid} result={current} />
        </div>
      </div>
    </div>
  );
}

function SchemaResult({
  hasSchema,
  isValid,
  result,
}: {
  hasSchema: boolean;
  isValid: boolean;
  result: SchemaCheckResult | null;
}) {
  if (!hasSchema) {
    return (
      <p className="text-text-faint">
        Paste a schema, or infer one from your input as a starting point. Results update as you type.
        Supports draft-07, 2019-09 and 2020-12, including <code className="font-mono">$ref</code>,{" "}
        <code className="font-mono">enum</code>, <code className="font-mono">pattern</code> and formats.
      </p>
    );
  }
  if (!isValid) {
    return <p className="text-text-faint">Fix the input JSON first — schema checks run on valid JSON.</p>;
  }
  if (!result) return <p className="text-text-faint animate-pulse">Checking…</p>;

  if (result.status === "schema-error") {
    return (
      <div className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-error-text">
        <div className="font-medium">The schema itself has a problem</div>
        <div className="mt-0.5 break-words">{result.message}</div>
      </div>
    );
  }

  if (result.status === "valid") {
    return (
      <div className="flex items-center gap-2 text-success-text">
        <CircleCheck size={15} className="shrink-0 text-success" aria-hidden />
        <span className="font-medium">Input matches the schema</span>
        <span className="text-text-faint">· {result.draft}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-error-text">
        <CircleX size={15} className="shrink-0 text-error" aria-hidden />
        <span className="font-medium">
          {result.total} problem{result.total !== 1 ? "s" : ""}
        </span>
        <span className="text-text-faint">· {result.draft}</span>
      </div>
      <ul className="space-y-1.5">
        {result.issues.map((issue, i) => (
          // Issues have no stable identity (the same path can fail twice).
          // eslint-disable-next-line react/no-array-index-key
          <li key={i} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <span className="shrink-0 font-mono text-[12.5px] text-text-faint break-all sm:max-w-[45%]">
              {issue.path}
            </span>
            <span className="text-text">{issue.message}</span>
          </li>
        ))}
      </ul>
      {result.total > result.issues.length && (
        <p className="mt-2 text-text-faint">
          Showing the first {result.issues.length} of {result.total}.
        </p>
      )}
    </div>
  );
}
