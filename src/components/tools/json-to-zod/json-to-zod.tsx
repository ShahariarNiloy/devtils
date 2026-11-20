"use client";

import { useCallback, useMemo } from "react";
import {
  booleanCodec,
  ConverterShell,
  JSON_SAMPLES,
  MenuCheck,
  plural,
  stringCodec,
  ToggleChip,
  ToolbarField,
  useConverter,
  useUrlState,
  ValidationPill,
} from "@/components/json-converter";
import { inferJsonSchema } from "@/components/tools/json-formatter/schema-infer";
import { validateAgainstSchema } from "@/components/tools/json-formatter/schema-validate";
import { toZod, type ZodOptions } from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToZodContent, seoData } from "./content";
import { countSchemas, makeAllOptional, stripInferredTypes } from "./json-to-zod.lib";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);

/**
 * JSON → Zod schema. Built on the same schema IR as the TS emitter, so it
 * inherits structural dedup and intersection-required keys. Toolbar:
 * root name, export inferred types, optional, .strict(); format
 * refinements sit in the ⋯ menu.
 */
export function JsonToZod({ tool }: { tool: Tool }) {
  const [rootName, setRootName] = useUrlState("root", stringCodec("root"));
  const [exportTypes, setExportTypes] = useUrlState("types", booleanCodec(true));
  const [allOptional, setAllOptional] = useUrlState("optional", booleanCodec(false));
  const [strict, setStrict] = useUrlState("strict", booleanCodec(false));
  const [applyFormatRefinements, setApplyFormatRefinements] = useUrlState(
    "refinements",
    booleanCodec(true),
  );

  const safeRootName = useMemo(
    () => (/^[A-Za-z_$][\w$]*$/.test(rootName.trim()) ? rootName.trim() : "root"),
    [rootName],
  );

  const options = useMemo<ZodOptions>(
    () => ({ rootName: safeRootName, strict, applyFormatRefinements }),
    [safeRootName, strict, applyFormatRefinements],
  );

  const convert = useCallback((value: unknown) => toZod(value, options), [options]);

  const postProcess = useMemo(() => {
    if (exportTypes && !allOptional) return undefined;
    return (out: string) => {
      let s = out;
      if (allOptional) s = makeAllOptional(s);
      if (!exportTypes) s = stripInferredTypes(s);
      return s;
    };
  }, [exportTypes, allOptional]);

  const c = useConverter({
    convert,
    worker: { target: "zod", options },
    initialInput: DEFAULT_INPUT,
    postProcess,
  });

  // Round-trip check: the Zod emitter shares the schema IR with
  // `inferJsonSchema`, so if that schema accepts the sample, the emitted
  // Zod schema does too (without eval'ing generated code).
  const validation = useMemo(() => {
    if (c.parse.error || c.parse.parsed === null) return null;
    try {
      return validateAgainstSchema(c.parse.parsed, inferJsonSchema(c.parse.parsed));
    } catch {
      return null;
    }
  }, [c.parse]);

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
      outputLang="typescript"
      outputLabel="Zod schema"
      summary={c.output ? plural(countSchemas(c.output), "type") : ""}
      statusNote={safeRootName}
      statusExtra={
        validation && c.output ? (
          <ValidationPill
            ok={validation.ok}
            label={validation.ok ? "Accepts sample" : "Sample rejected"}
            detail={
              validation.ok
                ? "The generated schema validates the input sample."
                : `${validation.path || "(root)"}: ${validation.message}`
            }
          />
        ) : null
      }
      downloadExt="ts"
      downloadMime="text/x-typescript"
      downloadName={`${safeRootName}-schema`}
      conversionError={c.conversionError}
      isComputing={c.isComputing}
      content={<JsonToZodContent />}
      toolbar={
        <>
          <ToolbarField label="Root" value={rootName} onChange={setRootName} ariaLabel="Root schema name" />
          <ToggleChip label="Export types" checked={exportTypes} onChange={setExportTypes} hint="Add z.infer type exports" />
          <ToggleChip label="Optional" checked={allOptional} onChange={setAllOptional} hint="Append .optional() to every field" />
          <ToggleChip label=".strict()" checked={strict} onChange={setStrict} hint="Reject unknown keys" />
        </>
      }
      menu={
        <MenuCheck
          label="Format refinements"
          hint=".email(), .uuid(), .datetime() for detected formats"
          checked={applyFormatRefinements}
          onChange={setApplyFormatRefinements}
        />
      }
    />
  );
}
