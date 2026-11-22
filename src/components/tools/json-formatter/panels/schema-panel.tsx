"use client";

import { CircleCheck, CircleX, Wand2 } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { flushPendingEdits, LazyCodeEditor } from "@/components/primitives/code-editor";
import { inferJsonSchema } from "../schema-infer";
import type { SchemaCheckResult } from "../schema-check";

interface SchemaPanelProps {
  /** The parsed input document. */
  value: unknown;
  /** Whether `value` came from valid JSON (`null` is a legal document). */
  isValid: boolean;
  schemaText: string;
  onSchemaTextChange: (text: string) => void;
  /** Latest check (from useSchemaCheck), or null while checking / no schema. */
  result: SchemaCheckResult | null;
}

/**
 * Body of the Schema side sheet: schema editor on top, live result below.
 * The check itself runs in useSchemaCheck (owned by the formatter) so the
 * toolbar can show the outcome while the sheet is closed.
 */
export function SchemaPanel({ value, isValid, schemaText, onSchemaTextChange, result }: SchemaPanelProps) {
  const current = result;

  const inferFromInput = () => {
    if (!isValid) return;
    // Replacing the schema: deliver any still-debounced keystrokes first so
    // a late flush can't overwrite the inferred schema.
    flushPendingEdits();
    onSchemaTextChange(JSON.stringify(inferJsonSchema(value), null, 2));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-5 pt-3 pb-3">
        <span className="text-xs text-text-faint">Draft-07, 2019-09 and 2020-12 · checks as you type</span>
        <span className="grow" />
        <Button variant="secondary" size="sm" onClick={inferFromInput} disabled={!isValid} className="shrink-0 gap-1.5">
          <Wand2 size={12} />
          Infer from input
        </Button>
      </div>
      <div className="shrink-0 px-5 pb-4">
        <div className="h-[min(42vh,360px)] overflow-hidden rounded-lg border-1.5 border-border bg-surface transition-[border-color,box-shadow] focus-within:border-brand focus-within:shadow-focus hover:border-border-strong">
          <LazyCodeEditor
            language="json"
            value={schemaText}
            onChange={onSchemaTextChange}
            placeholder={'Paste a JSON Schema, e.g. { "type": "object", "required": ["id"] }'}
            ariaLabel="JSON Schema"
            lineNumbers={false}
            lineHeight={1.65}
            padding="8px 12px"
            className="h-full text-[12.5px]"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto border-t border-border-subtle px-5 py-4 text-[13px]">
        <SchemaResult hasSchema={schemaText.trim().length > 0} isValid={isValid} result={current} />
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
