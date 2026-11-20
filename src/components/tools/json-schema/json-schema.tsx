"use client";

import { useCallback, useMemo } from "react";
import {
  booleanCodec,
  ConverterShell,
  enumCodec,
  JSON_SAMPLES,
  linesSummary,
  Segmented,
  stringCodec,
  ToggleChip,
  ToolbarField,
  useConverter,
  useUrlState,
  ValidationPill,
} from "@/components/json-converter";
import type { JsonSchema as JsonSchemaShape } from "@/components/tools/json-formatter/schema-infer";
import { validateAgainstSchema } from "@/components/tools/json-formatter/schema-validate";
import { toJsonSchema, type JsonSchemaOptions } from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonSchemaContent, seoData } from "./content";
import { findUnexpectedKey, postProcessSchema } from "./json-schema.lib";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);

const DRAFTS = [
  ["2020-12", "2020-12"],
  ["draft-07", "draft-07"],
] as const;

/**
 * JSON Schema generator. Infers a draft 2020-12 (or draft-07) schema with
 * format-aware strings; required keys are the intersection seen across
 * array items. A post-pass sets the title, strips `required` when asked and
 * adds `additionalProperties: false` for "No extra keys". The status bar
 * proves the final schema accepts the sample it came from.
 */
export function JsonSchema({ tool }: { tool: Tool }) {
  const [title, setTitle] = useUrlState("title", stringCodec("Root"));
  const [draft, setDraft] = useUrlState("draft", enumCodec(["2020-12", "draft-07"] as const, "2020-12"));
  const [required, setRequired] = useUrlState("required", booleanCodec(true));
  const [noExtraKeys, setNoExtraKeys] = useUrlState("strict", booleanCodec(false));

  const options = useMemo<JsonSchemaOptions>(() => ({ draft }), [draft]);
  const convert = useCallback((value: unknown) => toJsonSchema(value, options), [options]);
  const postProcess = useCallback(
    (out: string) => postProcessSchema(out, { title, required, noExtraKeys }),
    [title, required, noExtraKeys],
  );

  const c = useConverter({
    convert,
    worker: { target: "schema", options },
    initialInput: DEFAULT_INPUT,
    postProcess,
  });

  // Round-trip: the schema actually shown must accept the sample.
  const validation = useMemo(() => {
    if (c.parse.error || c.parse.parsed === null || !c.output) return null;
    try {
      const schema = JSON.parse(c.output) as JsonSchemaShape;
      const base = validateAgainstSchema(c.parse.parsed, schema);
      if (!base.ok) return base;
      const extra = findUnexpectedKey(c.parse.parsed, schema);
      return extra ? { ok: false as const, path: extra, message: "key not allowed by additionalProperties: false" } : base;
    } catch {
      return null;
    }
  }, [c.parse, c.output]);

  return (
    <ConverterShell
      tool={tool}
      relatedSlugs={seoData.relatedSlugs}
      input={c.input}
      onInputChange={c.setInput}
      parseError={c.parse.error}
      onLoadSample={(s) => c.loadInput(JSON.stringify(s.value, null, 2))}
      output={c.output}
      outputBytes={c.outputBytes}
      outputLang="json"
      outputLabel="JSON Schema"
      summary={linesSummary(c.output)}
      statusNote={draft}
      statusExtra={
        validation ? (
          <ValidationPill
            ok={validation.ok}
            label={validation.ok ? "Validates sample" : "Rejects sample"}
            detail={
              validation.ok
                ? "The schema shown accepts the sample input verbatim."
                : `${validation.path || "(root)"}: ${validation.message}`
            }
          />
        ) : null
      }
      downloadExt="json"
      downloadMime="application/schema+json"
      downloadName="schema"
      conversionError={c.conversionError}
      isComputing={c.isComputing}
      content={<JsonSchemaContent />}
      toolbar={
        <>
          <ToolbarField label="Title" value={title} onChange={setTitle} ariaLabel="Schema title (empty to omit)" />
          <Segmented label="Draft" value={draft} options={DRAFTS} onChange={setDraft} />
          <ToggleChip label="Required" checked={required} onChange={setRequired} hint="Keep inferred required keys" />
          <ToggleChip label="No extra keys" checked={noExtraKeys} onChange={setNoExtraKeys} hint="additionalProperties: false on every object" />
        </>
      }
    />
  );
}
