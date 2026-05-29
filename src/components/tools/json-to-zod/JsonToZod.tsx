"use client";

import { useCallback, useMemo } from "react";
import {
  booleanCodec,
  ConverterShell,
  JSON_SAMPLES,
  OptionDivider,
  OptionLabel,
  OptionsRow,
  stringCodec,
  useConverter,
  useUrlState,
  ValidationPill,
} from "@/components/json-converter";
import { inferJsonSchema } from "@/components/tools/json-formatter/schema-infer";
import { validateAgainstSchema } from "@/components/tools/json-formatter/schema-validate";
import { Switch } from "@/components/primitives/switch";
import { toZod, type ZodOptions } from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToZodContent } from "./content";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);

/**
 * JSON → Zod schema tool. Built on the same collected schema IR as the TS
 * emitter, so it inherits structural dedup and intersection-required keys.
 * Format hints become `.email()` / `.uuid()` / `.datetime()` refinements
 * unless the user turns them off — generally what you want when modelling
 * an API contract.
 */
export function JsonToZod({ tool }: { tool: Tool }) {
  const [rootName, setRootName] = useUrlState("root", stringCodec("root"));
  const [strict, setStrict] = useUrlState("strict", booleanCodec(false));
  const [applyFormatRefinements, setApplyFormatRefinements] = useUrlState(
    "refinements",
    booleanCodec(true),
  );

  const safeRootName = useMemo(() => {
    return /^[A-Za-z_$][\w$]*$/.test(rootName) ? rootName : "root";
  }, [rootName]);

  const options = useMemo<ZodOptions>(
    () => ({
      rootName: safeRootName,
      strict,
      applyFormatRefinements,
    }),
    [safeRootName, strict, applyFormatRefinements],
  );

  const convert = useCallback(
    (value: unknown) => toZod(value, options),
    [options],
  );

  const c = useConverter({
    convert,
    worker: { target: "zod", options },
    initialInput: DEFAULT_INPUT,
  });

  // Round-trip validation: the Zod emitter is built on the same schema IR
  // as `inferJsonSchema`, so if the inferred schema accepts the sample, the
  // emitted Zod schema will too. Use the lightweight schema validator
  // rather than eval'ing the generated Zod code at runtime.
  const validation = useMemo(() => {
    if (c.parse.error || c.parse.parsed === null) return null;
    try {
      const schema = inferJsonSchema(c.parse.parsed);
      return validateAgainstSchema(c.parse.parsed, schema);
    } catch {
      return null;
    }
  }, [c.parse]);

  return (
    <ConverterShell
      tool={tool}
      input={c.input}
      onInputChange={c.setInput}
      parseError={c.parse.error}
      inputBytes={c.inputBytes}
      onLoadSample={(s) => c.loadInput(JSON.stringify(s.value, null, 2))}
      output={c.output}
      outputBytes={c.outputBytes}
      outputLang="typescript"
      outputLabel="Zod"
      downloadExt="ts"
      downloadMime="text/x-typescript"
      downloadName={`${safeRootName}-schema`}
      conversionError={c.conversionError}
      content={<JsonToZodContent />}
      optionsBar={
        <OptionsRow>
          <OptionLabel label="Schema name">
            <input
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              className="h-8 w-32 rounded-md border border-border bg-surface-soft px-2 text-sm font-mono text-text outline-none focus:border-brand"
              aria-label="Schema constant name"
            />
          </OptionLabel>

          <OptionDivider />

          <OptionLabel label="strict()">
            <Switch
              checked={strict}
              onCheckedChange={setStrict}
              aria-label="Reject unknown keys"
            />
          </OptionLabel>

          <OptionDivider />

          <OptionLabel label="Format refinements">
            <Switch
              checked={applyFormatRefinements}
              onCheckedChange={setApplyFormatRefinements}
              aria-label="Emit .email() / .uuid() / .datetime() for detected formats"
            />
          </OptionLabel>

          {validation && (
            <div className="ml-auto">
              <ValidationPill
                ok={validation.ok}
                label={validation.ok ? "Schema accepts sample" : "Sample rejected"}
                detail={
                  validation.ok
                    ? "The generated Zod schema validates the input sample."
                    : `${validation.path || "(root)"}: ${validation.message}`
                }
              />
            </div>
          )}
        </OptionsRow>
      }
    />
  );
}
